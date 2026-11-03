import crypto from 'crypto';

/**
 * Shared auth helpers for Netlify functions.
 *
 * Rules for every function here:
 *  - Never reachable without a valid Firebase ID token.
 *  - The service account is used ONLY after the caller's ID token has been
 *    verified, and only for reads the caller is entitled to.
 */

const CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';

interface CertCache {
  certs: Record<string, string>;
  fetchedAt: number;
}
let certCache: CertCache | null = null;

async function getPublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (certCache && now - certCache.fetchedAt < 60 * 60 * 1000) {
    return certCache.certs;
  }
  const res = await fetch(CERT_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not fetch Google public certs (${res.status})`);
  const certs = (await res.json()) as Record<string, string>;
  certCache = { certs, fetchedAt: now };
  return certs;
}

function b64urlToJson(part: string): any {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf-8'));
}

export interface VerifiedCaller {
  uid: string;
}

/**
 * Verify a Firebase ID token ( RS256, issued by securetoken.google.com )
 * against Google's public certificates. Returns { uid } or null.
 */
export async function verifyFirebaseIdToken(
  authHeader: string | undefined | null,
  projectId: string
): Promise<VerifiedCaller | null> {
  if (!authHeader || !projectId) return null;
  const match = /^Bearer\s+(.+)$/i.exec(String(authHeader).trim());
  if (!match) return null;
  const token = match[1];
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  let header: any, payload: any;
  try {
    header = b64urlToJson(parts[0]);
    payload = b64urlToJson(parts[1]);
  } catch {
    return null;
  }

  if (header.alg !== 'RS256' || !header.kid) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (payload.aud !== projectId) return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < now - 30) return null;
  if (typeof payload.auth_time === 'number' && payload.auth_time > now + 30) return null;
  if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) return null;

  let certs: Record<string, string>;
  try {
    certs = await getPublicCerts();
  } catch {
    return null;
  }
  const cert = certs[header.kid];
  if (!cert) return null;

  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    const ok = verifier.verify(cert, Buffer.from(parts[2], 'base64url'));
    if (!ok) return null;
  } catch {
    return null;
  }

  return { uid: payload.sub };
}

interface SaCache {
  token: string;
  expiresAt: number;
}
let saCache: SaCache | null = null;

/** Exchange the service account for a short-lived Google access token. */
export async function getSaAccessToken(): Promise<string | null> {
  if (saCache && Date.now() < saCache.expiresAt) return saCache.token;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  let sa: any;
  try {
    sa = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!sa.client_email || !sa.private_key) return null;

  const now = Math.floor(Date.now() / 1000);
  const assertionHeader = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' })
  ).toString('base64url');
  const assertionPayload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: FIRESTORE_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url');
  const assertion = `${assertionHeader}.${assertionPayload}`;
  let signature: string;
  try {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(assertion);
    signature = signer.sign(sa.private_key.replace(/\\n/g, '\n'), 'base64url');
  } catch {
    return null;
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${assertion}.${signature}`,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    saCache = {
      token: data.access_token,
      expiresAt: Date.now() + Math.max(60, (data.expires_in || 3600) - 120) * 1000,
    };
    return saCache.token;
  } catch {
    return null;
  }
}

/**
 * Read users/{uid}.verified from Firestore using the service account.
 * Call ONLY after verifyFirebaseIdToken has succeeded for the same uid.
 */
export async function isVerifiedUser(uid: string, projectId: string): Promise<boolean> {
  if (!uid || !projectId) return false;
  const accessToken = await getSaAccessToken();
  if (!accessToken) return false;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const doc = (await res.json()) as any;
    return doc?.fields?.verified?.booleanValue === true;
  } catch {
    return false;
  }
}

/** Extract the project id from the environment. */
export function getProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';
}

/** Standard error responses so every function refuses identically. */
export function unauthorized(headers: any) {
  return {
    statusCode: 401,
    headers,
    body: JSON.stringify({
      error: 'Sign in required. This endpoint only accepts a valid Firebase ID token.',
    }),
  };
}

export function notVerified(headers: any) {
  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({
      error: 'Complete your guest profile (display name and photo) before uploading media.',
    }),
  };
}
