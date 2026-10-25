// Animated illustrations (inline SVG) used on page headers, empty states and
// the scan guide. Palette: burgundy, pink, white. Motion is CSS (see v2.css)
// and switches off with prefers-reduced-motion.

const defs = (id) => `<defs>
  <linearGradient id="${id}-s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f9d3de"/><stop offset="1" stop-color="#e394ae"/></linearGradient>
  <linearGradient id="${id}-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9b2c4f"/><stop offset="1" stop-color="#4a0e22"/></linearGradient>
  <radialGradient id="${id}-d" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#f4a6c1"/></radialGradient>
</defs>`;

// A friendly illustrated face (front view). `tone` is a gradient id suffix.
const face = (id, x = 100, y = 70, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <ellipse cx="0" cy="4" rx="34" ry="44" fill="url(#${id}-s)"/>
  <path d="M-36 -2C-36-34-20-50 0-50S36-34 36-2C26-20 14-27 0-27S-26-20-36-2Z" fill="url(#${id}-b)"/>
  <ellipse class="a-blink" cx="-12" cy="2" rx="4.5" ry="2.6" fill="#4a0e22"/><ellipse class="a-blink" cx="12" cy="2" rx="4.5" ry="2.6" fill="#4a0e22"/>
  <path d="M0 6v13m-4 0h8" stroke="#b25675" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M-9 28c6 5 12 5 18 0" stroke="#9b2c4f" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>`;

const sparkle = (x, y, d = 0) => `<path class="a-twinkle" style="animation-delay:${d}s" d="M${x} ${y - 7}c.4 4 2.6 6.6 7 7-4.4.4-6.6 3-7 7-.4-4-2.6-6.6-7-7 4.4-.4 6.6-3 7-7Z" fill="#fff"/>`;
const drop = (x, y, r, d = 0, id) => `<circle class="a-float" style="animation-delay:${d}s" cx="${x}" cy="${y}" r="${r}" fill="url(#${id}-d)" stroke="#fff" stroke-opacity=".6"/>`;

const SCENES = {
  // Face + animated guide ring + scan line
  scan: (id) => `${face(id, 100, 72, 1.15)}
    <ellipse class="a-ring-dash" cx="100" cy="72" rx="52" ry="66" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="8 7"/>
    <rect class="a-scanline" x="40" y="20" width="120" height="3" rx="2" fill="#fff" opacity=".9"/>
    ${sparkle(158, 30)}${sparkle(40, 110, 0.8)}`,
  // Face moving into the circle
  circle: (id) => `<ellipse cx="100" cy="72" rx="46" ry="60" fill="none" stroke="#fff" stroke-width="3.5" stroke-dasharray="7 6"/>
    <g class="a-slide-in">${face(id, 100, 74, 0.95)}</g>${sparkle(160, 24, 0.4)}`,
  // Sun / window light
  light: (id) => `<g class="a-spin" style="transform-origin:60px 50px">${[...Array(8)].map((_, i) => `<rect x="58" y="12" width="4" height="12" rx="2" fill="#fff" transform="rotate(${i * 45} 60 50)"/>`).join('')}</g>
    <circle class="a-pulse" cx="60" cy="50" r="17" fill="#fff"/>
    <g transform="translate(40 0)">${face(id, 104, 86, 0.8)}</g>`,
  // Hair back, no glasses
  hair: (id) => `${face(id, 100, 74, 1.1)}
    <path class="a-wiggle" d="M60 36c-14 10-20 28-18 52M140 36c14 10 20 28 18 52" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="3 7"/>
    ${sparkle(30, 40)}${sparkle(170, 100, 0.6)}`,
  // Hold still: face with expanding pulse
  still: (id) => `<circle class="a-expand" cx="100" cy="72" r="40" fill="none" stroke="#fff" stroke-width="3"/>
    <circle class="a-expand" style="animation-delay:1s" cx="100" cy="72" r="40" fill="none" stroke="#fff" stroke-width="3"/>${face(id, 100, 74, 0.95)}`,
  // Routine: bottles
  routine: (id) => `<g class="a-bob"><rect x="46" y="48" width="30" height="62" rx="9" fill="url(#${id}-b)"/><rect x="53" y="36" width="16" height="14" rx="4" fill="#fff"/><rect x="52" y="66" width="18" height="22" rx="4" fill="#fff" opacity=".85"/></g>
    <g class="a-bob" style="animation-delay:.6s"><rect x="92" y="62" width="40" height="48" rx="10" fill="url(#${id}-d)" stroke="#fff"/><rect x="96" y="52" width="32" height="12" rx="4" fill="#4a0e22"/></g>
    <g class="a-bob" style="animation-delay:1.2s"><path d="M146 110V76c0-8 5-14 12-14s12 6 12 14v34Z" fill="url(#${id}-b)"/><rect x="152" y="50" width="12" height="14" rx="3" fill="#fff"/></g>
    ${drop(78, 28, 6, 0, id)}${sparkle(122, 34, 0.5)}`,
  // Progress: before / after faces with arrow
  progress: (id) => `<g opacity=".8">${face(id, 56, 76, 0.62)}</g><path class="a-nudge" d="M92 74h26m-8-8 8 8-8 8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    ${face(id, 146, 76, 0.62)}${sparkle(176, 36)}${sparkle(168, 106, 0.7)}
    <path d="M30 118h140" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/><circle class="a-slide-x" cy="118" r="7" fill="#fff"/>`,
  // Lifestyle: moon, water drop, apple
  lifestyle: (id) => `<path class="a-pulse" d="M62 32a30 30 0 1 0 34 40 24 24 0 0 1-34-40Z" fill="#fff"/>
    ${drop(122, 52, 14, 0, id)}${drop(150, 86, 9, 0.7, id)}
    <g class="a-bob"><circle cx="58" cy="96" r="18" fill="#d9557f"/><path d="M58 78c0-8 4-12 10-12" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="68" cy="68" rx="7" ry="4" fill="#fff" transform="rotate(-25 68 68)"/></g>${sparkle(100, 22, .4)}`,
  // Ingredients: flask with bubbles
  ingredients: (id) => `<path d="M84 26h32M92 26v32L64 108a8 8 0 0 0 7 12h58a8 8 0 0 0 7-12L108 58V26" fill="rgb(255 255 255 / .18)" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
    <path d="M72 96h56l10 18a6 6 0 0 1-5 8H67a6 6 0 0 1-5-8Z" fill="url(#${id}-d)"/>
    ${[0, 0.7, 1.4].map((d, i) => `<circle class="a-rise" style="animation-delay:${d}s" cx="${88 + i * 12}" cy="100" r="${4 - i * 0.6}" fill="#fff"/>`).join('')}${sparkle(150, 40)}`,
  // Chat / voice waves
  chat: (id) => `<rect x="46" y="34" width="108" height="66" rx="22" fill="#fff"/><path d="M78 100v20l22-20Z" fill="#fff"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect class="a-wave" style="animation-delay:${i * 0.12}s" x="${68 + i * 10}" y="52" width="5" height="30" rx="2.5" fill="#9b2c4f"/>`).join('')}${sparkle(170, 28)}`,
  // Reminders: ringing bell
  reminders: (id) => `<g class="a-ring-bell" style="transform-origin:100px 36px"><path d="M64 98V70a36 36 0 0 1 72 0v28l10 12H54Z" fill="#fff"/><circle cx="100" cy="116" r="9" fill="#f4a6c1"/><circle cx="100" cy="30" r="5" fill="#fff"/></g>
    <path class="a-twinkle" d="M40 50c-6 8-6 18 0 26M160 50c6 8 6 18 0 26" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  // Complaints: heart + shield pulse
  complaints: (id) => `<path class="a-pulse" d="M100 120S50 90 50 58a24 24 0 0 1 50-6 24 24 0 0 1 50 6c0 32-50 62-50 62Z" fill="#fff"/>
    <path d="M100 52v38M81 71h38" stroke="#d9557f" stroke-width="9" stroke-linecap="round"/>${sparkle(166, 36)}${sparkle(34, 100, .6)}`,
  // Profile: face + sliders
  profile: (id) => `${face(id, 72, 74, 0.9)}
    ${[40, 70, 100].map((y, i) => `<rect x="118" y="${y}" width="58" height="8" rx="4" fill="#fff" opacity=".35"/><circle class="a-slide-x" style="animation-delay:${i * 0.5}s" cx="140" cy="${y + 4}" r="9" fill="#fff"/>`).join('')}`,
  settings: (id) => `<g class="a-spin" style="transform-origin:100px 70px"><circle cx="100" cy="70" r="26" fill="none" stroke="#fff" stroke-width="12" stroke-dasharray="14 9"/><circle cx="100" cy="70" r="14" fill="#fff"/></g>${sparkle(160, 30)}`,
  // Neutral droplets
  drops: (id) => `${drop(70, 60, 26, 0, id)}${drop(122, 44, 14, 0.6, id)}${drop(140, 90, 20, 1.2, id)}${drop(96, 106, 9, 0.3, id)}`,
};

let n = 0;
export function art(name, { className = '' } = {}) {
  const id = `art${++n}`;
  const scene = (SCENES[name] || SCENES.drops)(id);
  return `<svg class="art ${className}" viewBox="0 0 200 140" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${defs(id)}${scene}</svg>`;
}

export const hasArt = (name) => name in SCENES;
