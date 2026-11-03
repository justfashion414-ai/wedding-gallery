import customImagesData from '../../src/custom-images.json';
import { verifyFirebaseIdToken, isVerifiedUser, getProjectId, unauthorized, notVerified } from './_verify';

let memoryImages: Record<string, string> = { ...(customImagesData as Record<string, string>) };

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

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(memoryImages),
    };
  }

  if (event.httpMethod === 'POST') {
    // Auth gate: writes require a signed-in, verified guest (or admin).
    const caller = await verifyFirebaseIdToken(
      event.headers?.authorization || event.headers?.Authorization,
      getProjectId()
    );
    if (!caller) return unauthorized(headers);
    if (!(await isVerifiedUser(caller.uid, getProjectId()))) return notVerified(headers);

    try {
      const body = JSON.parse(event.body || '{}');
      const { key, base64 } = body;
      if (!key) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Key is required' }),
        };
      }
      if (base64) {
        memoryImages[key] = base64;
      } else {
        delete memoryImages[key];
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    } catch (err: any) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body', message: err?.message }),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method Not Allowed' }),
  };
};
