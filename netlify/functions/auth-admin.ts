import crypto from 'crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PROJECT_ID = 'wedding-gallery-9187b';
const SUPERADMIN_EMAIL = 'justfashion414@gmail.com';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;
let certs: Record<string, string> | null = null;
let certsFetchedAt = 0;

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error('service account JSON is missing required fields');
  }
  return parsed as ServiceAccount;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/identitytoolkit',
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(sa.private_key.replace(/\\n/g, '\n')).toString('base64url');
  const assertion = `${header}.${payload}.${signature}`;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certs && Date.now() - certsFetchedAt < 3600 * 1000) return certs;
  const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  if (!res.ok) throw new Error('could not fetch Google public certs');
  certs = await res.json();
  certsFetchedAt = Date.now();
  return certs;
}

async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string }> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
  if (header.alg !== 'RS256') throw new Error('unsupported token algorithm');
  const certsMap = await getGoogleCerts();
  const certPem = certsMap[header.kid];
  if (!certPem) throw new Error('unknown token key');
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  const x509 = new crypto.X509Certificate(certPem);
  const ok = verifier.verify(x509.publicKey, Buffer.from(parts[2], 'base64'));
  if (!ok) throw new Error('invalid token signature');
  const claims = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  if (claims.aud !== PROJECT_ID) throw new Error('token audience mismatch');
  if (claims.iss !== `https://securetoken.google.com/${PROJECT_ID}`) throw new Error('token issuer mismatch');
  if ((claims.exp || 0) * 1000 < Date.now()) throw new Error('token expired');
  return { uid: claims.user_id || claims.sub, email: claims.email };
}

async function identityRequest(path: string, body: any): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function setAdminDoc(email: string, role: string): Promise<boolean> {
  const token = await getAccessToken();
  const encoded = encodeURIComponent(email);
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admins/${encoded}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      fields: {
        email: { stringValue: email },
        role: { stringValue: role },
        mustSetPassword: { booleanValue: true },
        addedAt: { timestampValue: new Date().toISOString() }
      }
    })
  });
  return res.ok;
}

async function adminDocExists(email: string): Promise<boolean> {
  const token = await getAccessToken();
  const encoded = encodeURIComponent(email);
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admins/${encoded}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.ok;
}

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  },
  body: JSON.stringify(body)
});

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { error: 'A valid email is required' });
  if (!password || password.length < 6) return json(400, { error: 'Password must be at least 6 characters' });

  try {
    if (body.action === 'bootstrap') {
      // One-time setup: creates the first admin account. Only works for the
      // known super-admin email and only while no account exists for it.
      if (email !== SUPERADMIN_EMAIL) return json(403, { error: 'Bootstrap is limited to the couple account' });
      const lookup = await identityRequest('/accounts:lookup', { email: [email] });
      if (lookup.ok && lookup.data.users && lookup.data.users.length > 0) {
        return json(409, { error: 'That account already exists. Sign in instead.' });
      }
      const created = await identityRequest('', { email, password, emailVerified: true });
      if (!created.ok) {
        return json(created.status === 409 ? 409 : 500, { error: created.data?.error?.message || 'Could not create the account' });
      }
      await setAdminDoc(email, 'admin');
      return json(200, { ok: true, localId: created.data.localId });
    }

    if (body.action === 'invite') {
      const authHeader = event.headers.authorization || event.headers.Authorization || '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!idToken) return json(401, { error: 'Sign in first' });
      let caller;
      try {
        caller = await verifyIdToken(idToken);
      } catch (err: any) {
        return json(401, { error: 'Your sign-in could not be verified. Sign in again.' });
      }
      const callerEmail = String(caller.email || '').toLowerCase();
      const isSuper = callerEmail === SUPERADMIN_EMAIL;
      if (!isSuper && !(await adminDocExists(callerEmail))) {
        return json(403, { error: 'Only the couple can create dashboard accounts' });
      }
      const lookup = await identityRequest('/accounts:lookup', { email: [email] });
      if (lookup.ok && lookup.data.users && lookup.data.users.length > 0) {
        return json(409, { error: 'That email already has an account' });
      }
      const created = await identityRequest('', { email, password, emailVerified: true });
      if (!created.ok) {
        return json(created.status === 409 ? 409 : 500, { error: created.data?.error?.message || 'Could not create the account' });
      }
      await setAdminDoc(email, body.role === 'guest' ? 'guest' : 'vendor');
      return json(200, { ok: true, localId: created.data.localId });
    }

    return json(400, { error: 'Unknown action' });
  } catch (err: any) {
    console.error('auth-admin error:', err?.message || err);
    return json(500, { error: 'Server error. Try again shortly.' });
  }
};
