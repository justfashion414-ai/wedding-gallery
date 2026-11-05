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
  const key = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY || '';
  if (!key) throw new Error('Web API key is not configured on this site');
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1${path}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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


// Fixed Firestore rules source published by the publishRules action below.
// Kept byte-identical to the repo's firestore.rules (albums section added).
const RULES_SOURCE = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // 1. HELPERS
    function isSignedIn() {
      return request.auth != null;
    }

    function isSessionValid() {
      return isSignedIn() && 
             request.auth.token.auth_time != null &&
             (request.time.toMillis() / 1000 - int(request.auth.token.auth_time) < 3600); // 1 hour
    }

    function isSuperAdmin() {
      return isSignedIn() && (
        request.auth.token.email == "justfashion414@gmail.com" ||
        request.auth.uid == "p8BAKdDJEaYYJy0lHuQtzyntynr1"
      );
    }

    function isAdmin() {
      return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.token.email)) && isSessionValid();
    }

    function getAdminData() {
      return get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data;
    }

    function isValidId(id) {
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$');
    }

    // 2. PUBLIC READ COLLECTIONS
    match /app_config/{configId} {
      allow read: if true;
      allow write: if isSuperAdmin() || (isAdmin() && getAdminData().permissions.canSetAccessCode == true);
    }

    match /residents/{uid} {
      allow read: if true;
      allow write: if (isSignedIn() && request.auth.uid == uid && isValidId(uid)) || isSuperAdmin();
    }

    match /posts/{postId} {
      allow read: if true;
      allow create: if isSignedIn() && (
        (request.resource.data.authorUid == request.auth.uid) ||
        isSuperAdmin() || 
        (isAdmin() && getAdminData().permissions.canDeletePosts == true)
      ) && (request.resource.data.text is string || request.resource.data.mediaUrls is list);
      allow update: if isSuperAdmin() || 
                       (isAdmin() && getAdminData().permissions.canDeletePosts == true) || 
                       (isSignedIn() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likeCount', 'loveCount', 'commentCount', 'reports']));
      allow delete: if isSuperAdmin() || (isAdmin() && getAdminData().permissions.canDeletePosts == true);

      match /reactions/{userId} {
        allow read: if isSignedIn();
        allow write: if isSignedIn() && request.auth.uid == userId && 
                      request.resource.data.keys().hasOnly(['like', 'love', 'updatedAt']) &&
                      (request.resource.data.get('like', false) is bool) &&
                      (request.resource.data.get('love', false) is bool);
      }

      match /comments/{commentId} {
        allow read: if true;
        allow create: if isSignedIn() && request.resource.data.authorUid == request.auth.uid &&
                      request.resource.data.text is string &&
                      request.resource.data.text.size() > 0 &&
                      request.resource.data.text.size() <= 500;
        allow update: if false;
        allow delete: if isSuperAdmin() || (isAdmin() && getAdminData().permissions.canDeletePosts == true) ||
                      (isSignedIn() && resource.data.authorUid == request.auth.uid);
      }
    }

    match /{path=**}/reactions/{userId} {
      allow read: if isSignedIn() && request.auth.uid == userId;
    }

    match /admins/{email} {
      allow read: if isSignedIn();
      allow write: if isSuperAdmin();
    }

    match /deleted_posts/{postId} {
      allow read: if isSuperAdmin() || isAdmin();
      allow create: if isSuperAdmin() || (isAdmin() && getAdminData().permissions.canDeletePosts == true);
      allow update: if isSuperAdmin() || (isAdmin() && getAdminData().permissions.canDeletePosts == true);
      allow delete: if isSuperAdmin() || (isAdmin() && getAdminData().permissions.canDeletePosts == true);
    }

    match /albums/{albumId} {
      allow read: if true;
      allow create: if isAdmin();
      allow update: if isSuperAdmin();
      allow delete: if isSuperAdmin() || (isAdmin() && getAdminData().permissions.canDeletePosts == true);
    }

    // 3. GLOBAL SAFETY NET (Last match wins if others don't allow)
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

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
      const created = await identityRequest('/accounts:signUp', { email, password });
      if (!created.ok) {
        const msg = String(created.data?.error?.message || '');
        if (msg.includes('EMAIL_EXISTS')) return json(409, { error: 'That account already exists. Sign in instead.' });
        return json(500, { error: msg || ('Could not create the account (status ' + created.status + (created.data ? ', ' + JSON.stringify(created.data).slice(0, 200) : '') + ')') });
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
      const created = await identityRequest('/accounts:signUp', { email, password });
      if (!created.ok) {
        const msg = String(created.data?.error?.message || '');
        if (msg.includes('EMAIL_EXISTS')) return json(409, { error: 'That email already has an account' });
        return json(500, { error: msg || ('Could not create the account (status ' + created.status + (created.data ? ', ' + JSON.stringify(created.data).slice(0, 200) : '') + ')') });
      }
      await setAdminDoc(email, body.role === 'guest' ? 'guest' : 'vendor');
      return json(200, { ok: true, localId: created.data.localId });
    }

    if (body.action === 'publishRules') {
      // Publishes only the fixed RULES_SOURCE embedded in this function (no caller input),
      // so an unauthenticated trigger cannot alter anything: worst case it re-publishes
      // the same intended rules. Returns the new ruleset and release state.
      const token = await getAccessToken();
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const createRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`, {
        method: 'POST', headers, body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: RULES_SOURCE }] } })
      });
      const created = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        return json(500, { error: 'Ruleset creation failed', details: created });
      }
      const releaseRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`, {
        method: 'PATCH', headers, body: JSON.stringify({ rulesetName: created.name })
      });
      const released = await releaseRes.json().catch(() => ({}));
      if (!releaseRes.ok) {
        return json(500, { error: 'Release update failed', ruleset: created.name, details: released });
      }
      return json(200, { ok: true, ruleset: created.name, release: released });
    }

    return json(400, { error: 'Unknown action' });
  } catch (err: any) {
    console.error('auth-admin error:', err?.message || err);
    return json(500, { error: 'Server error. Try again shortly.' });
  }
};
