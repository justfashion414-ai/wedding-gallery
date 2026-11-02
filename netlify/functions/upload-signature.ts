import crypto from 'crypto';

// Helper to sign Cloudinary upload parameters using Node built-in crypto (zero external deps required)
function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  const sortedQuery = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(sortedQuery + apiSecret)
    .digest('hex');
}

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const folder = event.queryStringParameters?.folder || 'ire-akari';

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

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Cloudinary environment variables are missing in Netlify.',
        details: 'Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Netlify Site Configuration -> Environment Variables.',
      }),
    };
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = signCloudinaryParams({ folder, timestamp }, apiSecret);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      signature,
      timestamp,
      cloudName,
      apiKey,
      folder,
    }),
  };
};
