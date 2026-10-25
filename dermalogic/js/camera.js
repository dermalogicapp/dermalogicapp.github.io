// Camera capture, face detection and pixel sampling. Images are processed on
// this device and never uploaded.
import { analyzeRegions, regionRects, sampleRegion } from './analysis.js';

let stream = null;

export async function startCamera(video) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot open the camera. You can upload a photo instead.');
  stopCamera();
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
  video.srcObject = stream;
  await video.play();
}

export function stopCamera() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

// Draws a video frame or image into a canvas no larger than maxSide pixels.
export function toCanvas(source, maxSide = 900, mirror = false) {
  const w = source.videoWidth || source.naturalWidth || source.width;
  const h = source.videoHeight || source.naturalHeight || source.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (mirror) {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = url;
  });
}

let mpDetector = null;
const MP_VERSION = '0.10.14';

async function mediapipeDetector() {
  if (mpDetector) return mpDetector;
  const mod = await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`);
  const vision = await mod.FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`);
  mpDetector = await mod.FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
    },
    runningMode: 'IMAGE',
  });
  return mpDetector;
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

// The guide oval on the camera screen uses these same proportions, so when
// detection is unavailable we sample where the user lined up their face.
export const GUIDE_BOX = { x: 0.3, y: 0.14, w: 0.4, h: 0.68 };

export async function detectFace(canvas) {
  // 1. Built-in Shape Detection API (some Chromium builds).
  if ('FaceDetector' in window) {
    try {
      const faces = await new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }).detect(canvas);
      if (faces[0]) {
        const b = faces[0].boundingBox;
        return { face: expandBox({ x: b.x, y: b.y, width: b.width, height: b.height }, canvas), method: 'Built-in browser face detection' };
      }
    } catch {}
  }
  // 2. MediaPipe face detector, downloaded once and run locally.
  try {
    const det = await withTimeout(mediapipeDetector(), 12000);
    const res = det.detect(canvas);
    const d = res.detections?.[0];
    if (d) {
      const b = d.boundingBox;
      return { face: expandBox({ x: b.originX, y: b.originY, width: b.width, height: b.height }, canvas), method: 'On-device face detection (MediaPipe)' };
    }
    return { face: null, method: 'none' };
  } catch {}
  // 3. Fall back to the guide oval.
  return {
    face: { x: canvas.width * GUIDE_BOX.x, y: canvas.height * GUIDE_BOX.y, width: canvas.width * GUIDE_BOX.w, height: canvas.height * GUIDE_BOX.h },
    method: 'Guide area (face detection unavailable)',
  };
}

// Detectors usually crop at the eyebrows; extend upward to include the forehead.
function expandBox(b, canvas) {
  const top = Math.max(0, b.y - b.height * 0.18);
  const height = Math.min(canvas.height - top, b.height * 1.18);
  return { x: b.x, y: top, width: b.width, height };
}

function regionPixels(ctx, rect, maxSamples = 3000) {
  const { data } = ctx.getImageData(rect.x, rect.y, rect.width, rect.height);
  const total = data.length / 4;
  const stride = Math.max(1, Math.floor(total / maxSamples));
  if (stride === 1) return data;
  const out = new Uint8ClampedArray(Math.ceil(total / stride) * 4);
  let j = 0;
  for (let i = 0; i < total; i += stride) {
    out[j++] = data[i * 4];
    out[j++] = data[i * 4 + 1];
    out[j++] = data[i * 4 + 2];
    out[j++] = 255;
  }
  return out.subarray(0, j);
}

export async function analyzeCanvas(canvas) {
  const { face, method } = await detectFace(canvas);
  if (!face) throw new Error('No face was found. Face the camera straight on in good light, with hair off your face.');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rects = regionRects(face);
  const regions = {};
  for (const [k, r] of Object.entries(rects)) {
    const clipped = clip(r, canvas);
    if (clipped) regions[k] = sampleRegion(regionPixels(ctx, clipped));
  }
  const result = analyzeRegions(regions);
  return { result, face, rects, method };
}

function clip(r, c) {
  const x = Math.max(0, r.x), y = Math.max(0, r.y);
  const w = Math.min(c.width, r.x + r.width) - x;
  const h = Math.min(c.height, r.y + r.height) - y;
  return w > 1 && h > 1 ? { x, y, width: w, height: h } : null;
}

export function drawOverlay(canvas, face, rects) {
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = Math.max(2, canvas.width / 300);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(face.x, face.y, face.width, face.height);
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(244, 166, 193, 0.95)';
  for (const r of Object.values(rects)) ctx.strokeRect(r.x, r.y, r.width, r.height);
}
