// Vercel serverless function: sends one face photo to the YouCam (Perfect Corp)
// AI Skin Analysis API and returns the per-concern scores.
// The API key stays here, in the YOUCAM_API_KEY environment variable. The
// browser never sees it. Optional: SUPABASE_URL + SUPABASE_ANON_KEY make this
// endpoint require a signed-in user so strangers can't spend your credits.

const BASE = process.env.YOUCAM_BASE_URL || 'https://yce-api-01.makeupar.com';
// Eight standard-definition checks (one scan = 12 credits on the standard tier).
export const ACTIONS = ['acne', 'age_spot', 'dark_circle_v2', 'moisture', 'oiliness', 'pore', 'redness', 'texture'];
const MAX_BYTES = 3 * 1024 * 1024;
const POLL_EVERY_MS = 1500;
const POLL_FOR_MS = 24000;

const hits = new Map(); // best-effort per-instance rate limit: ip -> timestamps
function rateLimited(ip, now = Date.now()) {
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) hits.clear();
  return recent.length > 6;
}

class UpstreamError extends Error {
  constructor(message, code = 'upstream_error', status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function yc(apiKey, path, { method = 'GET', body, fetchImpl }) {
  const res = await fetchImpl(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new UpstreamError('The YouCam API key was rejected.', 'bad_key');
  if (res.status === 429) throw new UpstreamError('YouCam is busy. Try again in a moment.', 'busy', 429);
  if (!res.ok) throw new UpstreamError(data.error || data.message || `YouCam returned ${res.status}.`, data.error_code || 'upstream_error');
  return data;
}

// Runs the four-step YouCam flow: register file, upload, create task, poll.
export async function analyzeWithYoucam({ apiKey, jpeg, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const reg = await yc(apiKey, '/s2s/v2.0/file/skin-analysis', {
    method: 'POST',
    fetchImpl,
    body: { files: [{ content_type: 'image/jpeg', file_name: 'face.jpg', file_size: jpeg.length }] },
  });
  const file = reg.data?.files?.[0];
  const put = file?.requests?.[0];
  if (!file?.file_id || !put?.url) throw new UpstreamError('YouCam did not accept the upload request.');

  const up = await fetchImpl(put.url, { method: put.method || 'PUT', headers: put.headers || { 'Content-Type': 'image/jpeg' }, body: jpeg });
  if (!up.ok) throw new UpstreamError('Uploading the photo to YouCam failed.');

  const task = await yc(apiKey, '/s2s/v2.0/task/skin-analysis', {
    method: 'POST',
    fetchImpl,
    body: { src_file_id: file.file_id, dst_actions: ACTIONS, format: 'json' },
  });
  const taskId = task.data?.task_id ?? task.task_id;
  if (!taskId) throw new UpstreamError('YouCam did not return a task id.');

  const deadline = Date.now() + POLL_FOR_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_EVERY_MS);
    const poll = await yc(apiKey, `/s2s/v2.0/task/skin-analysis/${encodeURIComponent(taskId)}`, { fetchImpl });
    const status = poll.data?.task_status;
    if (status === 'success') return parseOutput(poll.data.results);
    if (status === 'error') {
      const code = poll.data.error || poll.data.error_code || 'analysis_failed';
      const noFace = /face|landmark/i.test(String(code));
      throw new UpstreamError(noFace ? 'YouCam could not find a clear face in the photo.' : 'YouCam could not analyze this photo.', noFace ? 'no_face' : 'analysis_failed', 422);
    }
  }
  throw new UpstreamError('The analysis took too long. Please try again.', 'timeout', 504);
}

export function parseOutput(results) {
  const out = Array.isArray(results?.output) ? results.output : [];
  const scores = {};
  for (const item of out) {
    if (typeof item?.type === 'string' && Number.isFinite(item.ui_score)) scores[item.type] = Math.round(item.ui_score);
  }
  if (!Object.keys(scores).length) throw new UpstreamError('YouCam returned no scores.', 'empty');
  return scores;
}

async function signedIn(req, fetchImpl) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return true; // demo deployments have no real accounts to check
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  try {
    const r = await fetchImpl(`${url.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    return r.ok;
  } catch {
    return false;
  }
}

export default async function handler(req, res, deps = {}) {
  const fetchImpl = deps.fetchImpl || fetch;
  res.setHeader('Cache-Control', 'no-store');
  const send = (status, body) => res.status(status).json(body);

  if (req.method !== 'POST') return send(405, { error: 'method_not_allowed' });
  const apiKey = process.env.YOUCAM_API_KEY;
  if (!apiKey) return send(503, { error: 'not_configured', message: 'YouCam is not set up on this server yet.' });
  if (!(await signedIn(req, fetchImpl))) return send(401, { error: 'sign_in_required', message: 'Please sign in to use cloud analysis.' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return send(429, { error: 'rate_limited', message: 'Too many scans. Please wait a minute.' });

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const b64 = typeof body?.image === 'string' ? body.image.replace(/^data:image\/jpeg;base64,/, '') : '';
  if (!b64) return send(400, { error: 'bad_request', message: 'Send a JPEG as a base64 "image".' });
  const jpeg = Buffer.from(b64, 'base64');
  if (jpeg.length < 1000 || jpeg.length > MAX_BYTES || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
    return send(400, { error: 'bad_image', message: 'The photo must be a JPEG under 3 MB.' });
  }

  try {
    const scores = await analyzeWithYoucam({ apiKey, jpeg, fetchImpl, sleep: deps.sleep });
    return send(200, { scores });
  } catch (e) {
    if (!(e instanceof UpstreamError)) console.error('youcam handler', e);
    const err = e instanceof UpstreamError ? e : new UpstreamError('Cloud analysis failed.');
    return send(err.status, { error: err.code, message: err.message });
  }
}
