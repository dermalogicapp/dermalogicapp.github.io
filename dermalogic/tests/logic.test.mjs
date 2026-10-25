import { test } from 'node:test';
import assert from 'node:assert/strict';

import { srgbToLab, itaAngle, classifyTone, analyzeRegions, labToHex, sampleRegion } from '../js/analysis.js';
import { parseInci, matchIngredient, explainProduct, crossProductInsights } from '../js/ingredients.js';
import { buildPlan } from '../js/recommend.js';
import { respond } from '../js/chatbot.js';
import { dueReminders, followUpAdvice, dueFollowUps } from '../js/reminders.js';
import { lifestyleInsights } from '../js/lifestyle.js';

// Builds Lab samples from an RGB color with small random variation.
function samples(rgb, n = 400, jitter = 3, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 2 * jitter;
  const data = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    data[i * 4] = rgb[0] + rnd();
    data[i * 4 + 1] = rgb[1] + rnd();
    data[i * 4 + 2] = rgb[2] + rnd();
    data[i * 4 + 3] = 255;
  }
  return sampleRegion(data);
}
const face = (rgb, extra = {}) => ({
  forehead: samples(rgb, 400, 3, 2),
  leftCheek: samples(rgb, 400, 3, 3),
  rightCheek: samples(rgb, 400, 3, 4),
  nose: samples(rgb, 300, 3, 5),
  chin: samples(rgb, 300, 3, 6),
  underEyeLeft: samples(rgb, 100, 3, 7),
  underEyeRight: samples(rgb, 100, 3, 8),
  ...extra,
});

test('Lab conversion matches reference white and black', () => {
  const [L, a, b] = srgbToLab(255, 255, 255);
  assert.ok(Math.abs(L - 100) < 0.5 && Math.abs(a) < 0.5 && Math.abs(b) < 0.5);
  assert.ok(srgbToLab(0, 0, 0)[0] < 0.5);
});

test('Lab to hex round trip is close', () => {
  const lab = srgbToLab(198, 134, 66);
  assert.equal(labToHex(...lab), '#c68642');
});

test('ITA classifies light and deep skin tones', () => {
  const light = srgbToLab(241, 214, 196);
  const deep = srgbToLab(92, 56, 40);
  assert.match(classifyTone(itaAngle(light[0], light[2])).label, /light/i);
  assert.match(classifyTone(itaAngle(deep[0], deep[2])).label, /deep|brown/i);
});

test('analyzeRegions on an even face reports low concerns', () => {
  const r = analyzeRegions(face([180, 130, 100]));
  assert.ok(r.tone.category);
  assert.equal(r.concerns.hyperpigmentation.level, 'low');
  assert.equal(r.concerns.acne.level, 'low');
  assert.equal(r.warnings.length, 0);
});

test('analyzeRegions picks up red patches on the cheeks', () => {
  const base = [180, 130, 100];
  const redCheek = [...samples(base, 250, 3, 9), ...samples([200, 95, 90], 150, 3, 10)];
  const r = analyzeRegions(face(base, { leftCheek: redCheek, rightCheek: redCheek }));
  assert.notEqual(r.concerns.redness.level, 'low');
});

test('analyzeRegions warns about dark photos', () => {
  const r = analyzeRegions(face([45, 30, 24]));
  assert.ok(r.warnings.some((w) => /dark/i.test(w)));
  assert.equal(r.confidence, 'low');
});

test('parseInci splits lists and strips prefixes', () => {
  const list = parseInci('Ingredients: Aqua/Water/Eau, Glycerin, Niacinamide 5%, Fragrance (Parfum), Limonene*.');
  assert.deepEqual(list.slice(0, 3), ['aqua/water/eau', 'glycerin', 'niacinamide 5%']);
  assert.equal(list.length, 5);
});

test('matchIngredient handles aliases and generic words', () => {
  assert.equal(matchIngredient('Cocos Nucifera (Coconut) Oil').name, 'Coconut oil');
  assert.equal(matchIngredient('Sodium Hyaluronate').name, 'Hyaluronic acid');
  assert.equal(matchIngredient('Behenyl Alcohol'), null); // must not be flagged as drying alcohol
  assert.equal(matchIngredient('Alcohol Denat.').name, 'Alcohol denat.');
});

test('breakout explanation names comedogenic ingredients', () => {
  const ex = explainProduct(
    { name: 'Rich cream', ingredients: 'Aqua, Cocos Nucifera Oil, Isopropyl Myristate, Glycerin, Phenoxyethanol', outcome: 'breakout', weeksUsed: 8 },
    { skinType: 'oily' }
  );
  const text = ex.reasons.join(' ');
  assert.match(text, /Coconut oil/);
  assert.match(text, /Isopropyl myristate/);
});

test('retinoid breakout early on mentions purging', () => {
  const ex = explainProduct({ name: 'Retinol serum', ingredients: 'Aqua, Squalane, Retinol, Phenoxyethanol', outcome: 'breakout', weeksUsed: 3 }, {});
  assert.match(ex.reasons.join(' '), /purging/i);
});

test('irritation explanation flags fragrance and harsh ingredients', () => {
  const ex = explainProduct({ name: 'Toner', ingredients: 'Alcohol Denat., Aqua, Glycolic Acid, Parfum, Linalool', outcome: 'irritation' }, { skinType: 'sensitive' });
  const t = ex.reasons.join(' ');
  assert.match(t, /Alcohol denat/);
  assert.match(t, /Fragrance/);
});

test('worked explanation credits ingredients matching concerns', () => {
  const ex = explainProduct({ name: 'Serum', ingredients: 'Aqua, Niacinamide, Glycerin, Zinc PCA, Phenoxyethanol', outcome: 'worked' }, { concerns: ['oiliness'] });
  assert.match(ex.good.join(' '), /Niacinamide targets/);
});

test('dangerous bleaching ingredients are always flagged', () => {
  const ex = explainProduct({ name: 'Whitening cream', ingredients: 'Aqua, Clobetasol Propionate, Hydroquinone, Mercury', outcome: 'worked' }, { bleachingHistory: true });
  const w = ex.watch.join(' ');
  assert.match(w, /Steroid/);
  assert.match(w, /ochronosis/);
  assert.match(w, /Toxic/);
});

test('cross-product insights find repeat triggers', () => {
  const products = [
    { name: 'A', ingredients: 'Aqua, Coconut Oil, Glycerin', outcome: 'breakout' },
    { name: 'B', ingredients: 'Aqua, Cocos Nucifera Oil, Dimethicone', outcome: 'breakout' },
    { name: 'C', ingredients: 'Aqua, Glycerin, Niacinamide', outcome: 'worked' },
    { name: 'D', ingredients: 'Aqua, Niacinamide, Squalane', outcome: 'worked' },
  ];
  const ins = crossProductInsights(products);
  assert.equal(ins.suspects[0].name, 'Coconut oil');
  assert.ok(ins.friends.some((f) => f.name === 'Niacinamide'));
  assert.ok(!ins.suspects.some((f) => f.name === 'Water'));
});

test('bleaching history gives a soothing and barrier plan without strong actives', () => {
  const plan = buildPlan({ skinType: 'oily', concerns: ['acne', 'hyperpigmentation'], bleachingHistory: true, bleachingProducts: ['steroid'], bleachingStopped: 'current' });
  assert.ok(plan.bleachingPlan);
  assert.ok(plan.bleachingPlan.soothing.includes('Centella asiatica'));
  assert.ok(plan.bleachingPlan.barrier.includes('Ceramides'));
  const names = plan.keyIngredients.map((k) => k.name);
  for (const strong of ['Retinol', 'Glycolic acid', 'Salicylic acid', 'Benzoyl peroxide']) assert.ok(!names.includes(strong), strong);
  assert.ok(plan.bleachingPlan.personal.some((p) => /taper/.test(p)));
  assert.match(plan.am.at(-1).detail, /Mineral|tinted/i);
});

test('pregnancy removes retinoids', () => {
  const plan = buildPlan({ skinType: 'normal', concerns: ['aging', 'acne'], pregnant: true });
  assert.ok(!plan.keyIngredients.some((k) => /Retinol|Tretinoin|Salicylic/.test(k.name)));
});

test('analysis concerns feed into the plan', () => {
  const plan = buildPlan({ skinType: 'normal', concerns: [] }, { concerns: { redness: { score: 70, level: 'noticeable' } } });
  assert.equal(plan.concerns[0].id, 'redness');
});

test('chatbot answers ingredient questions, navigation and emergencies', () => {
  assert.match(respond('What is niacinamide?').text, /Niacinamide/);
  assert.equal(respond('open progress photos').action.navigate, 'progress');
  assert.ok(respond('my lips are swelling and I have trouble breathing').urgent);
  assert.match(respond('I used to bleach my skin').text, /barrier/i);
  assert.match(respond('how do I fade dark spots').text, /sunscreen|SPF/i);
  assert.match(respond('what is my body type').text, /cannot reliably/);
  assert.match(respond('read my morning routine', { profile: { skinType: 'dry' } }).text, /Morning routine|morning routine/i);
});

test('reminders fire once per day within the window', () => {
  const r = { enabled: true, am: '07:30', pm: '21:30', lifestyle: '20:00', lastFired: {} };
  const at = new Date(2026, 9, 24, 7, 45);
  assert.deepEqual(dueReminders(at, r, '2026-10-24').map((x) => x.id), ['am']);
  r.lastFired.am = '2026-10-24';
  assert.equal(dueReminders(at, r, '2026-10-24').length, 0);
  assert.equal(dueReminders(new Date(2026, 9, 24, 12, 0), { ...r, lastFired: {} }, '2026-10-24').length, 0);
});

test('follow-ups escalate when worse and repeat-same', () => {
  assert.ok(followUpAdvice('worse', {}).escalate);
  assert.match(followUpAdvice('same', { followUps: [{ answer: 'same' }] }).text, /doctor/);
  assert.ok(followUpAdvice('resolved', {}).resolve);
  const due = dueFollowUps([{ id: 1, nextFollowUp: '2020-01-01T00:00:00Z' }, { id: 2, nextFollowUp: '2999-01-01T00:00:00Z' }]);
  assert.deepEqual(due.map((c) => c.id), [1]);
});

test('lifestyle insights find a sleep pattern', () => {
  const entries = {};
  for (let i = 1; i <= 14; i++) {
    const d = `2026-10-${String(i).padStart(2, '0')}`;
    const short = i <= 6;
    entries[d] = { sleepHours: short ? 5 : 8, skinRating: short ? 2 : 4 };
  }
  const res = lifestyleInsights(entries);
  assert.ok(res.ready);
  // Ratings are averaged with the next day, so the gap shrinks but stays visible.
  assert.ok(res.insights.some((i) => /sleep/.test(i.factor)));
  assert.equal(lifestyleInsights({}).ready, false);
});
