// Parses INCI ingredient lists and explains why a product may have worked or not.
import { INGREDIENTS, ONE_PERCENT_MARKERS } from './data/ingredients-db.js';
import { CONCERNS } from './data/knowledge.js';

const ALIAS_INDEX = new Map();
for (const ing of INGREDIENTS) {
  for (const a of ing.aliases) ALIAS_INDEX.set(normalize(a), ing);
}
// Longest aliases first so "sodium laureth sulfate" wins over "sodium lauryl".
// Aliases too generic to match inside longer names ("behenyl alcohol" is not drying alcohol).
const EXACT_ONLY = new Set(['alcohol', 'water', 'aqua', 'eau', 'mit', 'mci', 'sls', 'sles']);
const ALIASES_BY_LENGTH = [...ALIAS_INDEX.keys()].filter((a) => !EXACT_ONLY.has(a)).sort((a, b) => b.length - a.length);

export const OUTCOMES = {
  worked: 'It worked well',
  'no-change': 'No noticeable change',
  breakout: 'It broke me out',
  irritation: 'It irritated, stung or burned',
  allergy: 'Allergic reaction (rash, hives, swelling)',
  dryness: 'It dried my skin out',
};

export function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.\s]+$/, '')
    .trim();
}

export function parseInci(text) {
  if (!text) return [];
  let t = String(text)
    .replace(/^\s*(ingredients|ingrédients|inci)\s*[:\-]\s*/i, '')
    .replace(/\(\s*and\s*\)/gi, ',')
    .replace(/[\n;•·|]/g, ',');
  // "May contain" sections list colorants that may or may not be present.
  t = t.replace(/[\[(]?\s*\+\/-|may contain\s*:?/gi, ',');
  return t
    .split(',')
    .map((s) => normalize(s.replace(/[\[\]]/g, '').replace(/^\d+(\.\d+)?\s*%\s*/, '')))
    .filter((s) => s && s.length > 1);
}

export function matchIngredient(raw) {
  const n = normalize(raw);
  if (ALIAS_INDEX.has(n)) return ALIAS_INDEX.get(n);
  // Strip parenthetical common names: "cocos nucifera (coconut) oil" -> both forms tried.
  const noParen = n.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (ALIAS_INDEX.has(noParen)) return ALIAS_INDEX.get(noParen);
  // Partial match on whole words, e.g. "ceramide np (5%)" or "limonene*".
  for (const alias of ALIASES_BY_LENGTH) {
    if (alias.length < 4) continue;
    const re = new RegExp(`(^|[^a-z])${escapeRe(alias)}([^a-z]|$)`);
    if (re.test(n)) return ALIAS_INDEX.get(alias);
  }
  return null;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Rough concentration band from list position. INCI lists are ordered by
// amount down to about 1%, then anything goes.
export function concentrationBand(index, onePercentIndex) {
  if (index < 5) return 'high';
  if (onePercentIndex === -1 || index < onePercentIndex) return 'medium';
  return 'low';
}

export function analyzeIngredients(text) {
  const list = parseInci(text);
  const onePercentIndex = list.findIndex((x) => ONE_PERCENT_MARKERS.includes(x));
  const items = list.map((raw, index) => {
    const ing = matchIngredient(raw);
    return { raw, index, ing, band: concentrationBand(index, onePercentIndex) };
  });
  return { list, items, onePercentIndex };
}

const has = (item, tag) => item.ing && item.ing.tags.includes(tag);
const nameOf = (item) => (item.ing ? item.ing.name : item.raw);
const bandText = { high: 'near the top of the list (higher amount)', medium: 'in the middle of the list', low: 'low in the list (small amount)' };

function dedupe(items) {
  const seen = new Set();
  return items.filter((it) => {
    const k = it.ing ? it.ing.name : it.raw;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Explains a single product result against the user's profile.
// product: { name, ingredients, outcome, weeksUsed }
// profile: { skinType, concerns[], sensitive, bleachingHistory, pregnant }
export function explainProduct(product, profile = {}) {
  const { items } = analyzeIngredients(product.ingredients);
  const matched = items.filter((i) => i.ing);
  const unknown = items.filter((i) => !i.ing).map((i) => i.raw);
  const reasons = [];
  const good = [];
  const watch = [];
  const outcome = product.outcome;
  const weeks = Number(product.weeksUsed) || 0;
  const sensitive = profile.skinType === 'sensitive' || profile.sensitive || profile.bleachingHistory;

  const comedogenic = dedupe(matched.filter((i) => i.ing.comedogenic >= 3 && i.band !== 'low'));
  const irritants = dedupe(matched.filter((i) => i.ing.irritancy >= 2 && !(i.band === 'low' && i.ing.irritancy < 3)));
  const fragrance = dedupe(matched.filter((i) => has(i, 'fragrance') || has(i, 'essential-oil')));
  const allergens = dedupe(matched.filter((i) => has(i, 'allergen')));
  const actives = dedupe(matched.filter((i) => ['retinoid', 'aha', 'bha', 'exfoliant', 'anti-acne', 'brightening'].some((t) => has(i, t))));
  const turnover = actives.filter((i) => has(i, 'retinoid') || has(i, 'aha') || has(i, 'bha'));
  const drying = dedupe(matched.filter((i) => (has(i, 'drying-alcohol') && i.index < 6) || has(i, 'surfactant-harsh') || has(i, 'astringent')));
  const soothing = dedupe(matched.filter((i) => has(i, 'soothing') || has(i, 'barrier')));
  const dangerous = dedupe(matched.filter((i) => has(i, 'toxic') || has(i, 'steroid') || i.ing.name === 'Hydroquinone'));

  const concernHelpers = [];
  for (const c of profile.concerns || []) {
    const helps = CONCERNS[c]?.helps || [];
    for (const it of matched) if (helps.includes(it.ing.name)) concernHelpers.push({ item: it, concern: CONCERNS[c].label });
  }

  for (const d of dangerous) {
    watch.push(`${nameOf(d)}: ${d.ing.caution}`);
  }

  if (outcome === 'breakout') {
    if (turnover.length && weeks <= 6) {
      reasons.push(
        `It contains ${turnover.map(nameOf).join(', ')}, which speed up skin turnover. Breakouts in your usual spots during the first 4 to 6 weeks can be "purging" and often settle. Breakouts in new places, or lasting past 6 weeks, point to a real reaction.`
      );
    }
    for (const c of comedogenic) {
      reasons.push(`${nameOf(c)} is rated ${c.ing.comedogenic}/5 for clogging pores and sits ${bandText[c.band]}. ${c.ing.caution}`.trim());
    }
    const heavy = dedupe(matched.filter((i) => has(i, 'occlusive') && i.index < 6 && i.ing.comedogenic >= 1));
    if (heavy.length && ['oily', 'combination'].includes(profile.skinType)) {
      reasons.push(`Rich occlusives (${heavy.map(nameOf).join(', ')}) high in the formula can feel too heavy for ${profile.skinType} skin and trap oil.`);
    }
    if (fragrance.length) reasons.push(`Fragrance or essential oils (${fragrance.map(nameOf).join(', ')}) can inflame skin and trigger bumps that look like acne.`);
    if (dangerous.some((d) => has(d, 'steroid'))) reasons.push('Steroid creams commonly cause "steroid acne": many small, even-sized bumps.');
  }

  if (outcome === 'irritation' || outcome === 'dryness') {
    for (const i of irritants) reasons.push(`${nameOf(i)} is a common irritant (${i.ing.irritancy}/3), ${bandText[i.band]}. ${i.ing.caution}`.trim());
    for (const d of drying) if (!irritants.includes(d)) reasons.push(`${nameOf(d)} can strip natural oils and leave skin dry or tight.`);
    if (turnover.length > 1) reasons.push(`It combines several strong actives (${turnover.map(nameOf).join(', ')}), which raises the chance of irritation.`);
    if (sensitive && actives.length) reasons.push('Your profile notes sensitive or previously bleached skin, which reacts more easily to actives. Rebuild the barrier first and reintroduce actives slowly.');
  }

  if (outcome === 'allergy') {
    if (allergens.length) {
      reasons.push(`It contains known contact allergens: ${allergens.map(nameOf).join(', ')}. A dermatologist can patch-test to confirm which one.`);
    } else {
      reasons.push('No common allergens from our list were found. Allergies can be caused by any ingredient, including botanical extracts we could not identify.');
    }
    watch.push('Swelling of the lips, eyes or throat, or trouble breathing, needs emergency care.');
  }

  if (outcome === 'worked') {
    for (const h of dedupe(concernHelpers.map((x) => x.item))) {
      const forC = concernHelpers.filter((x) => x.item === h).map((x) => x.concern.toLowerCase());
      good.push(`${nameOf(h)} targets ${[...new Set(forC)].join(' and ')}. ${h.ing.benefit}`);
    }
    for (const s of soothing.slice(0, 4)) if (!concernHelpers.some((x) => x.item.ing === s.ing)) good.push(`${nameOf(s)}: ${s.ing.benefit}`);
    if (!fragrance.length) good.push('It is free of fragrance and essential oils, so there is less to irritate your skin.');
    if (!comedogenic.length) good.push('No high pore-clogging ingredients were found in meaningful amounts.');
    if (!good.length) good.push('We could not pin down a single hero ingredient; the overall formula suits your skin. Keep it.');
  }

  if (outcome === 'no-change') {
    if (!actives.length) reasons.push('It has no strong active ingredients for treating a concern, so it mainly moisturizes or cleanses.');
    const lowActives = actives.filter((a) => a.band === 'low');
    if (lowActives.length) reasons.push(`${lowActives.map(nameOf).join(', ')} appear low in the list, so the amount may be too small to make a visible difference.`);
    if (weeks && weeks < 8) reasons.push(`You used it for ${weeks} week${weeks === 1 ? '' : 's'}. Most actives need 8 to 12 weeks (pigment and retinoids up to 12 to 24) to show results.`);
    if (actives.length && !concernHelpers.length && (profile.concerns || []).length) {
      reasons.push(`Its actives (${actives.map(nameOf).join(', ')}) do not directly target your main concerns.`);
    }
  }

  if (!reasons.length && outcome !== 'worked') {
    reasons.push('Nothing in our ingredient list stands out as a likely cause. It may be the combination with other products, the texture, how often it was used, or an ingredient we could not identify.');
  }

  // Ingredients worth flagging regardless of outcome.
  if (profile.pregnant) {
    const preg = dedupe(matched.filter((i) => i.ing.pregnancyCaution));
    if (preg.length) watch.push(`Pregnancy: ask your doctor before using ${preg.map(nameOf).join(', ')}.`);
  }
  if (profile.bleachingHistory && outcome !== 'worked') {
    const harsh = dedupe(matched.filter((i) => has(i, 'bleaching') || has(i, 'aha') || (has(i, 'fragrance') && i.band !== 'low')));
    if (harsh.length) watch.push(`With a history of bleaching, avoid ${harsh.map(nameOf).join(', ')} for now and focus on soothing and barrier repair.`);
  }

  return {
    matched: dedupe(matched).map((i) => ({ name: i.ing.name, raw: i.raw, band: i.band, tags: i.ing.tags })),
    unknown,
    reasons,
    good,
    watch: [...new Set(watch)],
  };
}

// Looks across all logged products for ingredients that keep showing up in
// bad results (likely triggers) or good ones (likely friends).
export function crossProductInsights(products) {
  const bad = new Set(['breakout', 'irritation', 'allergy', 'dryness']);
  const counts = new Map();
  for (const p of products) {
    const names = new Set(analyzeIngredients(p.ingredients).items.filter((i) => i.ing && !['base', 'texture', 'ph', 'chelator'].some((t) => i.ing.tags.includes(t))).map((i) => i.ing.name));
    for (const n of names) {
      const c = counts.get(n) || { name: n, bad: 0, good: 0, products: [] };
      if (bad.has(p.outcome)) c.bad++;
      if (p.outcome === 'worked') c.good++;
      c.products.push(p.name);
      counts.set(n, c);
    }
  }
  const all = [...counts.values()];
  return {
    suspects: all.filter((c) => c.bad >= 2 && c.good === 0).sort((a, b) => b.bad - a.bad),
    friends: all.filter((c) => c.good >= 2 && c.bad === 0).sort((a, b) => b.good - a.good),
  };
}

export function lookupIngredient(query) {
  const ing = matchIngredient(query);
  if (ing) return ing;
  const q = normalize(query);
  return INGREDIENTS.find((x) => normalize(x.name).includes(q)) || null;
}
