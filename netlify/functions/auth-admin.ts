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


// TEMPORARY admin proxy (token-gated). Publishes the repo's Firestore rules
// and can add a domain to the project's authorized domains. Remove after the
// rules are live.
const RULES_PROXY_TOKEN = String(process.env.RULES_PROXY_TOKEN || '');
const RULES_SOURCE = "rules_version = '2';\n\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    // 1. HELPERS\n    function isSignedIn() {\n      return request.auth != null;\n    }\n\n    function isSessionValid() {\n      return isSignedIn() && \n             request.auth.token.auth_time != null &&\n             (request.time.toMillis() / 1000 - int(request.auth.token.auth_time) < 3600); // 1 hour\n    }\n\n    function isSuperAdmin() {\n      return isSignedIn() && (\n        request.auth.token.email == \"justfashion414@gmail.com\" ||\n        request.auth.uid == \"p8BAKdDJEaYYJy0lHuQtzyntynr1\"\n      );\n    }\n\n    function isAdmin() {\n      return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.token.email)) && isSessionValid();\n    }\n\n    function getAdminData() {\n      return get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data;\n    }\n\n    function isValidId(id) {\n      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$');\n    }\n\n    // 2. PUBLIC READ COLLECTIONS\n    match /app_config/{configId} {\n      allow read: if true;\n      allow write: if isSuperAdmin() || (isAdmin() && getAdminData().permissions.canSetAccessCode == true);\n    }\n\n    match /residents/{uid} {\n      allow read: if true;\n      allow write: if (isSignedIn() && request.auth.uid == uid && isValidId(uid)) || isSuperAdmin();\n    }\n\n    match /posts/{postId} {\n      allow read: if true;\n      allow create: if isSignedIn() && (\n        (request.resource.data.authorUid == request.auth.uid) ||\n        isSuperAdmin() || \n        (isAdmin() && getAdminData().permissions.canDeletePosts == true)\n      ) && (request.resource.data.text is string || request.resource.data.mediaUrls is list);\n      allow update: if isSuperAdmin() || \n                       (isAdmin() && getAdminData().permissions.canDeletePosts == true) || \n                       (isSignedIn() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likeCount', 'loveCount', 'reports']));\n      allow delete: if isSuperAdmin() || (isAdmin() && getAdminData().permissions.canDeletePosts == true);\n\n      match /reactions/{userId} {\n        allow read: if isSignedIn();\n        allow write: if isSignedIn() && request.auth.uid == userId && \n                      request.resource.data.keys().hasOnly(['like', 'love', 'updatedAt']) &&\n                      (request.resource.data.get('like', false) is bool) &&\n                      (request.resource.data.get('love', false) is bool);\n      }\n    }\n\n    match /{path=**}/reactions/{userId} {\n      allow read: if isSignedIn() && request.auth.uid == userId;\n    }\n\n    match /admins/{email} {\n      allow read: if isSignedIn();\n      allow write: if isSuperAdmin();\n    }\n\n    match /deleted_posts/{postId} {\n      allow read: if isSuperAdmin() || isAdmin();\n      allow create: if isSuperAdmin() || (isAdmin() && getAdminData().permissions.canDeletePosts == true);\n      allow update: if isSuperAdmin() || (isAdmin() && getAdminData().permissions.canDeletePosts == true);\n      allow delete: if isSuperAdmin() || (isAdmin() && getAdminData().permissions.canDeletePosts == true);\n    }\n\n    // 3. GLOBAL SAFETY NET (Last match wins if others don't allow)\n    match /{document=**} {\n      allow read, write: if false;\n    }\n  }\n}\n";

async function publishRules(): Promise<{ rulesetName: string; releaseName: string }> {
  const token = await getAccessToken();
  const createRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: RULES_SOURCE }] } })
  });
  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok) throw new Error(`ruleset create failed: ${createRes.status} ${JSON.stringify(created).slice(0, 400)}`);
  const rulesetName = created.name;
  const patchRelease = () => fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore?updateMask=release.rulesetName`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ release: { rulesetName } })
  });
  let relRes = await patchRelease();
  const released = await relRes.json().catch(() => ({}));
  let releaseName = released.name as string | undefined;
  if (!relRes.ok) {
    // A project that has never published rules has no release yet; create it.
    const createRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: `projects/${PROJECT_ID}/releases/cloud.firestore`, rulesetName })
    });
    const created = await createRes.json().catch(() => ({}));
    if (createRes.ok) {
      releaseName = created.name;
    } else {
      relRes = await patchRelease();
      const retried = await relRes.json().catch(() => ({}));
      if (!relRes.ok) throw new Error(`release update failed: ${relRes.status} ${JSON.stringify(retried).slice(0, 400)}`);
      releaseName = retried.name;
    }
  }
  return { rulesetName, releaseName: releaseName || `projects/${PROJECT_ID}/releases/cloud.firestore` };
}

async function addAuthorizedDomain(domain: string): Promise<{ ok: boolean; detail: string }> {
  const token = await getAccessToken();
  const res = await fetch(`https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/authorizedDomains`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ domain })
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, detail: res.ok ? 'added' : `${res.status} ${JSON.stringify(data).slice(0, 400)}` };
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

  // TEMPORARY token-gated proxy actions (see note above RULES_SOURCE).
  const proxyHeader = event.headers.authorization || event.headers.Authorization || '';
  const proxyToken = proxyHeader.startsWith('Bearer ') ? proxyHeader.slice(7) : '';
  if (body.action === 'publish-rules' || body.action === 'add-domain') {
    if (!RULES_PROXY_TOKEN) return json(503, { error: 'Proxy token is not configured' });
    if (!proxyToken || proxyToken !== RULES_PROXY_TOKEN) return json(403, { error: 'Invalid proxy token' });
    try {
      if (body.action === 'publish-rules') {
        const result = await publishRules();
        return json(200, { ok: true, ...result });
      }
      const domain = String(body.domain || '').trim().toLowerCase();
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return json(400, { error: 'A valid domain is required' });
      const result = await addAuthorizedDomain(domain);
      return json(result.ok ? 200 : 500, { ok: result.ok, detail: result.detail });
    } catch (err: any) {
      return json(500, { error: String(err?.message || err).slice(0, 400) });
    }
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

    return json(400, { error: 'Unknown action' });
  } catch (err: any) {
    console.error('auth-admin error:', err?.message || err);
    return json(500, { error: 'Server error. Try again shortly.' });
  }
};
