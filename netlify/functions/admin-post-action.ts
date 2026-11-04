import crypto from 'crypto';
import {
  verifyFirebaseIdToken,
  getSaAccessToken,
  getProjectId,
  getDocFields,
  isVerifiedAdmin,
  unauthorized,
} from './_verify';

/**
 * Admin-only post lifecycle endpoint.
 *
 * Every call must carry a valid Firebase ID token from a caller who has a doc
 * in admins/{email}. Firestore writes here go through the service account, so
 * the client-side security rules (which still gate guests) never block an
 * admin's delete/restore/erase.
 *
 * body: { action: 'delete' | 'restore' | 'erase', postId }
 *  - delete:  move posts/{id} to deleted_posts/{id} (recycle bin) and purge
 *             the post's Cloudinary files, as the couple requested.
 *  - restore: move deleted_posts/{id} back to posts/{id} (media files were
 *             purged at delete time, so only text returns).
 *  - erase:   remove deleted_posts/{id} and purge its Cloudinary files.
 */

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(statusCode: number, body: any) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function fsBase(projectId: string) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

async function fsGet(url: string, token: string): Promise<any | null> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore read failed (${res.status})`);
  return res.json();
}

async function fsCreate(projectId: string, col: string, docId: string, fields: any, token: string) {
  const res = await fetch(
    `${fsBase(projectId)}/${col}?documentId=${encodeURIComponent(docId)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) throw new Error(`Firestore write failed (${res.status})`);
  return res.json();
}

async function fsDelete(url: string, token: string) {
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok && res.status !== 404) throw new Error(`Firestore delete failed (${res.status})`);
}

/** Delete every doc in a post's comments/reactions subcollections. */
async function deleteSubcollections(projectId: string, token: string, parentPath: string) {
  for (const sub of ['comments', 'reactions']) {
    let pageToken: string | undefined;
    do {
      const url =
        `${fsBase(projectId)}/${parentPath}/${sub}?pageSize=300` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
      const snap: any = await fsGet(url, token);
      const docs: any[] = snap?.documents || [];
      for (const d of docs) {
        await fsDelete(`${fsBase(projectId)}/${d.name.split('/documents/')[1]}`, token);
      }
      pageToken = snap?.nextPageToken;
    } while (pageToken);
  }
}

function parseCloudinaryUrl(url: string): { cloud: string; type: string; publicId: string } | null {
  const m = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video)\/upload\/(?:[^/?#]*\/)?(v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?(?:\?.*)?$/.exec(
    url
  );
  if (!m) return null;
  return { cloud: m[1], type: m[2], publicId: m[4] };
}

/** Destroy one Cloudinary asset with a signed destroy call. */
async function destroyCloudinaryAsset(
  asset: { cloud: string; type: string; publicId: string },
  apiKey: string,
  apiSecret: string
): Promise<boolean> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`public_id=${asset.publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');
  const body = new URLSearchParams({
    public_id: asset.publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${asset.cloud}/${asset.type}/destroy`, {
      method: 'POST',
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { result?: string };
    return data.result === 'ok' || data.result === 'not found';
  } catch {
    return false;
  }
}

/** Purge every Cloudinary file referenced by a post's fields. */
async function purgePostMedia(fields: any): Promise<{ purged: number; failed: number }> {
  const urls: string[] = [];
  const push = (v: any) => {
    if (typeof v === 'string' && v.startsWith('http')) urls.push(v);
  };
  const mediaList = fields?.mediaUrls?.arrayValue?.values || [];
  for (const v of mediaList) push(v?.stringValue);
  push(fields?.mediaUrl?.stringValue);

  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  let purged = 0;
  let failed = 0;
  const seen = new Set<string>();
  for (const url of urls) {
    const asset = parseCloudinaryUrl(url);
    if (!asset || seen.has(asset.publicId)) continue;
    seen.add(asset.publicId);
    if (!apiKey || !apiSecret) {
      failed += 1;
      continue;
    }
    if (await destroyCloudinaryAsset(asset, apiKey, apiSecret)) purged += 1;
    else failed += 1;
  }
  return { purged, failed };
}

export async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only.' });

  const projectId = getProjectId();
  const caller = await verifyFirebaseIdToken(
    event.headers.authorization || event.headers.Authorization,
    projectId
  );
  if (!caller) return unauthorized(headers);

  const token = await getSaAccessToken();
  if (!token) return json(500, { error: 'Server is missing its Firebase credentials.' });

  if (!(await isVerifiedAdmin(caller.email, projectId))) {
    return json(403, { error: 'Admins only.' });
  }
  const adminFields = await getDocFields(`admins/${encodeURIComponent(String(caller.email).toLowerCase())}`, projectId);
  const canDelete = adminFields?.permissions?.mapValue?.fields?.canDeletePosts?.booleanValue;
  if (canDelete === false) {
    return json(403, { error: 'You do not have permission to delete posts.' });
  }

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }
  const { action, postId } = body || {};
  if (!postId || typeof postId !== 'string' || !['delete', 'restore', 'erase'].includes(action)) {
    return json(400, { error: 'action must be delete, restore or erase, with postId.' });
  }

  try {
    if (action === 'delete') {
      const post = await fsGet(`${fsBase(projectId)}/posts/${encodeURIComponent(postId)}`, token);
      if (!post) return json(404, { error: 'Post not found.' });
      await fsCreate(
        projectId,
        'deleted_posts',
        postId,
        {
          originalId: { stringValue: postId },
          postData: { mapValue: { fields: post.fields } },
          deletedAt: { timestampValue: new Date().toISOString() },
          deletedBy: { stringValue: caller.email || caller.uid },
        },
        token
      );
      await deleteSubcollections(projectId, token, `posts/${encodeURIComponent(postId)}`);
      await fsDelete(`${fsBase(projectId)}/posts/${encodeURIComponent(postId)}`, token);
      const media = await purgePostMedia(post.fields);
      return json(200, { ok: true, action, postId, media });
    }

    if (action === 'restore') {
      const bin = await fsGet(`${fsBase(projectId)}/deleted_posts/${encodeURIComponent(postId)}`, token);
      if (!bin) return json(404, { error: 'That post is not in the recycle bin.' });
      const postData = bin.fields?.postData?.mapValue?.fields;
      if (!postData) return json(400, { error: 'Recycle bin entry has no original post data.' });
      await fsCreate(projectId, 'posts', postId, postData, token);
      await fsDelete(`${fsBase(projectId)}/deleted_posts/${encodeURIComponent(postId)}`, token);
      return json(200, { ok: true, action, postId });
    }

    // erase
    const bin = await fsGet(`${fsBase(projectId)}/deleted_posts/${encodeURIComponent(postId)}`, token);
    if (!bin) return json(404, { error: 'That post is not in the recycle bin.' });
    const media = await purgePostMedia(bin.fields?.postData?.mapValue?.fields || bin.fields);
    await fsDelete(`${fsBase(projectId)}/deleted_posts/${encodeURIComponent(postId)}`, token);
    return json(200, { ok: true, action, postId, media });
  } catch (err: any) {
    return json(500, { error: err?.message || 'Post action failed.' });
  }
}
