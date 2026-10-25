// Skin-care knowledge used by the recommender, complaint helper and chatbot.
// General education only, not medical advice.

export const CONCERNS = {
  acne: {
    label: 'Breakouts / acne',
    helps: ['Salicylic acid', 'Azelaic acid', 'Niacinamide', 'Benzoyl peroxide', 'Retinol', 'Sulfur'],
    tips: [
      'Cleanse twice a day with a gentle, non-stripping cleanser.',
      'Use one acne active at a time and give it 6 to 8 weeks.',
      'Choose products labelled non-comedogenic and avoid heavy oils such as coconut oil and cocoa butter on the face.',
      'Change pillowcases twice a week and avoid picking, which leaves dark marks.',
    ],
    avoidTags: ['comedogenic'],
  },
  hyperpigmentation: {
    label: 'Dark spots / uneven tone',
    helps: ['Azelaic acid', 'Niacinamide', 'Tranexamic acid', 'Alpha arbutin', 'Vitamin C derivatives', 'Licorice root'],
    tips: [
      'Daily broad-spectrum SPF 30+ is the single most important step; a tinted sunscreen with iron oxides also blocks visible light.',
      'Pigment fades slowly: expect 8 to 12 weeks for visible change.',
      'Avoid harsh scrubs and strong peels that can cause new dark marks on deeper skin tones.',
    ],
  },
  redness: {
    label: 'Redness / sensitivity',
    helps: ['Centella asiatica', 'Azelaic acid', 'Niacinamide', 'Panthenol', 'Green tea', 'Licorice root', 'Colloidal oatmeal'],
    tips: [
      'Keep the routine short: gentle cleanser, soothing moisturizer, mineral sunscreen.',
      'Avoid fragrance, essential oils, alcohol denat. and hot water.',
      'Persistent facial redness with bumps or flushing can be rosacea, which a doctor can treat.',
    ],
  },
  oiliness: {
    label: 'Oiliness / shine',
    helps: ['Niacinamide', 'Salicylic acid', 'Zinc PCA', 'Hyaluronic acid'],
    tips: [
      'Do not skip moisturizer; use a light gel or lotion.',
      'Over-washing can make skin produce more oil.',
      'Blotting papers help during the day without stripping.',
    ],
  },
  dryness: {
    label: 'Dryness / flaking',
    helps: ['Ceramides', 'Glycerin', 'Hyaluronic acid', 'Squalane', 'Urea', 'Shea butter', 'Panthenol'],
    tips: [
      'Apply moisturizer to damp skin within a few minutes of washing.',
      'Use lukewarm water and a cream or milky cleanser.',
      'Seal in moisture at night with a richer cream or a thin layer of petrolatum.',
    ],
  },
  texture: {
    label: 'Rough texture / large-looking pores',
    helps: ['Lactic acid', 'Mandelic acid', 'Salicylic acid', 'Retinol', 'Niacinamide', 'Gluconolactone (PHA)'],
    tips: [
      'Exfoliate 1 to 3 times a week, not daily, and never on irritated skin.',
      'Retinoids improve texture over 3 months; start twice a week.',
    ],
  },
  darkCircles: {
    label: 'Dark under-eye circles',
    helps: ['Caffeine', 'Vitamin C derivatives', 'Niacinamide', 'Peptides', 'Retinol'],
    tips: [
      'Sleep, hydration and allergy control all play a part.',
      'Many dark circles are genetic or structural and only partly respond to creams.',
      'Sunscreen and sunglasses help prevent darkening.',
    ],
  },
  aging: {
    label: 'Fine lines / firmness',
    helps: ['Retinol', 'Peptides', 'Vitamin C (ascorbic acid)', 'Niacinamide', 'Bakuchiol'],
    tips: ['Sunscreen every day prevents most visible skin aging.', 'Retinoids are the best-studied topical for fine lines.'],
  },
};

export const SKIN_TYPES = {
  oily: { label: 'Oily', cleanser: 'gel or foaming cleanser with gentle surfactants', moisturizer: 'light, oil-free gel moisturizer', sunscreen: 'matte or fluid sunscreen SPF 30+' },
  dry: { label: 'Dry', cleanser: 'cream or milky non-foaming cleanser', moisturizer: 'rich cream with ceramides and glycerin', sunscreen: 'moisturizing sunscreen SPF 30+' },
  combination: { label: 'Combination', cleanser: 'gentle gel cleanser', moisturizer: 'lightweight lotion, a little richer on dry areas', sunscreen: 'lightweight fluid sunscreen SPF 30+' },
  normal: { label: 'Normal', cleanser: 'gentle cleanser', moisturizer: 'simple lotion with humectants', sunscreen: 'broad-spectrum sunscreen SPF 30+' },
  sensitive: { label: 'Sensitive', cleanser: 'fragrance-free cream or micellar cleanser', moisturizer: 'fragrance-free barrier cream with ceramides and panthenol', sunscreen: 'mineral (zinc oxide) sunscreen SPF 30+' },
};

export const BODY_TYPES = {
  ectomorph: 'Slim / lean frame',
  mesomorph: 'Athletic / muscular frame',
  endomorph: 'Fuller / curvier frame',
  mixed: 'Somewhere in between',
  skip: 'Prefer not to say',
};

// Body-care notes keyed by body type. These are about where friction, sweat
// and dryness tend to show up, not about weight or appearance goals.
export const BODY_CARE = {
  ectomorph: ['Thin skin over bony areas (elbows, knees) can get dry; use a rich body cream after bathing.'],
  mesomorph: ['Sweat after workouts can trigger body acne; shower soon after exercise and try a salicylic acid body wash on the chest and back.'],
  endomorph: ['Skin folds can trap moisture and cause chafing or dark patches; keep folds dry, use an anti-chafe balm, and wear breathable fabrics.'],
  mixed: ['Shower after heavy sweating and moisturize right after bathing.'],
  skip: [],
};

// Complaint categories with self-care steps and warning signs.
export const COMPLAINTS = {
  breakout: {
    label: 'New breakout or pimples',
    steps: [
      'Stop any new product you started in the last 2 to 4 weeks and note it in the Ingredient checker.',
      'Use a salicylic acid or benzoyl peroxide spot treatment once daily on the spots only.',
      'Do not squeeze; use a hydrocolloid patch on a spot that has come to a head.',
      'Keep moisturizing with a light, non-comedogenic product.',
    ],
    redFlags: ['Painful, deep lumps or cysts', 'Breakouts that leave scars', 'Acne that has not improved after 3 months of self-care'],
  },
  itching: {
    label: 'Itching',
    steps: [
      'Switch to fragrance-free, gentle products and cool (not hot) water.',
      'Apply a soothing moisturizer with colloidal oatmeal, panthenol or ceramides.',
      'A cool compress for 10 minutes can calm an itch flare.',
      'Think about any new detergent, product, plant or food that may be a trigger.',
    ],
    redFlags: ['Itching with hives across large areas', 'Itch that disturbs sleep for more than a week', 'Itching with yellow crusting or weeping'],
  },
  burning: {
    label: 'Burning or stinging',
    steps: [
      'Rinse off the product with cool water and stop all actives (acids, retinoids, vitamin C, scrubs).',
      'Use only a gentle cleanser, a barrier cream and a mineral sunscreen for 1 to 2 weeks.',
      'Petrolatum or a cica balm can protect raw areas overnight.',
    ],
    redFlags: ['Blistering or open skin', 'Burning after a chemical peel or bleaching product', 'Swelling of the eyes, lips or face'],
  },
  dryness: {
    label: 'Dryness, tightness or flaking',
    steps: [
      'Use a cream cleanser and moisturize within 3 minutes of washing.',
      'Add a humectant (glycerin, hyaluronic acid) under a ceramide cream.',
      'Pause exfoliating acids and retinoids until the flaking settles.',
      'Use a humidifier if indoor air is dry.',
    ],
    redFlags: ['Cracked or bleeding skin', 'Thick, scaly patches that do not respond to moisturizer'],
  },
  redness: {
    label: 'Redness or flushing',
    steps: [
      'Pare back to fragrance-free basics and a mineral sunscreen.',
      'Try centella, azelaic acid or niacinamide (2 to 5%) once the skin is calm.',
      'Note triggers: heat, spicy food, alcohol, sun and stress are common ones.',
    ],
    redFlags: ['Redness that spreads, feels hot or comes with fever', 'Persistent facial flushing with bumps (possible rosacea)'],
  },
  darkSpots: {
    label: 'New dark spots or patches',
    steps: [
      'Wear SPF 30+ every day and reapply every 2 hours outdoors.',
      'Use a gentle brightener such as azelaic acid, niacinamide or tranexamic acid.',
      'Avoid picking spots or using harsh scrubs.',
    ],
    redFlags: ['A mole or spot that is changing in size, shape or color, bleeding, or has irregular edges', 'Blue-grey or very dark patches after using lightening creams (possible ochronosis)'],
  },
  rash: {
    label: 'Rash or bumps',
    steps: [
      'Stop any new product and wash the area gently.',
      'Use a bland moisturizer; avoid scratching.',
      'Take a photo daily in the Progress tab so you can show a clinician how it changed.',
    ],
    redFlags: ['Rash with fever, blistering, or peeling skin', 'Rash around the eyes, mouth or genitals', 'Rash that spreads quickly'],
  },
  swelling: {
    label: 'Swelling',
    steps: ['Stop the product you suspect and wash it off.', 'Apply a cool compress.'],
    redFlags: ['Swelling of the lips, tongue, eyes or throat, or any trouble breathing: seek emergency care now'],
    urgent: true,
  },
  sunburn: {
    label: 'Sunburn',
    steps: [
      'Cool the skin with a cool shower or damp cloth.',
      'Apply aloe vera or a soothing, fragrance-free moisturizer.',
      'Drink water and stay out of the sun; skip actives until healed.',
    ],
    redFlags: ['Blistering over a large area', 'Fever, chills or dizziness'],
  },
  thinning: {
    label: 'Thin, fragile skin or stretch marks on the face',
    steps: [
      'This can follow long-term use of steroid creams. Do not keep using them unsupervised.',
      'Protect the skin with a gentle barrier cream and mineral sunscreen.',
      'See a doctor about how to stop steroid creams safely, since stopping abruptly can cause a flare.',
    ],
    redFlags: ['Any thinning, easy bruising or stretch marks on the face'],
  },
};

// Soothing and barrier-repair path for people with a history of skin bleaching.
export const BLEACHING_PLAN = {
  intro:
    'Skin that has been through bleaching or lightening products is often thinner, more sensitive and more prone to dark patches. The goal is to calm it, rebuild the barrier and protect it, before thinking about tone.',
  phases: [
    {
      name: 'Phase 1: Calm (weeks 0 to 4)',
      steps: [
        'Stop all lightening products, especially anything with mercury, unlabelled "whitening" creams, or strong steroids. If you have used a strong steroid cream for months, ask a doctor how to taper.',
        'Gentle, fragrance-free cleanser once or twice a day with lukewarm water.',
        'Soothing serum or cream with centella asiatica, panthenol, allantoin or colloidal oatmeal.',
        'Barrier cream with ceramides, cholesterol and fatty acids.',
        'Mineral sunscreen (zinc oxide) SPF 30+ every morning, ideally tinted with iron oxides.',
      ],
    },
    {
      name: 'Phase 2: Strengthen (weeks 4 to 12)',
      steps: [
        'Keep phase 1 going.',
        'Add niacinamide at 2 to 5% once a day to strengthen the barrier and gently even tone.',
        'Add a humectant serum (glycerin, hyaluronic acid) under moisturizer.',
        'Seal very dry or raw areas at night with a thin layer of petrolatum.',
      ],
    },
    {
      name: 'Phase 3: Even tone gently (after week 12, only if skin is calm)',
      steps: [
        'If uneven patches remain, patch-test a gentle option such as azelaic acid, tranexamic acid or licorice root, a few nights a week.',
        'Avoid strong peels, high-strength acids and scrubs.',
        'A dermatologist can check for ochronosis or steroid damage and offer treatments that are safe for your skin.',
      ],
    },
  ],
  soothing: ['Centella asiatica', 'Panthenol', 'Allantoin', 'Colloidal oatmeal', 'Bisabolol', 'Aloe vera', 'Beta-glucan', 'Green tea'],
  barrier: ['Ceramides', 'Cholesterol', 'Fatty acids', 'Squalane', 'Glycerin', 'Hyaluronic acid', 'Niacinamide', 'Petrolatum', 'Sunflower seed oil'],
  avoid: [
    'Mercury compounds',
    'Hydroquinone (unless prescribed and supervised)',
    'Topical corticosteroid (unless prescribed)',
    'Fragrance',
    'Essential oils',
    'Alcohol denat.',
    'Glycolic acid (high strength)',
    'Kojic acid',
    'Physical scrubs',
  ],
  warningSigns: [
    'Blue-grey or very dark patches on the cheeks or temples (possible exogenous ochronosis)',
    'Thin, shiny or easily bruised skin, visible blood vessels or stretch marks on the face (possible steroid damage)',
    'Severe flare of redness, burning or acne after stopping a cream (possible steroid withdrawal)',
    'Tiredness, tremor, numbness or kidney problems after using unregulated creams (possible mercury exposure)',
  ],
};

export const DISCLAIMER =
  'DermaLogic gives general skin-care information and camera-based estimates. It is not a medical device and does not diagnose, treat or replace a dermatologist or doctor. If you have a painful, spreading, bleeding or changing skin problem, or signs of an allergic reaction, seek medical care.';
