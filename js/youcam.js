// Browser side of the YouCam integration: crop the face to what the API wants,
// call our serverless function (which holds the key), and map the scores onto
// DermaLogic's own concern model so the rest of the app doesn't care where
// the numbers came from.
import { CONFIG } from './config.js';
import { levelOf } from './analysis.js';
import { currentSession } from './auth.js';

// YouCam wants the face to fill >60% of the image width, short side >= 480px.
const FACE_FILL = 0.7;
const MIN_SHORT_SIDE = 480;
const MAX_LONG_SIDE = 1600;

// Where the crop should sit: a portrait box centred on the face. Pure, tested.
export function cropRect(face, size) {
  let w = face.width / FACE_FILL;
  let h = w * 1.3;
  w = Math.min(w, size.width);
  h = Math.min(h, size.height);
  const cx = face.x + face.width / 2;
  const cy = face.y + face.height / 2;
  const x = Math.max(0, Math.min(size.width - w, cx - w / 2));
  const y = Math.max(0, Math.min(size.height - h, cy - h / 2));
  return { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) };
}

export function cropToJpeg(canvas, face) {
  const r = cropRect(face, canvas);
  let scale = 1;
  const short = Math.min(r.width, r.height);
  if (short < MIN_SHORT_SIDE) scale = MIN_SHORT_SIDE / short;
  const long = Math.max(r.width, r.height) * scale;
  if (long > MAX_LONG_SIDE) scale = MAX_LONG_SIDE / Math.max(r.width, r.height);
  const out = document.createElement('canvas');
  out.width = Math.round(r.width * scale);
  out.height = Math.round(r.height * scale);
  out.getContext('2d').drawImage(canvas, r.x, r.y, r.width, r.height, 0, 0, out.width, out.height);
  return { dataUrl: out.toDataURL('image/jpeg', 0.9), upscaled: scale > 1.01, width: out.width, height: out.height };
}

// YouCam's ui_score is "how healthy" (higher is better). DermaLogic's concern
// scores are "how noticeable" (higher is worse), so concerns are 100 - score.
const MAP = [
  ['redness', 'redness', 'Redness'],
  ['hyperpigmentation', 'age_spot', 'Dark spots / uneven tone'],
  ['oiliness', 'oiliness', 'Shine / oiliness'],
  ['acne', 'acne', 'Blemishes / acne'],
  ['darkCircles', 'dark_circle_v2', 'Dark circles'],
  ['dryness', 'moisture', 'Dryness / low hydration'],
];

export function mapYoucamScores(scores) {
  const concerns = {};
  const put = (key, label, healthy) => {
    if (!Number.isFinite(healthy)) return;
    const score = Math.max(0, Math.min(100, Math.round(100 - healthy)));
    concerns[key] = { label, score, level: levelOf(score), source: 'youcam' };
  };
  for (const [key, action, label] of MAP) put(key, label, scores[action]);
  const pore = scores.pore;
  const tex = scores.texture;
  const worst = [pore, tex].filter(Number.isFinite);
  if (worst.length) put('texture', 'Texture / pores', Math.min(...worst));
  return concerns;
}

// Merge YouCam's concerns into an on-device result (which keeps skin tone).
export function mergeResults(local, youcamConcerns) {
  return { ...local, concerns: { ...local.concerns, ...youcamConcerns }, engine: 'youcam' };
}

export class YoucamError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export async function analyzeInCloud(dataUrl, { fetchImpl = fetch, signal } = {}) {
  const token = currentSession()?.accessToken;
  let res;
  try {
    res = await fetchImpl(CONFIG.YOUCAM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ image: dataUrl }),
      signal,
    });
  } catch {
    throw new YoucamError('Could not reach the YouCam service.', 'network');
  }
  const ct = res.headers?.get?.('content-type') || '';
  const data = ct.includes('json') ? await res.json().catch(() => ({})) : {};
  if (!res.ok || !data.scores) {
    const code = data.error || (res.status === 404 ? 'not_available' : 'failed');
    throw new YoucamError(data.message || 'Cloud analysis is not available here.', code);
  }
  return data.scores;
}
