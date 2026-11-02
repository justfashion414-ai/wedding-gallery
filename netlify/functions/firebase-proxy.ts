import crypto from 'crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

const base64url = (input: string | Buffer): string =>
  Buffer.from(input)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error('service account JSON is missing client_email, private_key or project_id');
  }
  return parsed as ServiceAccount;
}

async function getServiceAccountWithToken(): Promise<ServiceAccount & { accessToken: string }> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    const sa = loadServiceAccount();
    return { ...sa, accessToken: cachedToken.token };
  }
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope:
        'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.read_write https://www.googleapis.com/auth/cloud-platform',
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = header + '.' + claims;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(sa.private_key.replace(/\\n/g, '\n'), 'base64');
  const assertion = signingInput + '.' + base64url(Buffer.from(signature, 'base64'));

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const payload: any = await res.json().catch(() => ({}));
  if (!res.ok || !payload.access_token) {
    throw new Error('Google token exchange failed with status ' + res.status);
  }
  cachedToken = {
    token: payload.access_token,
    expiresAt: Date.now() + ((payload.expires_in || 3600) as number) * 1000 - 60000,
  };
  return { ...sa, accessToken: payload.access_token };
}

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  },
  body: JSON.stringify(body),
});

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (['GET', 'POST', 'PATCH', 'DELETE'].indexOf(event.httpMethod) === -1) {
    return json(405, { error: 'method not allowed' });
  }

  try {
    const sa = await getServiceAccountWithToken();
    const params = event.queryStringParameters || {};
    const target: string = params.target || '';

    if (!target) {
      return json(200, { ok: true, projectId: sa.project_id, services: ['firestore', 'storage'] });
    }

    const parts = target.split('/').filter(Boolean);
    const service = parts[0];
    const subPath = parts.slice(1).join('/');

    let url = '';
    if (service === 'firestore') {
      const db = params.db || '(default)';
      url = 'https://firestore.googleapis.com/v1/projects/' + sa.project_id + '/databases/' + db + '/documents/' + subPath;
    } else if (service === 'storage') {
      const bucket = params.bucket || sa.project_id + '.firebasestorage.app';
      url = 'https://firebasestorage.googleapis.com/v0/b/' + bucket + '/' + subPath;
    } else {
      return json(400, { error: 'unsupported service: ' + service });
    }

    const init: any = {
      method: event.httpMethod,
      headers: { Authorization: 'Bearer ' + sa.accessToken, 'Content-Type': 'application/json' },
    };
    if (event.body && event.httpMethod !== 'GET') {
      init.body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    }

    const upstream = await fetch(url, init);
    const text = await upstream.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    return json(upstream.status, parsed);
  } catch (err: any) {
    return json(500, { error: err && err.message ? err.message : 'proxy error' });
  }
};
