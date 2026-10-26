// Drawn product and portrait illustrations (inline SVG, no image files).
// They are illustrations, not photographs. To use real photos instead, put
// image files in assets/photos/ and list their names in PHOTO_FILES below;
// the app then shows them in these spots and falls back to the drawings.

export const PHOTO_FILES = {
  faces: [], // e.g. ['face1.jpg', 'face2.jpg']
  products: {}, // e.g. { serum: 'serum.jpg', lotion: 'lotion.jpg', oil: 'oil.jpg', sunscreen: 'sunscreen.jpg' }
};

let n = 0;
const uid = (p) => `${p}${++n}`;

// ---------- products (viewBox 0 0 120 180) ----------
const PRODUCTS = {
  lotion: { name: 'Lotion', body: ['#fffaf4', '#f0d9c8'], label: 'Lotion', tint: '#7b1e3a' },
  cleanser: { name: 'Cleanser', body: ['#ffe8ef', '#f1a9c2'], label: 'Cleanser', tint: '#9b2c4f' },
};

function pump(id, kind) {
  const p = PRODUCTS[kind];
  return `<defs>
    <linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="${p.body[0]}"/><stop offset=".55" stop-color="${p.body[1]}"/><stop offset="1" stop-color="${p.body[0]}" stop-opacity=".9"/></linearGradient>
    <linearGradient id="${id}c" x1="0" x2="1"><stop offset="0" stop-color="#5a0f2a"/><stop offset=".5" stop-color="#b8456c"/><stop offset="1" stop-color="#3d0a1c"/></linearGradient>
  </defs>
  <ellipse cx="60" cy="168" rx="38" ry="6" fill="#4a0e22" opacity=".22"/>
  <rect x="28" y="64" width="64" height="104" rx="20" fill="url(#${id}b)"/>
  <rect x="48" y="52" width="24" height="16" rx="4" fill="url(#${id}c)"/>
  <rect x="56" y="36" width="8" height="18" fill="#d9c5cc"/>
  <path d="M42 26h30a8 8 0 0 1 8 8v2H42a6 6 0 0 1 0-12Z" fill="url(#${id}c)"/>
  <path d="M80 30h18" stroke="#b8456c" stroke-width="6" stroke-linecap="round"/>
  <rect x="36" y="94" width="48" height="52" rx="8" fill="#fff" opacity=".96"/>
  <rect x="36" y="94" width="48" height="12" rx="6" fill="${p.tint}"/>
  <circle cx="60" cy="122" r="7" fill="#f4a6c1"/><circle cx="58" cy="120" r="2" fill="#fff"/>
  <text x="60" y="140" text-anchor="middle" font-size="9" font-weight="700" fill="${p.tint}" font-family="system-ui,sans-serif">${p.label}</text>
  <ellipse cx="38" cy="112" rx="4" ry="38" fill="#fff" opacity=".55"/>`;
}

function dropper(id, { glass, glass2, label, tint, bulb }) {
  return `<defs>
    <linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="${glass}"/><stop offset=".6" stop-color="${glass2}"/><stop offset="1" stop-color="${glass}"/></linearGradient>
    <linearGradient id="${id}c" x1="0" x2="1"><stop offset="0" stop-color="#5a0f2a"/><stop offset=".5" stop-color="#b8456c"/><stop offset="1" stop-color="#3d0a1c"/></linearGradient>
    <linearGradient id="${id}r" x1="0" x2="1"><stop offset="0" stop-color="${bulb[0]}"/><stop offset="1" stop-color="${bulb[1]}"/></linearGradient>
  </defs>
  <ellipse cx="60" cy="168" rx="34" ry="6" fill="#4a0e22" opacity=".22"/>
  <path d="M30 100c0-16 12-22 30-22s30 6 30 22v56a12 12 0 0 1-12 12H42a12 12 0 0 1-12-12Z" fill="url(#${id}g)"/>
  <rect x="50" y="62" width="20" height="20" fill="url(#${id}g)"/>
  <rect x="44" y="52" width="32" height="14" rx="4" fill="url(#${id}c)"/>
  <path d="M52 52V30c0-10 4-16 8-16s8 6 8 16v22Z" fill="url(#${id}r)"/>
  <rect x="57" y="82" width="6" height="52" rx="3" fill="#fff" opacity=".35"/>
  <rect x="36" y="104" width="48" height="46" rx="8" fill="#fff" opacity=".95"/>
  <rect x="36" y="104" width="48" height="11" rx="5" fill="${tint}"/>
  <text x="60" y="134" text-anchor="middle" font-size="9" font-weight="700" fill="${tint}" font-family="system-ui,sans-serif">${label}</text>
  <text x="60" y="145" text-anchor="middle" font-size="5.5" fill="#6b4a55" font-family="system-ui,sans-serif">30 ml</text>
  <ellipse cx="38" cy="124" rx="3.5" ry="30" fill="#fff" opacity=".5"/>`;
}

function sunscreen(id) {
  return `<defs>
    <linearGradient id="${id}t" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f6e6ea"/><stop offset="1" stop-color="#e3c3cc"/></linearGradient>
    <linearGradient id="${id}c" x1="0" x2="1"><stop offset="0" stop-color="#5a0f2a"/><stop offset=".5" stop-color="#b8456c"/><stop offset="1" stop-color="#3d0a1c"/></linearGradient>
  </defs>
  <ellipse cx="60" cy="170" rx="36" ry="5" fill="#4a0e22" opacity=".22"/>
  <rect x="42" y="14" width="36" height="26" rx="5" fill="url(#${id}c)"/>
  <path d="M46 40h28l12 112H34Z" fill="url(#${id}t)"/>
  <path d="M32 152h56v14H32Z" fill="#e9d2d9"/>
  ${[0, 1, 2, 3, 4].map((i) => `<path d="M${34 + i * 0}  ${154 + i * 2.4}h52" stroke="#caa9b4" stroke-width=".8"/>`).join('')}
  <path d="M40 86h40l3 26H37Z" fill="#7b1e3a"/>
  <circle cx="60" cy="68" r="8" fill="#f4a6c1"/>
  ${[...Array(8)].map((_, i) => `<rect x="59" y="54" width="2" height="5" rx="1" fill="#d9557f" transform="rotate(${i * 45} 60 68)"/>`).join('')}
  <text x="60" y="103" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">SPF 50</text>
  <text x="60" y="128" text-anchor="middle" font-size="8" font-weight="700" fill="#7b1e3a" font-family="system-ui,sans-serif">Sunscreen</text>
  <text x="60" y="139" text-anchor="middle" font-size="5.5" fill="#6b4a55" font-family="system-ui,sans-serif">Mineral · 50 ml</text>
  <ellipse cx="50" cy="96" rx="3" ry="44" fill="#fff" opacity=".6"/>`;
}

export const PRODUCT_INFO = {
  cleanser: { title: 'Gentle cleanser', role: 'Step 1 · Cleanse', note: 'Removes dirt and sunscreen without stripping.' },
  serum: { title: 'Treatment serum', role: 'Step 2 · Treat', note: 'Niacinamide, centella or azelaic acid for your concern.' },
  oil: { title: 'Face oil', role: 'Optional · Seal', note: 'A few drops at night to lock in moisture.' },
  lotion: { title: 'Barrier moisturizer', role: 'Step 3 · Moisturize', note: 'Ceramides and glycerin to repair the skin barrier.' },
  sunscreen: { title: 'Mineral sunscreen', role: 'Step 4 · Protect', note: 'SPF 30+ every morning, the most important step.' },
};

// Inner drawing of one product in a 120x180 box.
export function productInner(kind, id = uid('pr')) {
  if (kind === 'lotion' || kind === 'cleanser') return pump(id, kind);
  if (kind === 'oil') return dropper(id, { glass: '#b8651a', glass2: '#e8a64a', label: 'Face Oil', tint: '#8a4a0e', bulb: ['#3d0a1c', '#7b1e3a'] });
  if (kind === 'serum') return dropper(id, { glass: '#e394ae', glass2: '#fbd9e4', label: 'Serum', tint: '#9b2c4f', bulb: ['#f7f0f2', '#d9c5cc'] });
  if (kind === 'sunscreen') return sunscreen(id);
  return '';
}

export function product(kind, { className = '', label = '' } = {}) {
  const alt = PHOTO_FILES.products[kind];
  if (alt) return `<img class="photo ${className}" src="assets/photos/${alt}" alt="${label}" loading="lazy" />`;
  return `<svg class="pic ${className}" viewBox="0 0 120 180" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"'} xmlns="http://www.w3.org/2000/svg">${productInner(kind)}</svg>`;
}

// A shelf of products side by side (viewBox 0 0 400 180).
export function shelf(kinds = ['cleanser', 'serum', 'oil', 'lotion', 'sunscreen'], { className = '' } = {}) {
  const w = 400 / kinds.length;
  return `<svg class="pic shelf ${className}" viewBox="0 0 400 190" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="172" width="388" height="8" rx="4" fill="#fff" opacity=".35"/>
    ${kinds.map((k, i) => `<g class="shelf-item" style="animation-delay:${i * 0.35}s" transform="translate(${i * w + (w - 100) / 2} ${4 + (i % 2) * 4}) scale(.83)">${productInner(k)}</g>`).join('')}
  </svg>`;
}

// ---------- portraits (viewBox 0 0 120 140) ----------
export const TONES = [
  { name: 'Very light', skin: '#f6d9c6', shade: '#e8b99f', lip: '#d9818f' },
  { name: 'Light', skin: '#efc3a2', shade: '#d9a07f', lip: '#c9707e' },
  { name: 'Medium', skin: '#d79f78', shade: '#b97f5a', lip: '#a95b60' },
  { name: 'Tan', skin: '#b87a52', shade: '#975c3a', lip: '#8f4650' },
  { name: 'Brown', skin: '#8d5a3b', shade: '#6f4328', lip: '#6e3438' },
  { name: 'Deep', skin: '#5b3623', shade: '#432615', lip: '#5a2a30' },
];

const HAIR = {
  afro: (c) => `<circle cx="60" cy="52" r="42" fill="${c}"/>`,
  braids: (c) => `<path d="M26 60c0-30 16-46 34-46s34 16 34 46c-10-14-20-20-34-20s-24 6-34 20Z" fill="${c}"/>${[22, 28, 92, 98].map((x, i) => `<rect x="${x - 3}" y="56" width="6" height="${62 - (i % 2) * 8}" rx="3" fill="${c}"/>`).join('')}`,
  bob: (c) => `<path d="M24 98c-6-44 8-84 36-84s42 40 36 84c-6 6-12 6-16 0V56H40v42c-4 6-10 6-16 0Z" fill="${c}"/>`,
  bun: (c) => `<circle cx="60" cy="14" r="13" fill="${c}"/><path d="M28 62c0-30 14-44 32-44s32 14 32 44c-8-14-18-20-32-20S36 48 28 62Z" fill="${c}"/>`,
  hijab: (c) => `<path d="M22 130c-8-50-4-114 38-114s46 64 38 114Z" fill="${c}"/>`,
  short: (c) => `<path d="M30 58c-2-26 10-42 30-42s32 16 30 42c-8-10-14-14-30-14S38 48 30 58Z" fill="${c}"/>`,
};
const CLOTHES = ['#7b1e3a', '#f4a6c1', '#fff4f7', '#9b2c4f', '#d9557f', '#4a0e22'];

export function portrait({ tone = 3, hair = 'afro', hairColor = '#1c0f0a', clothes, className = '', label = '' } = {}) {
  const t = TONES[Math.max(0, Math.min(5, tone))];
  const id = uid('pt');
  const cl = clothes || CLOTHES[tone % CLOTHES.length];
  const back = hair === 'afro' || hair === 'bob' || hair === 'hijab' ? HAIR[hair](hairColor) : '';
  const front = hair === 'braids' || hair === 'bun' || hair === 'short' ? HAIR[hair](hairColor) : '';
  const hijabFace = hair === 'hijab';
  return `<svg class="pic portrait ${className}" viewBox="0 0 120 140" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"'} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${id}f" cx="42%" cy="35%" r="70%"><stop offset="0" stop-color="${t.skin}"/><stop offset="1" stop-color="${t.shade}"/></radialGradient>
      <linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fce8ef"/><stop offset="1" stop-color="#f4a6c1"/></linearGradient>
    </defs>
    <rect width="120" height="140" fill="url(#${id}bg)"/>
    ${back}
    <path d="M12 140c2-26 22-38 48-38s46 12 48 38Z" fill="${cl}"/>
    <rect x="50" y="82" width="20" height="26" rx="8" fill="${t.shade}"/>
    ${hair === 'hijab' ? '' : `<ellipse cx="33" cy="64" rx="5" ry="8" fill="url(#${id}f)"/><ellipse cx="87" cy="64" rx="5" ry="8" fill="url(#${id}f)"/>`}
    <ellipse cx="60" cy="62" rx="27" ry="33" fill="url(#${id}f)"/>
    ${hijabFace ? `<path d="M30 62c0-30 12-48 30-48s30 18 30 48c-6-16-16-22-30-22s-24 6-30 22Z" fill="${hairColor}"/>` : ''}
    ${front}
    <ellipse cx="46" cy="72" rx="6" ry="4" fill="#e0707f" opacity=".22"/><ellipse cx="74" cy="72" rx="6" ry="4" fill="#e0707f" opacity=".22"/>
    <ellipse class="a-blink" cx="48" cy="62" rx="5.5" ry="3.2" fill="#fff"/><circle cx="48" cy="62" r="2.4" fill="#2a1410"/><circle cx="47.2" cy="61.2" r=".8" fill="#fff"/>
    <ellipse class="a-blink" cx="72" cy="62" rx="5.5" ry="3.2" fill="#fff"/><circle cx="72" cy="62" r="2.4" fill="#2a1410"/><circle cx="71.2" cy="61.2" r=".8" fill="#fff"/>
    <path d="M41 56c3-3 8-3 12-1M67 55c4-2 9-2 12 1" stroke="#2a1410" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M60 64c-2 6-3 10-1 12 2 1 4 1 6 0" stroke="${t.shade}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M51 85c5 5 13 5 18 0c-2 6-16 6-18 0Z" fill="${t.lip}"/><path d="M52 84c4 2 12 2 16 0" stroke="${t.lip}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="52" cy="50" rx="9" ry="4" fill="#fff" opacity=".16"/>
  </svg>`;
}

// Portrait that matches a measured tone category from a scan.
export function toneIndex(category = '') {
  const c = category.toLowerCase();
  if (c.startsWith('very light')) return 0;
  if (c.startsWith('light')) return 1;
  if (c.startsWith('intermediate')) return 2;
  if (c.startsWith('tan')) return 3;
  if (c.startsWith('brown')) return 4;
  if (c.startsWith('deep')) return 5;
  return 3;
}

export const PEOPLE = [
  { tone: 5, hair: 'afro', label: 'Deep skin' },
  { tone: 3, hair: 'braids', label: 'Tan skin' },
  { tone: 0, hair: 'bob', hairColor: '#8a5a2b', label: 'Very light skin' },
  { tone: 4, hair: 'hijab', hairColor: '#7b1e3a', label: 'Brown skin' },
  { tone: 2, hair: 'bun', label: 'Medium skin' },
  { tone: 1, hair: 'short', hairColor: '#3b2416', label: 'Light skin' },
];

export function personAt(i, opts = {}) {
  const p = PEOPLE[i % PEOPLE.length];
  const photo = PHOTO_FILES.faces[i % Math.max(1, PHOTO_FILES.faces.length)];
  if (photo) return `<img class="photo portrait ${opts.className || ''}" src="assets/photos/${photo}" alt="${p.label}" loading="lazy" />`;
  return portrait({ ...p, ...opts });
}

// Which product a routine step uses.
export const stepProduct = (step = '') => ({ cleanse: 'cleanser', treat: 'serum', moisturize: 'lotion', protect: 'sunscreen' })[String(step).toLowerCase()] || null;
