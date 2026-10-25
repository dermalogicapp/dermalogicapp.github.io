// Ingredient knowledge base. Ratings are general guidance drawn from common
// dermatology references; individual reactions vary.
//
// comedogenic: 0 (won't clog pores) .. 5 (very likely to clog pores)
// irritancy:   0 (gentle) .. 3 (frequently irritating)
// tags: functional categories used by the explainer and recommender.

const I = (name, aliases, tags, info = {}) => ({
  name,
  aliases,
  tags,
  comedogenic: info.c ?? 0,
  irritancy: info.i ?? 0,
  benefit: info.b ?? '',
  caution: info.w ?? '',
  pregnancyCaution: !!info.preg,
});

export const INGREDIENTS = [
  // Humectants
  I('Glycerin', ['glycerin', 'glycerine', 'glycerol'], ['humectant', 'barrier'], { b: 'Draws water into skin and supports the barrier.' }),
  I('Hyaluronic acid', ['hyaluronic acid', 'sodium hyaluronate', 'hydrolyzed hyaluronic acid', 'sodium hyaluronate crosspolymer'], ['humectant'], { b: 'Holds water in the upper skin for plumper, hydrated skin.' }),
  I('Propanediol', ['propanediol'], ['humectant', 'solvent'], { b: 'Light humectant and solvent.' }),
  I('Butylene glycol', ['butylene glycol'], ['humectant', 'solvent'], { c: 1, b: 'Light humectant.' }),
  I('Propylene glycol', ['propylene glycol'], ['humectant', 'solvent', 'allergen'], { i: 1, b: 'Humectant.', w: 'Can sting or cause allergy in a small number of people.' }),
  I('Urea', ['urea'], ['humectant', 'exfoliant-gentle', 'barrier'], { i: 1, b: 'Hydrates and softens rough, flaky skin.', w: 'Higher strengths (10%+) can sting on broken skin.' }),
  I('Sodium PCA', ['sodium pca'], ['humectant', 'barrier'], { b: 'Part of skin\'s natural moisturizing factor.' }),
  I('Betaine', ['betaine'], ['humectant', 'soothing'], { b: 'Hydrating and calming.' }),
  I('Aloe vera', ['aloe barbadensis leaf juice', 'aloe barbadensis leaf extract', 'aloe vera', 'aloe barbadensis'], ['soothing', 'humectant'], { b: 'Calms and hydrates.' }),

  // Barrier lipids and emollients
  I('Ceramides', ['ceramide np', 'ceramide ap', 'ceramide eop', 'ceramide ns', 'ceramide eos', 'ceramide 1', 'ceramide 3', 'ceramide 6 ii', 'ceramides'], ['barrier', 'emollient'], { b: 'Rebuild the skin barrier lipids; key for damaged or sensitized skin.' }),
  I('Cholesterol', ['cholesterol'], ['barrier', 'emollient'], { b: 'Barrier lipid that works with ceramides and fatty acids.' }),
  I('Phytosphingosine', ['phytosphingosine'], ['barrier', 'soothing'], { b: 'Supports ceramide production and calms skin.' }),
  I('Squalane', ['squalane'], ['emollient', 'barrier'], { c: 1, b: 'Lightweight, non-greasy emollient.' }),
  I('Squalene', ['squalene'], ['emollient'], { c: 3, b: 'Emollient.', w: 'Can oxidize and clog pores in acne-prone skin (squalane is the stable form).' }),
  I('Petrolatum', ['petrolatum', 'petroleum jelly', 'white petrolatum'], ['occlusive', 'barrier'], { c: 0, b: 'Very effective at sealing in moisture and protecting healing skin.', w: 'Feels heavy; fine for most, but some acne-prone users prefer lighter textures.' }),
  I('Dimethicone', ['dimethicone', 'dimethiconol'], ['occlusive', 'emollient'], { c: 1, b: 'Smooths skin and reduces water loss without much greasiness.' }),
  I('Cyclopentasiloxane', ['cyclopentasiloxane', 'cyclomethicone'], ['emollient'], { b: 'Evaporating silicone that gives a silky feel.' }),
  I('Shea butter', ['butyrospermum parkii butter', 'butyrospermum parkii (shea) butter', 'shea butter', 'vitellaria paradoxa butter'], ['emollient', 'occlusive', 'barrier'], { c: 1, b: 'Rich emollient for dry skin.', w: 'Can feel heavy on very oily skin.' }),
  I('Cocoa butter', ['theobroma cacao seed butter', 'theobroma cacao (cocoa) seed butter', 'cocoa butter'], ['emollient', 'occlusive'], { c: 4, b: 'Rich emollient.', w: 'Highly comedogenic; a common cause of facial breakouts.' }),
  I('Coconut oil', ['cocos nucifera oil', 'cocos nucifera (coconut) oil', 'coconut oil'], ['emollient', 'occlusive'], { c: 4, b: 'Emollient for body skin.', w: 'Highly comedogenic on the face.' }),
  I('Isopropyl myristate', ['isopropyl myristate'], ['emollient'], { c: 5, i: 1, w: 'One of the most pore-clogging emollients.' }),
  I('Isopropyl palmitate', ['isopropyl palmitate'], ['emollient'], { c: 4, w: 'Commonly clogs pores in acne-prone skin.' }),
  I('Isopropyl isostearate', ['isopropyl isostearate'], ['emollient'], { c: 5, w: 'Highly comedogenic.' }),
  I('Myristyl myristate', ['myristyl myristate'], ['emollient'], { c: 5, w: 'Highly comedogenic.' }),
  I('Laureth-4', ['laureth-4'], ['emulsifier'], { c: 5, w: 'Highly comedogenic emulsifier.' }),
  I('Acetylated lanolin', ['acetylated lanolin', 'acetylated lanolin alcohol'], ['emollient', 'allergen'], { c: 4, w: 'Comedogenic and a known contact allergen.' }),
  I('Lanolin', ['lanolin', 'lanolin alcohol', 'lanolin oil'], ['emollient', 'occlusive', 'allergen'], { c: 2, b: 'Strong moisturizer.', w: 'A known contact allergen for some people.' }),
  I('Wheat germ oil', ['triticum vulgare germ oil', 'triticum vulgare (wheat) germ oil', 'wheat germ oil'], ['emollient'], { c: 5, w: 'Highly comedogenic.' }),
  I('Algae extract', ['algae extract', 'chlorella vulgaris extract', 'laminaria digitata extract'], ['emollient'], { c: 4, w: 'Some algae extracts are strongly comedogenic.' }),
  I('Sodium lauryl sulfate', ['sodium lauryl sulfate', 'sls'], ['surfactant-harsh'], { c: 3, i: 3, w: 'Harsh cleanser that strips the barrier and irritates.' }),
  I('Jojoba oil', ['simmondsia chinensis seed oil', 'simmondsia chinensis (jojoba) seed oil', 'jojoba oil'], ['emollient'], { c: 2, b: 'Light, skin-like oil.' }),
  I('Argan oil', ['argania spinosa kernel oil', 'argan oil'], ['emollient'], { c: 0, b: 'Nourishing, low pore-clogging oil.' }),
  I('Rosehip oil', ['rosa canina fruit oil', 'rosa rubiginosa seed oil', 'rosehip oil'], ['emollient', 'antioxidant'], { c: 1, b: 'Rich in fatty acids; can help with marks.' }),
  I('Sunflower seed oil', ['helianthus annuus seed oil', 'helianthus annuus (sunflower) seed oil', 'sunflower seed oil'], ['emollient', 'barrier'], { c: 0, b: 'Linoleic-acid-rich oil that supports the barrier.' }),
  I('Mineral oil', ['paraffinum liquidum', 'mineral oil'], ['occlusive'], { c: 0, b: 'Inert, non-irritating occlusive.' }),
  I('Caprylic/capric triglyceride', ['caprylic/capric triglyceride', 'caprylic capric triglyceride'], ['emollient'], { c: 1, b: 'Light emollient from coconut, generally non-clogging.' }),
  I('Cetearyl alcohol', ['cetearyl alcohol', 'cetyl alcohol', 'stearyl alcohol'], ['emollient', 'emulsifier'], { c: 2, b: 'Fatty alcohol that softens skin (not drying, unlike alcohol denat).' }),
  I('Fatty acids', ['linoleic acid', 'stearic acid', 'palmitic acid', 'oleic acid'], ['emollient', 'barrier'], { c: 2, b: 'Barrier lipids.', w: 'Oleic acid can be pore-clogging for some.' }),

  // Soothing
  I('Centella asiatica', ['centella asiatica extract', 'centella asiatica leaf extract', 'centella asiatica', 'cica', 'madecassoside', 'asiaticoside', 'asiatic acid', 'madecassic acid'], ['soothing', 'barrier'], { b: 'Calms irritation and supports wound healing.' }),
  I('Panthenol', ['panthenol', 'd-panthenol', 'dexpanthenol', 'pro-vitamin b5'], ['soothing', 'humectant', 'barrier'], { b: 'Pro-vitamin B5; soothes and helps barrier repair.' }),
  I('Allantoin', ['allantoin'], ['soothing'], { b: 'Calms and softens irritated skin.' }),
  I('Colloidal oatmeal', ['avena sativa kernel flour', 'avena sativa (oat) kernel flour', 'colloidal oatmeal', 'avena sativa kernel extract'], ['soothing', 'barrier'], { b: 'Relieves itching and irritation.' }),
  I('Bisabolol', ['bisabolol', 'alpha-bisabolol'], ['soothing'], { b: 'Chamomile-derived calming ingredient.' }),
  I('Green tea', ['camellia sinensis leaf extract', 'green tea extract'], ['soothing', 'antioxidant'], { b: 'Antioxidant and anti-redness.' }),
  I('Licorice root', ['glycyrrhiza glabra root extract', 'dipotassium glycyrrhizate', 'licorice root extract'], ['soothing', 'brightening'], { b: 'Calms redness and gently evens tone.' }),
  I('Zinc PCA', ['zinc pca'], ['oil-control', 'soothing'], { b: 'Helps regulate oil.' }),
  I('Beta-glucan', ['beta-glucan', 'sodium beta-glucan'], ['soothing', 'humectant'], { b: 'Calming and hydrating.' }),
  I('Mugwort', ['artemisia vulgaris extract', 'artemisia capillaris extract'], ['soothing'], { b: 'Calming botanical.' }),

  // Brightening / pigment
  I('Niacinamide', ['niacinamide', 'nicotinamide', 'vitamin b3'], ['brightening', 'barrier', 'oil-control', 'anti-acne'], { i: 1, b: 'Evens tone, strengthens barrier, regulates oil.', w: 'High strengths (10%+) can cause flushing in some.' }),
  I('Azelaic acid', ['azelaic acid', 'potassium azeloyl diglycinate'], ['brightening', 'anti-acne', 'soothing'], { i: 1, b: 'Fades dark marks, calms acne and rosacea; safe in pregnancy.' }),
  I('Tranexamic acid', ['tranexamic acid'], ['brightening'], { b: 'Targets stubborn hyperpigmentation and melasma with low irritation.' }),
  I('Alpha arbutin', ['alpha-arbutin', 'alpha arbutin', 'arbutin'], ['brightening'], { b: 'Gentle tyrosinase inhibitor for dark spots.' }),
  I('Kojic acid', ['kojic acid', 'kojic dipalmitate'], ['brightening'], { i: 2, b: 'Fades dark spots.', w: 'Can irritate or cause allergy; avoid on a damaged barrier.' }),
  I('Vitamin C (ascorbic acid)', ['ascorbic acid', 'l-ascorbic acid'], ['brightening', 'antioxidant'], { i: 2, b: 'Antioxidant that brightens and protects.', w: 'Low pH can sting on sensitive or compromised skin.' }),
  I('Vitamin C derivatives', ['ascorbyl glucoside', 'sodium ascorbyl phosphate', 'magnesium ascorbyl phosphate', '3-o-ethyl ascorbic acid', 'ethyl ascorbic acid', 'tetrahexyldecyl ascorbate', 'ascorbyl tetraisopalmitate'], ['brightening', 'antioxidant'], { i: 1, b: 'Gentler forms of vitamin C.' }),
  I('Hydroquinone', ['hydroquinone'], ['bleaching', 'brightening'], { i: 2, preg: true, b: 'Prescription-strength depigmenting agent.', w: 'Should only be used short-term under medical supervision; long-term use can cause ochronosis (blue-black darkening).' }),
  I('Mercury compounds', ['mercury', 'mercurous chloride', 'calomel', 'ammoniated mercury', 'mercuric', 'mercurio', 'hydrargyri'], ['bleaching', 'toxic'], { i: 3, preg: true, w: 'Toxic. Banned in cosmetics in most countries; can damage kidneys and nerves. Stop and see a doctor.' }),
  I('Topical corticosteroid', ['clobetasol propionate', 'clobetasol', 'betamethasone', 'betamethasone valerate', 'betamethasone dipropionate', 'hydrocortisone', 'dexamethasone', 'fluocinolone acetonide', 'mometasone furoate'], ['steroid'], { i: 2, w: 'Steroid. Unsupervised long-term facial use thins skin and causes acne, stretch marks and rebound redness. Do not stop high-strength use abruptly without medical advice.' }),
  I('Glutathione', ['glutathione'], ['brightening', 'antioxidant'], { b: 'Antioxidant.', w: 'Topical effect on tone is modest; injectable glutathione for lightening carries real risks.' }),

  // Exfoliants
  I('Glycolic acid', ['glycolic acid'], ['exfoliant', 'aha'], { i: 2, b: 'AHA that smooths texture and fades marks.', w: 'Can irritate and increases sun sensitivity.' }),
  I('Lactic acid', ['lactic acid'], ['exfoliant', 'aha', 'humectant'], { i: 1, b: 'Gentler AHA that also hydrates.' }),
  I('Mandelic acid', ['mandelic acid'], ['exfoliant', 'aha'], { i: 1, b: 'Gentle AHA; good for darker skin tones prone to marks.' }),
  I('Salicylic acid', ['salicylic acid', 'betaine salicylate', 'willow bark extract', 'salix alba bark extract'], ['exfoliant', 'bha', 'anti-acne'], { i: 2, preg: true, b: 'Oil-soluble exfoliant that clears pores.', w: 'Can dry skin; avoid high-strength peels in pregnancy.' }),
  I('Gluconolactone (PHA)', ['gluconolactone', 'lactobionic acid'], ['exfoliant', 'humectant'], { i: 0, b: 'Very gentle exfoliant suitable for sensitive skin.' }),

  // Retinoids
  I('Retinol', ['retinol', 'retinyl palmitate', 'retinyl acetate', 'retinal', 'retinaldehyde', 'hydroxypinacolone retinoate', 'retinyl retinoate'], ['retinoid', 'anti-acne', 'anti-aging'], { i: 2, preg: true, b: 'Speeds cell turnover; helps acne, texture, marks and fine lines.', w: 'Start slowly; causes dryness and peeling at first. Avoid in pregnancy.' }),
  I('Tretinoin / adapalene', ['tretinoin', 'adapalene', 'tazarotene', 'retinoic acid'], ['retinoid', 'anti-acne', 'anti-aging'], { i: 3, preg: true, b: 'Prescription-strength retinoid.', w: 'Expect an adjustment period; avoid in pregnancy.' }),
  I('Bakuchiol', ['bakuchiol'], ['anti-aging', 'antioxidant'], { b: 'Plant-based retinol alternative, gentler and pregnancy-friendly.' }),

  // Anti-acne
  I('Benzoyl peroxide', ['benzoyl peroxide'], ['anti-acne'], { i: 2, b: 'Kills acne bacteria.', w: 'Drying; bleaches fabric.' }),
  I('Sulfur', ['sulfur', 'sulphur'], ['anti-acne'], { i: 1, b: 'Gentle acne spot treatment.' }),
  I('Tea tree oil', ['melaleuca alternifolia leaf oil', 'melaleuca alternifolia (tea tree) leaf oil', 'tea tree oil'], ['anti-acne', 'essential-oil'], { i: 2, b: 'Mild antibacterial.', w: 'Essential oil; can irritate or sensitize, especially undiluted.' }),

  // Antioxidants / misc actives
  I('Vitamin E', ['tocopherol', 'tocopheryl acetate', 'vitamin e'], ['antioxidant'], { c: 2, b: 'Antioxidant that stabilizes formulas.' }),
  I('Peptides', ['palmitoyl tripeptide-1', 'palmitoyl tetrapeptide-7', 'acetyl hexapeptide-8', 'copper tripeptide-1', 'palmitoyl pentapeptide-4', 'matrixyl'], ['anti-aging', 'barrier'], { b: 'Support firmness and repair.' }),
  I('Ferulic acid', ['ferulic acid'], ['antioxidant'], { b: 'Boosts antioxidant protection.' }),
  I('Resveratrol', ['resveratrol'], ['antioxidant'], { b: 'Antioxidant.' }),
  I('Caffeine', ['caffeine'], ['antioxidant'], { b: 'May reduce puffiness.' }),

  // Sunscreens
  I('Zinc oxide', ['zinc oxide'], ['sunscreen', 'soothing'], { b: 'Broad-spectrum mineral sunscreen; gentle on sensitive skin.' }),
  I('Titanium dioxide', ['titanium dioxide', 'ci 77891'], ['sunscreen'], { b: 'Mineral UV filter.' }),
  I('Iron oxides', ['iron oxides', 'ci 77491', 'ci 77492', 'ci 77499'], ['sunscreen-visible'], { b: 'Tint that blocks visible light, which helps prevent dark patches on deeper skin tones.' }),
  I('Chemical UV filters', ['avobenzone', 'butyl methoxydibenzoylmethane', 'octinoxate', 'ethylhexyl methoxycinnamate', 'octocrylene', 'homosalate', 'octisalate', 'ethylhexyl salicylate', 'bemotrizinol', 'bis-ethylhexyloxyphenol methoxyphenyl triazine', 'tinosorb s', 'tinosorb m', 'uvinul a plus', 'diethylamino hydroxybenzoyl hexyl benzoate', 'ethylhexyl triazone', 'oxybenzone', 'benzophenone-3'], ['sunscreen'], { i: 1, b: 'UV filters.', w: 'Some (e.g. oxybenzone, octocrylene) can sting sensitive eyes or skin.' }),

  // Irritants and allergens
  I('Fragrance', ['fragrance', 'parfum', 'perfume', 'aroma'], ['fragrance', 'allergen'], { i: 2, w: 'The most common cause of cosmetic allergy and irritation.' }),
  I('Fragrance allergens', ['limonene', 'linalool', 'citronellol', 'geraniol', 'citral', 'eugenol', 'coumarin', 'benzyl alcohol', 'benzyl benzoate', 'benzyl salicylate', 'hexyl cinnamal', 'cinnamal', 'farnesol', 'hydroxycitronellal', 'isoeugenol', 'alpha-isomethyl ionone', 'butylphenyl methylpropional'], ['fragrance', 'allergen'], { i: 2, w: 'Fragrance components that are regulated allergens.' }),
  I('Essential oils', ['lavandula angustifolia oil', 'lavender oil', 'citrus limon peel oil', 'lemon oil', 'citrus aurantium dulcis peel oil', 'orange peel oil', 'mentha piperita oil', 'peppermint oil', 'eucalyptus globulus leaf oil', 'rosmarinus officinalis leaf oil', 'citrus aurantium bergamia fruit oil', 'bergamot oil', 'cinnamomum zeylanicum bark oil', 'menthol'], ['essential-oil', 'fragrance', 'allergen'], { i: 2, w: 'Essential oils can irritate and sensitize; citrus oils can cause sun reactions.' }),
  I('Alcohol denat.', ['alcohol denat', 'alcohol denat.', 'denatured alcohol', 'sd alcohol', 'sd alcohol 40', 'ethanol', 'alcohol', 'isopropyl alcohol'], ['drying-alcohol'], { i: 2, w: 'Drying and irritating when high in the list.' }),
  I('Methylisothiazolinone', ['methylisothiazolinone', 'methylchloroisothiazolinone', 'mit', 'mci'], ['preservative', 'allergen'], { i: 3, w: 'A strong contact allergen.' }),
  I('Formaldehyde releasers', ['dmdm hydantoin', 'quaternium-15', 'imidazolidinyl urea', 'diazolidinyl urea', 'bronopol', '2-bromo-2-nitropropane-1,3-diol', 'sodium hydroxymethylglycinate'], ['preservative', 'allergen'], { i: 2, w: 'Release small amounts of formaldehyde; common allergens.' }),
  I('Phenoxyethanol', ['phenoxyethanol'], ['preservative'], { b: 'Common, well-tolerated preservative.' }),
  I('Parabens', ['methylparaben', 'propylparaben', 'ethylparaben', 'butylparaben'], ['preservative'], { b: 'Effective preservatives with low allergy rates.' }),
  I('Ethylhexylglycerin', ['ethylhexylglycerin'], ['preservative'], { b: 'Preservative booster and skin conditioner.' }),
  I('Sodium benzoate', ['sodium benzoate', 'potassium sorbate'], ['preservative'], { b: 'Gentle preservative.' }),
  I('Cocamidopropyl betaine', ['cocamidopropyl betaine'], ['surfactant', 'allergen'], { i: 1, b: 'Mild cleanser.', w: 'Occasional allergen.' }),
  I('Sodium laureth sulfate', ['sodium laureth sulfate', 'sles', 'ammonium lauryl sulfate'], ['surfactant-harsh'], { i: 2, w: 'Stronger cleanser that can dry sensitive skin.' }),
  I('Gentle surfactants', ['sodium cocoyl isethionate', 'coco-glucoside', 'decyl glucoside', 'lauryl glucoside', 'sodium lauroyl methyl isethionate', 'disodium cocoyl glutamate', 'sodium cocoyl glycinate'], ['surfactant'], { b: 'Mild cleansing agents.' }),
  I('Witch hazel', ['hamamelis virginiana water', 'hamamelis virginiana (witch hazel) water', 'hamamelis virginiana extract', 'witch hazel'], ['astringent'], { i: 1, w: 'Astringent; often drying, and many versions contain alcohol.' }),
  I('Propolis', ['propolis extract', 'propolis'], ['soothing', 'allergen'], { b: 'Soothing, antibacterial.', w: 'A known allergen for people allergic to bee products.' }),
  I('Snail mucin', ['snail secretion filtrate'], ['humectant', 'soothing'], { b: 'Hydrating and repairing.' }),
  I('Water', ['water', 'aqua', 'eau', 'aqua/water/eau', 'water/aqua/eau', 'purified water'], ['base'], {}),
  I('Xanthan gum', ['xanthan gum', 'carbomer', 'acrylates/c10-30 alkyl acrylate crosspolymer', 'hydroxyethylcellulose'], ['texture'], {}),
  I('pH adjusters', ['sodium hydroxide', 'citric acid', 'triethanolamine', 'tromethamine', 'arginine'], ['ph'], {}),
  I('Chelators', ['disodium edta', 'tetrasodium edta', 'sodium phytate'], ['chelator'], {}),
];

// Ingredients that usually sit around or below 1% concentration. Anything
// listed after these in an INCI list is probably present in small amounts.
export const ONE_PERCENT_MARKERS = ['phenoxyethanol', 'fragrance', 'parfum', 'xanthan gum', 'carbomer', 'disodium edta', 'ethylhexylglycerin', 'sodium benzoate', 'potassium sorbate'];
