import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import "dotenv/config";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const IMAGES_FILE = path.join(process.cwd(), "src", "custom-images.json");

// Helper to load custom images safely
function loadCustomImages() {
  try {
    if (fs.existsSync(IMAGES_FILE)) {
      const data = fs.readFileSync(IMAGES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading custom images:", error);
  }
  return {};
}

// Helper to save custom images safely
function saveCustomImages(images: Record<string, string>) {
  try {
    const dir = path.dirname(IMAGES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(IMAGES_FILE, JSON.stringify(images, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving custom images:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure Cloudinary inside startServer to ensure environment variables are ready
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("WARNING: Cloudinary configuration is incomplete. Uploads will fail.", {
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
    });
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  // API Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Runtime Config Endpoint (matches /.netlify/functions/config)
  app.get("/api/config", (req, res) => {
    res.json({
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "",
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "",
      },
      cloudinaryConfigured: Boolean(
        (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD || process.env.VITE_CLOUDINARY_CLOUD_NAME) &&
        (process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY) &&
        (process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET)
      ),
    });
  });

  // Download complete .env file with live environment variables for Netlify import
  app.get("/api/download-env", (req, res) => {
    const currentCloudName =
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.CLOUDINARY_NAME ||
      process.env.CLOUDINARY_CLOUD ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME ||
      "";
    const currentApiKey =
      process.env.CLOUDINARY_API_KEY ||
      process.env.VITE_CLOUDINARY_API_KEY ||
      "";
    const currentApiSecret =
      process.env.CLOUDINARY_API_SECRET ||
      process.env.VITE_CLOUDINARY_API_SECRET ||
      "";

    const envLines = [
      "# ==========================================",
      "# IRE-AKARI ESTATE PORTAL — NETLIFY .ENV FILE",
      "# ==========================================",
      "",
      "# 1. Firebase Configuration",
      `VITE_FIREBASE_API_KEY=${process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || ""}`,
      `VITE_FIREBASE_AUTH_DOMAIN=${process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || ""}`,
      `VITE_FIREBASE_PROJECT_ID=${process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || ""}`,
      `VITE_FIREBASE_STORAGE_BUCKET=${process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || ""}`,
      `VITE_FIREBASE_MESSAGING_SENDER_ID=${process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ""}`,
      `VITE_FIREBASE_APP_ID=${process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || ""}`,
      "",
      "# 2. Cloudinary API Keys (Used by Netlify Functions)",
      `CLOUDINARY_CLOUD_NAME=${currentCloudName}`,
      `CLOUDINARY_API_KEY=${currentApiKey}`,
      `CLOUDINARY_API_SECRET=${currentApiSecret}`,
      "",
    ];

    const envContent = envLines.join("\r\n");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="netlify.env"');
    res.send(envContent);
  });

  // Request logging for API routes
  app.use("/api", (req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Fetch all persistent custom images
  app.get("/api/images", (req, res) => {
    res.json(loadCustomImages());
  });

  // Generate a signed Cloudinary upload signature so the client can upload directly to Cloudinary
  // bypassing any reverse-proxy body limits (32MB) or cross-site iframe cookie redirects.
  app.get("/api/upload-signature", (req, res) => {
    const folder = (req.query.folder as string) || 'ire-akari';
    const currentCloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD;
    const currentApiKey = process.env.CLOUDINARY_API_KEY;
    const currentApiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!currentCloudName || !currentApiKey || !currentApiSecret) {
      return res.status(500).json({ error: "Cloudinary is not configured on the server." });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign: Record<string, any> = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, currentApiSecret);

    res.json({
      signature,
      timestamp,
      cloudName: currentCloudName,
      apiKey: currentApiKey,
      folder,
    });
  });

  // Cloudinary Upload Endpoint (BEFORE global json middleware to be safe)
  app.post("/api/upload", upload.single('file'), (req: any, res) => {
    console.log("Upload route handler hit", { 
      file: req.file ? { name: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : "missing",
      body: req.body 
    });
    
    if (!req.file) {
      console.error("No file in request. Check if the field name is 'file'.");
      return res.status(400).json({ error: "No file uploaded", message: "Field name must be 'file'" });
    }

    const folder = req.body.folder || 'ire-akari';
    
    if (!cloudinary.config().cloud_name) {
      console.error("Cloudinary config is missing cloud_name at runtime");
      return res.status(500).json({ error: "Cloudinary is not configured on the server." });
    }

    try {
      const isVideo = req.file.mimetype?.startsWith('video/');
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder,
          resource_type: isVideo ? 'video' : 'auto'
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload callback error:', error);
            return res.status(500).json({ error: 'Upload failed', details: error.message });
          }
          console.log("Upload successful:", result?.secure_url);
          res.json({ url: result?.secure_url });
        }
      );
      
      console.log(`Piping buffer to Cloudinary (size: ${req.file.buffer.length} bytes)`);
      uploadStream.end(req.file.buffer);
    } catch (err: any) {
      console.error("Cloudinary upload_stream sync error:", err);
      res.status(500).json({ error: "Failed to initiate upload", message: err.message });
    }
  });

  // Now set payload limits for JSON/Urlencoded
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Save/Upload a persistent custom image (requires JSON)
  app.post("/api/images", (req, res) => {
    const { key, base64 } = req.body;
    if (!key) {
      return res.status(400).json({ error: "Key is required" });
    }

    const images = loadCustomImages();
    if (base64) {
      images[key] = base64;
    } else {
      delete images[key];
    }
    saveCustomImages(images);
    res.json({ success: true });
  });

  // Global JSON Error Handler for /api routes
  app.use("/api", (err: any, req: any, res: any, next: any) => {
    console.error("API Error caught in /api handler:", err);
    res.status(err.status || 500).json({
      error: "Internal Server Error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  });

  // API 404 Handler
  app.use("/api", (req, res) => {
    res.status(404).json({ error: "Not Found", message: `API route ${req.method} ${req.url} not found` });
  });



  // Vite development middleware vs production static builds
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Final Error Handler (MUST BE LAST)
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled Server Error:", err);
    
    // If it's an API request, always return JSON
    if (req.path.startsWith("/api")) {
      return res.status(err.status || 500).json({
        error: "Internal Server Error",
        message: err.message,
        path: req.path
      });
    }
    
    // Fallback for non-API routes (standard express 500)
    res.status(500).send("Internal Server Error");
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FATAL: Server failed to start:", err);
});
