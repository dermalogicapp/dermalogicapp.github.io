// Live coaching while the camera is open: measures a small video frame and
// says what to fix (light, position, distance). Pure so it can be tested.
import { isSkinPixel } from './analysis.js';
import { GUIDE_BOX } from './camera.js';

const CX = GUIDE_BOX.x + GUIDE_BOX.w / 2;
const CY = GUIDE_BOX.y + GUIDE_BOX.h / 2;
const RX = GUIDE_BOX.w / 2;
const RY = GUIDE_BOX.h / 2;

// RGBA pixel data of a downscaled frame -> numbers about light and face position.
export function measureFrame(data, w, h) {
  let inN = 0, inSkin = 0, lumaSum = 0, ringN = 0, ringSkin = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x / w - CX) / RX;
      const ny = (y / h - CY) / RY;
      const d = nx * nx + ny * ny;
      if (d > 2.6) continue;
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const skin = isSkinPixel(r, g, b);
      if (d <= 1) {
        inN++;
        lumaSum += 0.299 * r + 0.587 * g + 0.114 * b;
        if (skin) inSkin++;
      } else if (d > 1.3) {
        ringN++;
        if (skin) ringSkin++;
      }
    }
  }
  return {
    luma: inN ? lumaSum / inN : 0,
    skinInside: inN ? inSkin / inN : 0,
    skinRing: ringN ? ringSkin / ringN : 0,
  };
}

export const COACH = {
  dark: 'It is too dark. Face a window or turn on a light.',
  bright: 'It is too bright. Move out of direct sunlight or a strong lamp.',
  place: 'Place your face inside the circle.',
  closer: 'Move a little closer to the camera.',
  back: 'A little too close. Move back slightly.',
  ready: 'Perfect. Hold still.',
};

export function coachMessage({ luma, skinInside, skinRing }) {
  if (luma < 55) return { key: 'dark', text: COACH.dark, ready: false };
  if (luma > 225) return { key: 'bright', text: COACH.bright, ready: false };
  if (skinInside < 0.3) return { key: 'place', text: COACH.place, ready: false };
  if (skinInside < 0.55) return { key: 'closer', text: COACH.closer, ready: false };
  if (skinRing > 0.6) return { key: 'back', text: COACH.back, ready: false };
  return { key: 'ready', text: COACH.ready, ready: true };
}
