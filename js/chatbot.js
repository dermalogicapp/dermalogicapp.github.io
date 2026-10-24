// Rule-based skin-care assistant. Runs fully on the device, so it works
// offline and nothing you say is sent anywhere.
import { CONCERNS, COMPLAINTS, BLEACHING_PLAN, DISCLAIMER } from './data/knowledge.js';
import { lookupIngredient } from './ingredients.js';
import { buildPlan } from './recommend.js';
import { describeAnalysis } from './analysis.js';

export const PAGES = {
  home: ['home', 'dashboard', 'start'],
  analyze: ['scan', 'analy', 'face', 'camera', 'skin tone'],
  profile: ['profile', 'questionnaire', 'about me', 'my details'],
  routine: ['routine', 'recommendation', 'plan'],
  complaints: ['complaint', 'problem', 'issue log'],
  progress: ['progress', 'photo', 'before and after', 'before after', 'compare'],
  lifestyle: ['lifestyle', 'food', 'sleep log', 'exercise log', 'diary'],
  ingredients: ['ingredient', 'product checker', 'products'],
  reminders: ['reminder', 'notification', 'alarm'],
  chat: ['chat', 'assistant'],
  settings: ['setting', 'privacy', 'export', 'delete my data'],
};

const CONCERN_WORDS = {
  acne: ['acne', 'pimple', 'breakout', 'zit', 'spot treatment', 'blackhead', 'whitehead'],
  hyperpigmentation: ['dark spot', 'dark mark', 'hyperpigment', 'uneven', 'melasma', 'discolor', 'patches'],
  redness: ['redness', 'red skin', 'rosacea', 'flush', 'sensitive'],
  oiliness: ['oily', 'shine', 'greasy', 'oil control'],
  dryness: ['dry', 'flaky', 'tight', 'dehydrat'],
  texture: ['texture', 'pores', 'rough', 'bumpy'],
  darkCircles: ['dark circle', 'under eye', 'eye bag', 'puffy'],
  aging: ['wrinkle', 'fine line', 'aging', 'ageing', 'firm'],
};

const COMPLAINT_WORDS = {
  swelling: ['swell', 'swollen', 'puffy lips', 'throat'],
  itching: ['itch'],
  burning: ['burn', 'sting'],
  rash: ['rash', 'hives', 'bumps'],
  sunburn: ['sunburn', 'sun burn'],
  thinning: ['thin skin', 'stretch mark', 'steroid'],
};

const includesAny = (t, words) => words.some((w) => t.includes(w));
const list = (xs) => xs.map((x, i) => `${i + 1}. ${x}`).join('\n');

export function respond(input, ctx = {}) {
  const t = ` ${String(input || '').toLowerCase().trim()} `;
  if (!t.trim()) return { text: 'I did not catch that. You can type or say a question, for example "what is niacinamide" or "read my morning routine".' };

  // Safety first.
  if (includesAny(t, ['can\'t breathe', 'cannot breathe', 'trouble breathing', 'throat closing', 'tongue swelling', 'lips swelling', 'face swelling'])) {
    return { text: 'This could be a severe allergic reaction. Please call your local emergency number or get to emergency care now.', urgent: true };
  }

  // Navigation.
  const nav = t.match(/\b(open|go to|show|take me to|navigate to)\b(.*)/);
  if (nav) {
    for (const [page, words] of Object.entries(PAGES)) {
      if (includesAny(nav[2], words)) return { text: `Opening ${page === 'analyze' ? 'face scan' : page}.`, action: { navigate: page } };
    }
  }

  if (/^\s*(hi|hello|hey|good (morning|afternoon|evening))\b/.test(t)) {
    const name = ctx.profile?.name ? `, ${ctx.profile.name}` : '';
    return { text: `Hello${name}. I am the DermaLogic assistant. Ask me about your routine, an ingredient, a skin concern, or say "help" to hear what I can do.` };
  }

  if (includesAny(t, [' help ', 'what can you do', 'commands'])) {
    return {
      text:
        'Here is what I can do:\n' +
        list([
          'Read your morning or evening routine: say "read my morning routine".',
          'Explain an ingredient: "what is azelaic acid".',
          'Give tips for a concern: "how do I treat dark spots".',
          'Help with a complaint: "my face is itching".',
          'Tell you your last scan result: "what is my skin tone".',
          'Open any section: "open progress" or "go to reminders".',
          'Advice after skin bleaching: "I used to bleach my skin".',
        ]),
    };
  }

  if (includesAny(t, ['are you a doctor', 'medical advice', 'disclaimer', 'diagnos'])) {
    return { text: DISCLAIMER };
  }

  if (includesAny(t, ['bleach', 'lighten', 'whitening', 'toning cream', 'glutathione', 'mercury', 'hydroquinone', 'clobetasol'])) {
    const p = BLEACHING_PLAN;
    return {
      text: `${p.intro}\n\nSoothing ingredients: ${p.soothing.slice(0, 5).join(', ')}.\nBarrier-repair ingredients: ${p.barrier.slice(0, 6).join(', ')}.\nAvoid for now: ${p.avoid.slice(0, 6).join(', ')}.\n\nSee a dermatologist if you notice: ${p.warningSigns[0].toLowerCase()} or ${p.warningSigns[1].toLowerCase()}. Turn on "history of skin bleaching" in your profile and I will tailor your routine.`,
    };
  }

  // Complaints, checked before routine and concerns so "itchy dry skin" gets complaint steps.
  for (const [k, words] of Object.entries(COMPLAINT_WORDS)) {
    if (includesAny(t, words)) {
      const c = COMPLAINTS[k];
      return {
        text: `For ${c.label.toLowerCase()}, try:\n${list(c.steps)}\n\nSee a doctor if: ${c.redFlags.join('; ')}.\n\nYou can log this in Complaints so I can follow up with you.`,
        urgent: !!c.urgent,
      };
    }
  }

  if (includesAny(t, ['routine', 'what should i use', 'my plan', 'morning', 'evening', 'night', ' am ', ' pm '])) {
    if (!ctx.profile) return { text: 'I need a little information first. Say "open profile" to fill in your skin profile, then ask again.', action: null };
    const plan = buildPlan(ctx.profile, ctx.analysis);
    const night = includesAny(t, ['evening', 'night', ' pm ', 'bed']);
    const morning = includesAny(t, ['morning', ' am ']);
    const fmt = (steps) => list(steps.map((s) => `${s.step}: ${s.detail}`));
    if (night && !morning) return { text: `Your evening routine:\n${fmt(plan.pm)}` };
    if (morning && !night) return { text: `Your morning routine:\n${fmt(plan.am)}` };
    return { text: `Morning:\n${fmt(plan.am)}\n\nEvening:\n${fmt(plan.pm)}${plan.notes.length ? '\n\n' + plan.notes.join(' ') : ''}` };
  }

  if (includesAny(t, ['skin tone', 'my scan', 'last scan', 'my results', 'my analysis', 'undertone'])) {
    if (!ctx.analysis) return { text: 'You have not done a face scan yet. Say "open face scan" to start one. Everything is processed on your device.' };
    return { text: describeAnalysis(ctx.analysis) };
  }

  if (includesAny(t, ['body type'])) {
    return {
      text: 'A face photo cannot reliably tell your body type, so DermaLogic does not guess it. You can choose it yourself in your profile, or leave it blank. It is only used for body-care tips such as sweat and friction areas.',
    };
  }

  if (includesAny(t, ['sunscreen', 'spf', 'sun protection'])) {
    return {
      text: 'Use a broad-spectrum sunscreen of SPF 30 or higher every morning, even indoors near windows and on cloudy days. Use about two finger-lengths for the face and neck, and reapply every 2 hours outdoors. On deeper skin tones, a tinted sunscreen with iron oxides also helps prevent dark patches. Mineral filters such as zinc oxide are gentlest on sensitive skin.',
    };
  }

  if (includesAny(t, ['reminder'])) {
    const r = ctx.reminders;
    if (!r?.enabled) return { text: 'Reminders are off. Say "open reminders" to turn them on.' };
    return { text: `Reminders are on. Morning routine at ${r.am}, evening routine at ${r.pm}, daily check-in at ${r.lifestyle}${r.sunscreen ? ', and sunscreen top-ups at 11, 1 and 3' : ''}.` };
  }

  // Ingredient questions.
  const ingQ = t.match(/\b(what is|what's|whats|tell me about|is|does|explain|about)\s+([a-z0-9\-\s/.]+?)(\s+(good|bad|safe|for|do|okay|ok|work|help).*)?\s*\??\s*$/);
  if (ingQ) {
    const ing = lookupIngredient(ingQ[2].trim());
    if (ing) return { text: ingredientText(ing) };
  }
  const direct = lookupIngredient(t.trim());
  if (direct && t.trim().length > 3) return { text: ingredientText(direct) };

  for (const [k, words] of Object.entries(CONCERN_WORDS)) {
    if (includesAny(t, words)) {
      const c = CONCERNS[k];
      return { text: `For ${c.label.toLowerCase()}:\n${list(c.tips)}\n\nIngredients that help: ${c.helps.join(', ')}.` };
    }
  }

  if (includesAny(t, ['sleep'])) return { text: 'Aim for 7 to 9 hours. Skin repairs itself overnight, and short sleep is linked to dullness, dark circles and slower healing. Log your sleep in Lifestyle and I will look for patterns with your skin.' };
  if (includesAny(t, ['water', 'hydrat', 'drink'])) return { text: 'Drinking enough water supports overall health, though it will not fix dry skin on its own; moisturizer does more for that. Track your water in Lifestyle.' };
  if (includesAny(t, ['food', 'diet', 'eat', 'dairy', 'sugar'])) return { text: 'Some people find high-sugar foods and dairy (especially skim milk) worsen acne. Fruit, vegetables and omega-3 rich foods support skin. Log meals in Lifestyle and after a week I will show any patterns for you.' };
  if (includesAny(t, ['exercise', 'workout', 'gym', 'sweat'])) return { text: 'Exercise boosts circulation, which is good for skin. Shower or at least rinse your face soon after sweating, and wash workout clothes often to avoid body breakouts.' };
  if (includesAny(t, ['thank'])) return { text: 'You are welcome. Take care of your skin.' };

  return {
    text: 'I am not sure about that yet. Try asking about an ingredient, a concern like acne or dark spots, your routine, or say "help".',
  };
}

export function ingredientText(ing) {
  const parts = [`${ing.name}.`];
  if (ing.benefit) parts.push(ing.benefit);
  if (ing.caution) parts.push(`Caution: ${ing.caution}`);
  if (ing.comedogenic >= 3) parts.push(`Pore-clogging rating: ${ing.comedogenic} out of 5.`);
  if (ing.pregnancyCaution) parts.push('Check with a doctor before using this while pregnant or breastfeeding.');
  return parts.join(' ');
}
