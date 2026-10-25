// Pure image-analysis math. No DOM here so it can be unit tested in Node.
// All numbers are camera-based estimates and depend heavily on lighting.

export function srgbToLab(r, g, b) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = lin(r), G = lin(g), B = lin(b);
  // D65 reference white
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// Common skin-pixel rule in YCbCr space. Broad enough for light to very deep tones.
export function isSkinPixel(r, g, b) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return y > 25 && cb >= 77 && cb <= 135 && cr >= 130 && cr <= 180 && r > b;
}

// Individual Typology Angle, a standard colorimetric measure of skin tone.
export function itaAngle(L, b) {
  return (Math.atan2(L - 50, b) * 180) / Math.PI;
}

export const TONE_CATEGORIES = [
  { min: 55, label: 'Very light', fitz: 'I' },
  { min: 41, label: 'Light', fitz: 'II' },
  { min: 28, label: 'Intermediate / medium', fitz: 'III' },
  { min: 10, label: 'Tan / olive', fitz: 'IV' },
  { min: -30, label: 'Brown', fitz: 'V' },
  { min: -Infinity, label: 'Deep / dark brown', fitz: 'VI' },
];

export function classifyTone(ita) {
  return TONE_CATEGORIES.find((c) => ita > c.min);
}

export function classifyUndertone(a, b) {
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  if (hue < 50) return { label: 'Cool (pink / red)', hue };
  if (hue <= 62) return { label: 'Neutral', hue };
  return { label: 'Warm (golden / yellow)', hue };
}

const median = (arr) => {
  if (!arr.length) return 0;
  const s = Float64Array.from(arr).sort();
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const std = (arr) => {
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((x) => (x - m) ** 2)));
};
const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

// Converts raw RGBA pixel data into Lab samples, keeping skin-like pixels.
// Returns all pixels as a fallback when too few pass the skin rule.
export function sampleRegion(data, { keepAll = false } = {}) {
  const skin = [], all = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lab = srgbToLab(r, g, b);
    all.push(lab);
    if (isSkinPixel(r, g, b)) skin.push(lab);
  }
  if (keepAll) return all;
  return skin.length >= all.length * 0.25 ? skin : all;
}

export function levelOf(score) {
  if (score < 30) return 'low';
  if (score < 60) return 'moderate';
  return 'noticeable';
}

// regions: { forehead, leftCheek, rightCheek, nose, chin, underEyeLeft, underEyeRight }
// each an array of [L, a, b] samples.
export function analyzeRegions(regions) {
  const cheeks = [...(regions.leftCheek || []), ...(regions.rightCheek || [])];
  const forehead = regions.forehead || [];
  const toneSamples = [...cheeks, ...forehead];
  const face = [...toneSamples, ...(regions.nose || []), ...(regions.chin || [])];
  if (toneSamples.length < 20) throw new Error('Not enough skin was visible to analyze. Try a clearer, front-facing photo.');

  // Ignore highlights and deep shadows when measuring base tone.
  const Ls = toneSamples.map((p) => p[0]);
  const mL = median(Ls);
  const toneCore = toneSamples.filter((p) => Math.abs(p[0] - mL) < 15);
  const L = median(toneCore.map((p) => p[0]));
  const A = median(toneCore.map((p) => p[1]));
  const B = median(toneCore.map((p) => p[2]));
  const ita = itaAngle(L, B);
  const tone = classifyTone(ita);
  const undertone = classifyUndertone(A, B);

  // Lighting quality.
  const warnings = [];
  if (L < 22) warnings.push('The photo looks dark. Face a window or a soft light for better accuracy.');
  if (L > 88) warnings.push('The photo looks overexposed. Move away from direct light.');
  const lr = median((regions.leftCheek || []).map((p) => p[0]));
  const rr = median((regions.rightCheek || []).map((p) => p[0]));
  if (regions.leftCheek?.length && regions.rightCheek?.length && Math.abs(lr - rr) > 12) {
    warnings.push('One side of your face is much brighter than the other. Even lighting gives more reliable results.');
  }

  // Redness: average a* on cheeks and nose, plus how patchy it is.
  const rednessSamples = [...cheeks, ...(regions.nose || [])];
  const aVals = rednessSamples.map((p) => p[1]);
  const aMed = median(aVals);
  const redPatch = aVals.filter((a) => a > aMed + 7).length / Math.max(1, aVals.length);
  const redness = clamp((aMed - 13) * 5 + redPatch * 250);

  // Uneven tone: spread of lightness and darker-than-surrounding spots.
  const coreL = face.filter((p) => p[0] < mL + 20).map((p) => p[0]);
  const faceL = median(coreL);
  const spread = std(coreL);
  const darkFrac = coreL.filter((l) => l < faceL - 9).length / Math.max(1, coreL.length);
  const unevenTone = clamp((spread - 3.5) * 9 + darkFrac * 220);

  // Shine: bright, low-chroma highlights in the T-zone.
  const tzone = [...forehead, ...(regions.nose || [])];
  const shineFrac = tzone.filter((p) => p[0] > faceL + 16 && Math.hypot(p[1], p[2]) < 22).length / Math.max(1, tzone.length);
  const oiliness = clamp(shineFrac * 700);

  // Blemishes: small, distinctly red spots on cheeks and chin.
  const blemArea = [...cheeks, ...(regions.chin || [])];
  const bA = median(blemArea.map((p) => p[1]));
  const blemFrac = blemArea.filter((p) => p[1] > bA + 11).length / Math.max(1, blemArea.length);
  const blemishes = clamp(blemFrac * 900);

  // Dark circles: under-eye lightness versus cheeks.
  const under = [...(regions.underEyeLeft || []), ...(regions.underEyeRight || [])];
  let darkCircles = null;
  if (under.length > 10 && cheeks.length) {
    const diff = median(cheeks.map((p) => p[0])) - median(under.map((p) => p[0]));
    darkCircles = clamp((diff - 3) * 7);
  }

  const concerns = {
    redness: { label: 'Redness', score: Math.round(redness) },
    hyperpigmentation: { label: 'Uneven tone / dark spots', score: Math.round(unevenTone) },
    oiliness: { label: 'Shine / oiliness', score: Math.round(oiliness) },
    acne: { label: 'Blemishes / red spots', score: Math.round(blemishes) },
  };
  if (darkCircles !== null) concerns.darkCircles = { label: 'Dark circles', score: Math.round(darkCircles) };
  for (const c of Object.values(concerns)) c.level = levelOf(c.score);

  return {
    tone: {
      ita: Math.round(ita * 10) / 10,
      category: tone.label,
      fitzpatrickApprox: tone.fitz,
      undertone: undertone.label,
      lab: [L, A, B].map((x) => Math.round(x * 10) / 10),
      hex: labToHex(L, A, B),
    },
    concerns,
    warnings,
    confidence: warnings.length ? 'low' : 'medium',
  };
}

export function labToHex(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const inv = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const X = inv(fx) * 0.95047, Y = inv(fy), Z = inv(fz) * 1.08883;
  const r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  const g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  const bl = X * 0.0557 + Y * -0.204 + Z * 1.057;
  const gam = (c) => Math.round(255 * clamp(c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055, 0, 1));
  return '#' + [r, g, bl].map((c) => gam(c).toString(16).padStart(2, '0')).join('');
}

// Region boxes as fractions of the detected face box.
export const REGION_LAYOUT = {
  forehead: [0.3, 0.06, 0.4, 0.14],
  underEyeLeft: [0.2, 0.42, 0.2, 0.07],
  underEyeRight: [0.6, 0.42, 0.2, 0.07],
  leftCheek: [0.14, 0.52, 0.22, 0.17],
  rightCheek: [0.64, 0.52, 0.22, 0.17],
  nose: [0.43, 0.42, 0.14, 0.2],
  chin: [0.38, 0.84, 0.24, 0.1],
};

export function regionRects(face) {
  const out = {};
  for (const [k, [fx, fy, fw, fh]] of Object.entries(REGION_LAYOUT)) {
    out[k] = {
      x: Math.round(face.x + fx * face.width),
      y: Math.round(face.y + fy * face.height),
      width: Math.max(2, Math.round(fw * face.width)),
      height: Math.max(2, Math.round(fh * face.height)),
    };
  }
  return out;
}

// Plain-language summary for screen readers and the voice assistant.
export function describeAnalysis(result) {
  const t = result.tone;
  const parts = [`Estimated skin tone: ${t.category}, roughly Fitzpatrick type ${t.fitzpatrickApprox}, with a ${t.undertone.toLowerCase()} undertone.`];
  const notable = Object.values(result.concerns).filter((c) => c.level !== 'low');
  if (notable.length) parts.push('Areas to look at: ' + notable.map((c) => `${c.label.toLowerCase()} (${c.level})`).join(', ') + '.');
  else parts.push('No concerns stood out strongly in this photo.');
  if (result.warnings.length) parts.push('Note: ' + result.warnings.join(' '));
  return parts.join(' ');
}
