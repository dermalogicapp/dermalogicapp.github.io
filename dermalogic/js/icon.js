// Animated droplet icon: glossy serum drops that drift and bob, in burgundy,
// pink and white. Inline SVG so it stays crisp and can be paused by CSS
// (see .droplets in styles.css and prefers-reduced-motion).

let n = 0;

// Each drop: center x, y, radius, fill tone, animation delay (s), duration (s).
const LAYOUTS = {
  logo: [
    [26, 34, 20, 'deep', 0, 4.2],
    [46, 18, 11, 'pink', -1.3, 3.6],
    [48, 46, 7, 'blush', -2.1, 3.2],
  ],
  banner: [
    [70, 70, 46, 'deep', 0, 6.5],
    [150, 40, 22, 'pink', -2, 5.2],
    [175, 105, 34, 'blush', -3.5, 7],
    [250, 60, 14, 'pink', -1.2, 4.6],
    [300, 95, 26, 'deep', -4.2, 6.2],
    [110, 128, 12, 'blush', -0.6, 4.2],
  ],
};

const TONES = {
  deep: ['#9b2c4f', '#5a0f2a'],
  pink: ['#f7b6c8', '#d9557f'],
  blush: ['#ffffff', '#f4a6c1'],
};

function drop(id, [cx, cy, r, tone, delay, dur], i) {
  const bubbles = r > 10
    ? [
        [cx - r * 0.3, cy + r * 0.25, r * 0.09],
        [cx - r * 0.1, cy + r * 0.45, r * 0.06],
        [cx + r * 0.2, cy + r * 0.3, r * 0.07],
      ]
    : [];
  return `<g class="drop" style="animation-delay:${delay}s;animation-duration:${dur}s;--drift:${i % 2 ? -1 : 1}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}-${tone})" />
    <circle cx="${cx}" cy="${cy}" r="${r - 0.6}" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="${Math.max(0.8, r * 0.05)}" />
    <ellipse cx="${cx - r * 0.35}" cy="${cy - r * 0.42}" rx="${r * 0.32}" ry="${r * 0.17}" fill="#fff" fill-opacity="0.85" transform="rotate(-30 ${cx - r * 0.35} ${cy - r * 0.42})" />
    <circle cx="${cx + r * 0.42}" cy="${cy + r * 0.38}" r="${r * 0.1}" fill="#fff" fill-opacity="0.5" />
    ${bubbles.map(([x, y, br]) => `<circle class="fizz" cx="${x}" cy="${y}" r="${br}" fill="#fff" fill-opacity="0.7" />`).join('')}
  </g>`;
}

export function dropletIcon({ variant = 'logo', size = 32, label = '', className = '' } = {}) {
  const id = `dl${++n}`;
  const box = variant === 'banner' ? '0 0 340 160' : '0 0 64 64';
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  const grads = Object.entries(TONES)
    .map(
      ([k, [a, b]]) => `<radialGradient id="${id}-${k}" cx="35%" cy="30%" r="75%">
        <stop offset="0" stop-color="${a}" stop-opacity="0.95" />
        <stop offset="1" stop-color="${b}" stop-opacity="0.95" />
      </radialGradient>`
    )
    .join('');
  const dims = variant === 'banner' ? 'width="100%"' : `width="${size}" height="${size}"`;
  return `<svg class="droplets droplets-${variant} ${className}" viewBox="${box}" ${dims} ${a11y} xmlns="http://www.w3.org/2000/svg">
    <defs>${grads}</defs>
    ${LAYOUTS[variant].map((d, i) => drop(id, d, i)).join('')}
  </svg>`;
}
