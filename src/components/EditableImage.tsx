import React, { useState, useEffect, useRef } from 'react';
import { Upload, RefreshCw, Palmtree } from 'lucide-react';

interface EditableImageProps {
  src?: string;
  alt?: string;
  className?: string;
  imageKey?: string;
  children?: React.ReactNode;
  loading?: 'lazy' | 'eager';
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
  [key: string]: any; // Catch-all for any other native image attributes passed down
}

// Global cache for custom images to prevent duplicate network requests
let globalImagesCache: Record<string, string> | null = null;
let globalFetchPromise: Promise<Record<string, string>> | null = null;

// Helper to fetch custom images from server once and cache them
function fetchCustomImages(): Promise<Record<string, string>> {
  if (globalImagesCache) {
    return Promise.resolve(globalImagesCache);
  }
  if (globalFetchPromise) {
    return globalFetchPromise;
  }
  globalFetchPromise = fetch('/api/images')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    })
    .then((data) => {
      globalImagesCache = data;
      return data;
    })
    .catch((err) => {
      console.warn('Could not load custom images from server, falling back to local storage:', err);
      return {};
    });
  return globalFetchPromise;
}

// Helper to save image to server
async function saveImageToServer(key: string, base64: string | null) {
  if (globalImagesCache) {
    if (base64) {
      globalImagesCache[key] = base64;
    } else {
      delete globalImagesCache[key];
    }
  }
  try {
    await fetch('/api/images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, base64 }),
    });
  } catch (err) {
    console.error('Failed to persist image to server:', err);
  }
}

export default function EditableImage({ src = '', alt, className, imageKey, children, ...props }: EditableImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src || '');

  // Use the custom key or fallback to default src
  const key = imageKey || src || 'logo-default';

  // Retrieve customized image from local storage first (instant load),
  // then check server-side persisted storage for permanent sync.
  useEffect(() => {
    if (!key) return;

    // 1. Check local storage for instant render
    const localStored = localStorage.getItem(`editable-image-${key}`);
    if (localStored) {
      setCurrentSrc(localStored);
    } else {
      setCurrentSrc(src || '');
    }

    // 2. Fetch server-side persisted images to keep in sync
    fetchCustomImages().then((serverImages) => {
      const serverStored = serverImages[key];
      if (serverStored) {
        if (serverStored !== localStored) {
          localStorage.setItem(`editable-image-${key}`, serverStored);
          setCurrentSrc(serverStored);
        }
      }
    });
  }, [src, key]);

  const isCustomized = currentSrc ? (src ? currentSrc !== src : true) : false;

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden flex items-center justify-center"
    >
      {children && !isCustomized ? (
        <div className={className}>
          {children}
        </div>
      ) : (
        <img
          src={currentSrc || src}
          alt={alt}
          className={`${className || ''} transition-all duration-300`}
          {...props}
        />
      )}
    </div>
  );
}
