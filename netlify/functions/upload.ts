import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

function getCloudinaryCredentials() {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_NAME ||
    process.env.CLOUDINARY_CLOUD ||
    process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey =
    process.env.CLOUDINARY_API_KEY ||
    process.env.VITE_CLOUDINARY_API_KEY;
  const apiSecret =
    process.env.CLOUDINARY_API_SECRET ||
    process.env.VITE_CLOUDINARY_API_SECRET;

  return { cloudName, apiKey, apiSecret };
}

// Parse multipart/form-data buffer to extract the 'file' buffer, mimetype, and 'folder' field
function parseMultipart(bodyBuffer: Buffer, contentType: string): {
  fileBuffer: Buffer | null;
  mimeType: string;
  folder: string;
} {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    return { fileBuffer: null, mimeType: 'application/octet-stream', folder: 'ire-akari' };
  }
  const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
  const boundaryBytes = Buffer.from(boundary);

  let fileBuffer: Buffer | null = null;
  let mimeType = 'application/octet-stream';
  let folder = 'ire-akari';

  let start = bodyBuffer.indexOf(boundaryBytes);
  while (start !== -1) {
    const nextStart = bodyBuffer.indexOf(boundaryBytes, start + boundaryBytes.length);
    if (nextStart === -1) break;

    const part = bodyBuffer.subarray(start + boundaryBytes.length, nextStart);
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd !== -1) {
      const headersText = part.subarray(0, headerEnd).toString('utf-8');
      // Trim trailing \r\n before the next boundary
      const content = part.subarray(headerEnd + 4, part.length - 2);

      if (/name="folder"/i.test(headersText)) {
        folder = content.toString('utf-8').trim() || 'ire-akari';
      } else if (/name="file"/i.test(headersText)) {
        fileBuffer = content;
        const typeMatch = headersText.match(/Content-Type:\s*([^\r\n]+)/i);
        if (typeMatch) {
          mimeType = typeMatch[1].trim();
        }
      }
    }

    start = nextStart;
  }

  return { fileBuffer, mimeType, folder };
}

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
  if (!cloudName || !apiKey || !apiSecret) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Cloudinary is not configured in Netlify environment variables.',
      }),
    };
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  try {
    const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'] || '';
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64')
      : Buffer.from(event.body || '', 'utf-8');

    // Support both JSON base64 payloads and multipart/form-data payloads
    if (contentType.includes('application/json')) {
      const parsed = JSON.parse(rawBody.toString('utf-8'));
      const dataUrl = parsed.file || parsed.dataUrl;
      const folder = parsed.folder || 'ire-akari';
      if (!dataUrl) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing file in JSON body' }),
        };
      }
      const result = await cloudinary.uploader.upload(dataUrl, {
        folder,
        resource_type: 'auto',
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ url: result.secure_url }),
      };
    }

    const { fileBuffer, mimeType, folder } = parseMultipart(rawBody, contentType);
    if (!fileBuffer) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file found in upload request' }),
      };
    }

    const isVideo = mimeType.startsWith('video/');
    const uploadResult: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isVideo ? 'video' : 'auto',
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
      stream.end(fileBuffer);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: uploadResult.secure_url }),
    };
  } catch (err: any) {
    console.error('Netlify upload function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Upload failed',
        details: err?.message || String(err),
      }),
    };
  }
};
