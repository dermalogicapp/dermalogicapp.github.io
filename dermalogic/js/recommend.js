// Builds a personalized routine from the user's profile and latest face analysis.
import { CONCERNS, SKIN_TYPES, BODY_CARE, BLEACHING_PLAN } from './data/knowledge.js';
import { INGREDIENTS } from './data/ingredients-db.js';

const ING_BY_NAME = new Map(INGREDIENTS.map((i) => [i.name, i]));
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const TURNOVER = new Set(['Retinol', 'Tretinoin / adapalene', 'Glycolic acid', 'Salicylic acid', 'Lactic acid', 'Mandelic acid', 'Benzoyl peroxide']);

export function mergedConcerns(profile = {}, analysis = null) {
  const scores = new Map();
  for (const c of profile.concerns || []) scores.set(c, Math.max(scores.get(c) || 0, 70));
  if (analysis?.concerns) {
    for (const [k, v] of Object.entries(analysis.concerns)) {
      if (v.level !== 'low' && CONCERNS[k]) scores.set(k, Math.max(scores.get(k) || 0, v.score));
    }
  }
  if (profile.skinType === 'dry' && !scores.has('dryness')) scores.set('dryness', 40);
  if (profile.skinType === 'oily' && !scores.has('oiliness')) scores.set('oiliness', 40);
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

function pickIngredients(concerns, { pregnant, gentle }) {
  const picks = [];
  for (const c of concerns) {
    for (const name of CONCERNS[c]?.helps || []) {
      const ing = ING_BY_NAME.get(name);
      if (!ing) continue;
      if (pregnant && ing.pregnancyCaution) continue;
      if (gentle && (ing.irritancy >= 2 || TURNOVER.has(name))) continue;
      if (!picks.find((p) => p.name === name)) picks.push({ name, reason: CONCERNS[c].label, benefit: ing.benefit });
    }
  }
  return picks;
}

export function buildPlan(profile = {}, analysis = null) {
  const skinType = SKIN_TYPES[profile.skinType] || SKIN_TYPES.normal;
  const concerns = mergedConcerns(profile, analysis);
  const bleaching = !!profile.bleachingHistory;
  const gentle = bleaching || profile.skinType === 'sensitive';
  const pregnant = !!profile.pregnant;
  // After bleaching, tone-evening actives wait until phase 3 of the repair plan,
  // so the key ingredients are soothing and barrier ones instead.
  const keyIngredients = bleaching
    ? ['Centella asiatica', 'Panthenol', 'Ceramides', 'Glycerin', 'Niacinamide', 'Zinc oxide'].map((name) => ({
        name,
        reason: name === 'Zinc oxide' ? 'Sun protection' : 'Barrier repair and soothing',
        benefit: ING_BY_NAME.get(name).benefit,
      }))
    : pickIngredients(concerns, { pregnant, gentle }).slice(0, 6);
  const notes = [];
  const avoid = new Set();

  // One treatment step per routine keeps irritation risk down.
  const treatmentAM = keyIngredients.find((k) => ['Niacinamide', 'Vitamin C derivatives', 'Azelaic acid', 'Tranexamic acid', 'Alpha arbutin', 'Centella asiatica', 'Hyaluronic acid', 'Zinc PCA', 'Caffeine', 'Licorice root', 'Green tea', 'Panthenol'].includes(k.name));
  const treatmentPM = bleaching ? null : keyIngredients.find((k) => k !== treatmentAM) || null;

  const am = [
    { step: 'Cleanse', detail: gentle ? 'Rinse with lukewarm water or use a fragrance-free gentle cleanser.' : `Use a ${skinType.cleanser}.` },
  ];
  if (treatmentAM) am.push({ step: 'Treat', detail: `Serum with ${treatmentAM.name.toLowerCase()} for ${treatmentAM.reason.toLowerCase()}.` });
  am.push({ step: 'Moisturize', detail: cap(gentle ? SKIN_TYPES.sensitive.moisturizer : skinType.moisturizer) });
  am.push({
    step: 'Protect',
    detail:
      bleaching || concerns.includes('hyperpigmentation')
        ? 'Mineral or tinted sunscreen SPF 30+ with iron oxides; reapply every 2 hours outdoors.'
        : `${cap(skinType.sunscreen)}; reapply every 2 hours outdoors.`,
  });

  const pm = [{ step: 'Cleanse', detail: `Use a ${gentle ? SKIN_TYPES.sensitive.cleanser : skinType.cleanser}. Double cleanse if you wore sunscreen or makeup.` }];
  if (treatmentPM) {
    const strong = TURNOVER.has(treatmentPM.name);
    pm.push({
      step: 'Treat',
      detail: `${treatmentPM.name} for ${treatmentPM.reason.toLowerCase()}${strong ? ', starting 2 nights a week and building up slowly' : ''}.`,
    });
    if (strong) notes.push(`Do not use ${treatmentPM.name.toLowerCase()} on the same night as other exfoliating acids or retinoids.`);
  }
  pm.push({ step: 'Moisturize', detail: profile.skinType === 'dry' || bleaching ? 'Richer barrier cream with ceramides; seal dry patches with petrolatum.' : cap(skinType.moisturizer) });

  const weekly = [];
  if (!gentle && (concerns.includes('texture') || concerns.includes('acne') || concerns.includes('oiliness'))) {
    weekly.push('Gentle chemical exfoliant (mandelic or lactic acid) 1 to 2 times a week on nights without other actives.');
  }
  if (concerns.includes('dryness') || bleaching) weekly.push('Hydrating, fragrance-free sheet mask or overnight mask once or twice a week.');

  if (profile.skinType === 'sensitive') ['Fragrance', 'Essential oils', 'Alcohol denat.'].forEach((x) => avoid.add(x));
  if (concerns.includes('acne')) ['Coconut oil', 'Cocoa butter', 'Isopropyl myristate'].forEach((x) => avoid.add(x));
  if (pregnant) {
    ['Retinol', 'Tretinoin / adapalene', 'Hydroquinone', 'High-strength salicylic acid peels'].forEach((x) => avoid.add(x));
    notes.push('Pregnancy: azelaic acid, niacinamide, vitamin C and mineral sunscreen are generally considered safe options. Check with your doctor.');
  }

  let bleachingPlan = null;
  if (bleaching) {
    BLEACHING_PLAN.avoid.forEach((x) => avoid.add(x));
    bleachingPlan = { ...BLEACHING_PLAN, personal: bleachingNotes(profile) };
    notes.unshift('Because you have a history of skin bleaching, your routine focuses on soothing and repairing the barrier first. Strong actives and tone-evening treatments are left out on purpose until your skin is calm (see phase 3 below).');
  }

  const body = BODY_CARE[profile.bodyType] || [];

  if (analysis?.confidence === 'low') notes.push('Your last scan had poor lighting, so its results were given less weight. Try rescanning in daylight.');

  return {
    skinType: skinType.label,
    concerns: concerns.map((c) => ({ id: c, label: CONCERNS[c].label, tips: CONCERNS[c].tips })),
    keyIngredients,
    am,
    pm,
    weekly,
    avoid: [...avoid],
    notes,
    body,
    bleachingPlan,
  };
}

function bleachingNotes(profile) {
  const out = [];
  const used = profile.bleachingProducts || [];
  if (used.includes('mercury') || used.includes('unknown')) {
    out.push('Unlabelled or imported "whitening" creams sometimes contain mercury. If you used them for a long time, ask a doctor about a simple blood or urine test.');
  }
  if (used.includes('steroid')) {
    out.push('Steroid creams (such as clobetasol or betamethasone) used on the face for a long time can thin the skin. If you are still using one, do not stop suddenly: a doctor can help you taper it to avoid a flare.');
  }
  if (used.includes('hydroquinone')) {
    out.push('Long-term hydroquinone can cause ochronosis, a blue-black darkening that gets worse with more hydroquinone. Stop using it and see a dermatologist if you notice this.');
  }
  if (used.includes('injections')) {
    out.push('Glutathione injections or drips for lightening are not proven safe. Talk to a doctor if you had side effects.');
  }
  if (profile.bleachingStopped === 'current') {
    out.push('You are still using lightening products. Stopping them is the first step to letting your skin recover.');
  } else if (profile.bleachingStopped === '<3m') {
    out.push('You stopped recently. Skin often looks blotchy or darker for a few months while it recovers; that is expected, and sunscreen helps a lot.');
  }
  return out;
}
