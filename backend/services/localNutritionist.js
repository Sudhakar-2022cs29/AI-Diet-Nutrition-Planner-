// Local rule-based nutrition engine — the fallback path when no GEMINI_API_KEY is set.
// It is not a language model: it answers a curated set of common questions from the
// user's live profile and food log, and tells the user plainly when a question falls
// outside what it can cover.

const FOOD_DATABASE = {
  protein: [
    { name: 'Greek yogurt (200g, low-fat)', kcal: 146, protein: 20, carbs: 9, fat: 4 },
    { name: 'Grilled chicken breast (150g)', kcal: 248, protein: 46, carbs: 0, fat: 5 },
    { name: 'Cottage cheese (150g)', kcal: 155, protein: 21, carbs: 6, fat: 5 },
    { name: 'Whey protein shake (1 scoop + water)', kcal: 120, protein: 24, carbs: 3, fat: 1 },
    { name: 'Large eggs (2)', kcal: 144, protein: 12, carbs: 1, fat: 10 },
    { name: 'Baked salmon (150g)', kcal: 312, protein: 33, carbs: 0, fat: 19 },
    { name: 'Cottage cheese & egg whites bowl', kcal: 190, protein: 27, carbs: 4, fat: 6 },
    { name: 'Edamame, cooked (150g)', kcal: 190, protein: 19, carbs: 15, fat: 8 },
    { name: 'Tofu and edamame stir-fry (200g)', kcal: 230, protein: 20, carbs: 12, fat: 12 },
    { name: 'Lentil and chickpea salad (200g)', kcal: 280, protein: 16, carbs: 38, fat: 7 },
    { name: 'Pea protein shake with almond milk', kcal: 150, protein: 25, carbs: 4, fat: 4 }
  ],
  carbs: [
    { name: 'Rolled oats (50g dry)', kcal: 190, protein: 6, carbs: 33, fat: 3 },
    { name: 'Sweet potato (200g baked)', kcal: 180, protein: 4, carbs: 41, fat: 0 },
    { name: 'Brown rice, cooked (150g)', kcal: 165, protein: 4, carbs: 34, fat: 1 },
    { name: 'Wholemeal bread (2 slices)', kcal: 160, protein: 8, carbs: 28, fat: 2 },
    { name: 'Quinoa, cooked (150g)', kcal: 180, protein: 7, carbs: 32, fat: 3 }
  ],
  fats: [
    { name: 'Avocado (100g)', kcal: 160, protein: 2, carbs: 9, fat: 15 },
    { name: 'Almonds (30g)', kcal: 170, protein: 6, carbs: 6, fat: 15 },
    { name: 'Olive oil (1 tbsp)', kcal: 119, protein: 0, carbs: 0, fat: 13.5 },
    { name: 'Greek yogurt, full fat (170g)', kcal: 170, protein: 15, carbs: 8, fat: 8 },
    { name: 'Chia seeds (20g)', kcal: 97, protein: 3, carbs: 8, fat: 6 }
  ],
  balanced: [
    { name: 'Lentil soup with wholegrain bread (350g)', kcal: 420, protein: 20, carbs: 58, fat: 10 },
    { name: 'Grilled chicken quinoa bowl (400g)', kcal: 540, protein: 44, carbs: 52, fat: 13 },
    { name: 'Baked cod with sweet potato and greens', kcal: 470, protein: 42, carbs: 44, fat: 10 },
    { name: 'Tuna and white bean salad (300g)', kcal: 420, protein: 34, carbs: 32, fat: 13 },
    { name: 'Chickpea and vegetable curry with rice (400g)', kcal: 520, protein: 19, carbs: 78, fat: 14 }
  ],
  veg: [
    { name: 'Roasted broccoli and carrots (200g)', kcal: 120, protein: 5, carbs: 18, fat: 4 },
    { name: 'Side salad with olive oil dressing (200g)', kcal: 130, protein: 3, carbs: 9, fat: 11 },
    { name: 'Stir-fried mixed vegetables (200g)', kcal: 110, protein: 4, carbs: 14, fat: 5 }
  ]
};

const SWAPS = {
  butter: [
    { from: 'Butter', to: 'Olive oil', note: 'Monounsaturated, keeps the sauté behaviour' },
    { from: 'Butter', to: 'Mashed avocado', note: 'Creamy texture with 6g fibre per 100g' },
    { from: 'Butter', to: 'Greek yogurt', note: 'Use in baking to cut saturated fat by ~60%' }
  ],
  sugar: [
    { from: 'Refined sugar', to: 'Cinnamon and vanilla', note: 'Sweetness with zero calories' },
    { from: 'Refined sugar', to: 'Dates or maple syrup', note: 'Half the sugar, plus potassium and antioxidants' },
    { from: 'White bread', to: 'Wholegrain sourdough', note: 'Lower glycaemic response, more fibre' }
  ],
  processed: [
    { from: 'Deli/processed meat', to: 'Fresh roasted chicken or tuna', note: 'Removes the sodium and nitrate load' },
    { from: 'Crisps', to: 'Roasted chickpeas', note: 'Adds fibre and protein for the same crunch' },
    { from: 'Sugary drink', to: 'Sparkling water with lemon', note: 'Roughly 40 kcal saved per serving' }
  ]
};

const normalise = (text) => String(text || '').toLowerCase();

const hasAny = (text, terms) => terms.some((t) => text.includes(t));

/**
 * Word-boundary match for short restriction keywords. Plain substring matching would
 * fire "nut" inside "macronutrient" and "gluten" inside unrelated words, which silently
 * hijacked unrelated questions.
 */
const hasWord = (text, word) =>
  new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i').test(text);

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

const macroLine = (item) => `${item.kcal} kcal · ${item.protein}g protein · ${item.carbs}g carbs · ${item.fat}g fat`;

const remainingStatus = (context) => {
  const target = context.targetCalories || 2000;
  const consumed = context.consumedCalories || 0;
  const remaining = target - consumed;

  if (consumed === 0) {
    return {
      lines: [
        `Nothing logged yet today, so you have your full **${fmt(target)} kcal** available.`,
        `Targets for today: **${context.proteinTarget}g protein**, **${context.carbsTarget}g carbs**, **${context.fatTarget}g fat**.`
      ],
      remaining
    };
  }

  const lines = [
    `You are at **${fmt(consumed)} kcal** of your **${fmt(target)} kcal** target — **${fmt(remaining)} kcal remaining**.`,
    `Macros so far: ${context.consumedProtein || 0}g protein, ${context.consumedCarbs || 0}g carbs, ${context.consumedFat || 0}g fat.`
  ];

  const proteinGap = (context.proteinTarget || 0) - (context.consumedProtein || 0);
  const carbsGap = (context.carbsTarget || 0) - (context.consumedCarbs || 0);
  const fatGap = (context.fatTarget || 0) - (context.consumedFat || 0);

  if (remaining < 0) {
    lines.push(`You are **${fmt(Math.abs(remaining))} kcal over** target. No compensation needed tomorrow — just return to your normal target.`);
  }

  if (proteinGap > 20) {
    lines.push(`Protein is your biggest gap at **${fmt(proteinGap)}g short**. This is the one worth closing, since it drives satiety and muscle maintenance.`);
  }
  if (carbsGap > 40 && remaining > 0) {
    lines.push(`You still have room for **${fmt(carbsGap)}g carbs** if you want to use the remaining calories on carbohydrate.`);
  }
  if (fatGap < -15) {
    lines.push(`Fat is running **${fmt(Math.abs(fatGap))}g over** target. Trim cooking oils or nut portions rather than cutting protein.`);
  }

  return { lines, remaining };
};

const pickFoods = (category, count = 3) => FOOD_DATABASE[category].slice(0, count);

// Terms that disqualify a food for each restriction. Substring matching is safe here
// because the food names are plain English (unlike free-text user questions).
const RESTRICTION_PATTERNS = {
  // Matches animal products only — "milk" is deliberately absent so plant milks
  // (almond, oat, soy) stay allowed
  vegan: /chicken|beef|pork|turkey|duck|fish|salmon|cod|tuna|sardine|shrimp|prawn|yogurt|cheese|egg|honey|feta|parmesan|ricotta|paneer|mascarpone|butter|cream|halloumi|skyr|cottage cheese|hummus|tahini|soba|mayonnaise|oyster|mussel|whey|casein|cow's milk/i,
  vegetarian: /chicken|beef|pork|turkey|duck|fish|salmon|cod|tuna|sardine|shrimp|prawn|lentil soup|chickpea/i,
  gluten: /bread|sourdough|oats|pasta|orzo|soba|noodle|roti|tortilla|rye|barley|farro|couscous|granola|overnight oats/i,
  dairy: /yogurt|cheese|milk|feta|parmesan|ricotta|paneer|mascarpone|butter|cream|halloumi|skyr|cottage cheese|whey|casein|almond milk|soy milk/i,
  nut: /almond|walnut|pecan|cashew|macadamia|hazelnut|peanut|nuts|hummus|tahini|chia|flaxseed|seeds/i,
  shellfish: /shrimp|prawn|crab|lobster|mussel|clam|oyster|scallop/i,
  halal: /pork|bacon|ham|prosciutto/i,
  kosher: /pork|bacon|ham|shrimp|prawn|shellfish/i
};

// Profile values arrive in several spellings ("Gluten-Free", "gluten free", "nut
// allergy"), so resolve each one to a canonical key before looking up its pattern.
const canonicalRestriction = (value) => {
  const text = normalise(value);
  if (text.includes('gluten') || text.includes('celiac') || text.includes('coeliac')) return 'gluten';
  if (text.includes('lactose') || text.includes('dairy')) return 'dairy';
  if (text.includes('nut')) return 'nut';
  if (text.includes('shellfish') || text.includes('seafood')) return 'shellfish';
  if (text.includes('vegan')) return 'vegan';
  if (text.includes('vegetarian')) return 'vegetarian';
  if (text.includes('halal')) return 'halal';
  if (text.includes('kosher')) return 'kosher';
  return text;
};

const isFoodAllowed = (food, restrictions) =>
  (restrictions || []).every((restriction) => {
    const pattern = RESTRICTION_PATTERNS[canonicalRestriction(restriction)];
    return pattern ? !pattern.test(food.name) : true;
  });

/** Restriction-aware food picker. Falls back to the veg pool if everything is filtered out. */
const pickAllowedFoods = (category, restrictions, count = 3) => {
  if (!restrictions || !restrictions.length) return pickFoods(category, count);

  const allowed = FOOD_DATABASE[category].filter((f) => isFoodAllowed(f, restrictions));
  if (allowed.length) return allowed.slice(0, count);

  const vegFallback = FOOD_DATABASE.veg.filter((f) => isFoodAllowed(f, restrictions));
  return vegFallback.slice(0, count) || pickFoods(category, count);
};

const filterAllowed = (foods, restrictions) =>
  !restrictions || !restrictions.length ? foods : foods.filter((f) => isFoodAllowed(f, restrictions));

const buildProteinAnswer = (context) => {
  const { lines } = remainingStatus(context);
  const budget = Math.max(150, Math.round((context.remaining ?? context.targetCalories) / 2));

  const restrictions = context.dietaryRestrictions || [];
  const allowedProtein = filterAllowed(FOOD_DATABASE.protein, restrictions);

  const options = allowedProtein.filter((f) => f.kcal <= budget).slice(0, 4);

  // If the budget rules everything out (or restrictions do), still suggest something legal
  const picks = options.length ? options : pickAllowedFoods('protein', restrictions, 3);

  return [
    '## Protein options for you',
    ...lines,
    ...(restrictions.length ? [`*Filtered for: ${restrictions.join(', ')}.*`] : []),
    '',
    `High-protein foods that fit your budget of roughly **${fmt(budget)} kcal**:`,
    ...picks.map((f) => `- **${f.name}** — ${macroLine(f)}`),
    '',
    `**What I would pick right now:** ${picks[0].name} — it gives you ${picks[0].protein}g protein with the least fat of the options.`
  ].join('\n');
};

const buildSwapAnswer = (context) => {
  const text = normalise(context.lastMessage);
  let group = 'processed';
  if (hasAny(text, ['butter', 'cream', 'saturated'])) group = 'butter';
  else if (hasAny(text, ['sugar', 'sweet', 'honey', 'syrup'])) group = 'sugar';

  const swaps = SWAPS[group];
  const groupLabel = { butter: 'saturated fat', sugar: 'refined sugar', processed: 'ultra-processed foods' }[group];

  return [
    `## Swapping out ${groupLabel}`,
    `For a ${profileGoalLabel(context)} goal, the swaps that matter most are ones you will actually repeat:`,
    ...swaps.map((s) => `- **${s.from} → ${s.to}** — ${s.note}`),
    '',
    `**Priority order for you:** start with ${swaps[0].from.toLowerCase()}. It appears most often in normal eating, so the change compounds across the week.`
  ].join('\n');
};

const profileGoalLabel = (context) =>
  ({ weight_loss: 'fat loss', weight_gain: 'muscle gain', maintenance: 'maintenance' })[context.goal] || 'maintenance';

const buildWorkoutAnswer = (context) => {
  const pre = [
    { name: 'Banana with a small amount of peanut butter', kcal: 200, protein: 6, note: 'fast carbs, easy to digest' },
    { name: 'Rice cakes with honey (2 cakes)', kcal: 130, protein: 2, note: 'very low fat, clears the stomach' },
    { name: 'Greek yogurt with honey and a few strawberries', kcal: 180, protein: 17, note: 'light protein plus carbs' }
  ];
  const post = [
    { name: 'Whey shake with a banana', kcal: 280, protein: 27, note: 'fast protein for the window' },
    { name: 'Chicken and rice bowl (300g)', kcal: 400, protein: 40, note: 'full meal if you have time' },
    { name: 'Cottage cheese with pineapple', kcal: 220, protein: 24, note: 'leucine rich, easy to finish' }
  ];

  const isPre = normalise(context.lastMessage).includes('pre');

  return isPre
    ? [
        '## 45 minutes before training',
        `For a ${profileGoalLabel(context)} goal, keep pre-workout food light — high fat slows gastric emptying and sits badly during hard efforts.`,
        '',
        ...pre.map((f) => `- **${f.name}** — ${f.kcal} kcal, ${f.protein}g protein (${f.note})`),
        '',
        'Take 400–600ml of water with 30–60 minutes of it. If your session is over 90 minutes, sip electrolytes as well.'
      ].join('\n')
    : [
        '## Straight after training',
        `Muscle protein synthesis peaks for a few hours after resistance work, so this is the meal worth prioritising for a ${profileGoalLabel(context)} goal.`,
        '',
        ...post.map((f) => `- **${f.name}** — ${f.kcal} kcal, ${f.protein}g protein (${f.note})`),
        '',
        'Get protein in within a couple of hours and total calories for the day handled, and the rest of the window matters far less than people are told.'
      ].join('\n');
};

const buildLateNightAnswer = (context) => {
  const restrictions = context.dietaryRestrictions || [];
  const allOptions = [
    { name: 'Cottage cheese with cinnamon (150g)', kcal: 155, protein: 21, note: 'slow-digesting casein, minimal glucose response' },
    { name: 'Boiled eggs (2) with cucumber', kcal: 180, protein: 13, note: 'filling without a carb load' },
    { name: 'Greek yogurt with a few walnuts (170g)', kcal: 250, protein: 15, note: 'if you want something that feels like a treat' },
    { name: 'Chamomile tea with a spoon of casein', kcal: 100, protein: 12, note: 'smallest option that still gives you protein' },
    { name: 'Edamame with sea salt (100g)', kcal: 120, protein: 12, note: 'plant option, low calorie, high satiety' },
    { name: 'Smashed avocado on cucumber slices with lime', kcal: 160, protein: 2, note: 'if you want something savoury with almost no carbs' },
    { name: 'Chia seed pudding made with soy milk (150g)', kcal: 170, protein: 7, note: 'vegan option that will not spike glucose' }
  ];

  const options = filterAllowed(allOptions, restrictions);

  const lateNight = FOOD_DATABASE.balanced.filter((f) => f.kcal > 350 && isFoodAllowed(f, restrictions));

  return [
    '## Late night, without wrecking tomorrow',
    `The goal is protein plus volume, not carbs — a big carb load before sleep spikes insulin overnight and hurts appetite the next morning.`,
    ...(restrictions.length ? [`*Filtered for: ${restrictions.join(', ')}.*`] : []),
    '',
    ...options.slice(0, 4).map((f) => `- **${f.name}** — ${f.kcal} kcal, ${f.protein}g protein (${f.note})`),
    ...(lateNight.length
      ? ['', `**Worth skipping:** ${lateNight[0].name} and similar (${lateNight[0].kcal} kcal) — too much energy to spend while you are asleep.`]
      : []),
    'Pair it with herbal tea rather than coffee, since caffeine after mid-afternoon cuts deep sleep.'
  ].join('\n');
};

const buildHydrationAnswer = (context) => {
  const target = context.hydration || 2;
  return [
    '## Hydration',
    `Your target is **${target}L a day** (~${Math.round(target * 4)} glasses of 250ml), based on ${context.weight}kg bodyweight at 33ml per kg.`,
    '',
    'A practical split:',
    '- **500ml on waking** — you lose 1–2% of bodyweight overnight',
    '- **400ml with each of your main meals**',
    '- **300–500ml during training**',
    '',
    'Watch for pale-yellow urine as your practical check, and add electrolytes if you are sweating heavily or training in heat.'
  ].join('\n');
};

const buildMacroBalanceAnswer = (context) => {
  const { lines } = remainingStatus(context);
  const remaining = Math.max(0, (context.targetCalories || 2000) - (context.consumedCalories || 0));

  const proteinGap = (context.proteinTarget || 0) - (context.consumedProtein || 0);
  const carbsGap = (context.carbsTarget || 0) - (context.consumedCarbs || 0);
  const fatGap = (context.fatTarget || 0) - (context.consumedFat || 0);

  const over = [];
  const under = [];
  if (proteinGap < -15) over.push(`protein (+${fmt(-proteinGap)}g)`);
  if (carbsGap < -20) over.push(`carbs (+${fmt(-carbsGap)}g)`);
  if (fatGap < -15) over.push(`fat (+${fmt(-fatGap)}g)`);
  if (proteinGap > 15) under.push(`protein (${fmt(proteinGap)}g)`);
  if (carbsGap > 25) under.push(`carbs (${fmt(carbsGap)}g)`);
  if (fatGap > 15) under.push(`fat (${fmt(fatGap)}g)`);

  const verdict = over.length
    ? `**Verdict:** over on ${over.join(', ')}.`
    : under.length
      ? `**Verdict:** short on ${under.join(', ')}, with ${fmt(remaining)} kcal still available to spend.`
      : '**Verdict:** your macros are **well balanced** against the target.';

  return [
    '## Today\'s macronutrient balance',
    ...lines,
    '',
    verdict,
    '',
    over.length
      ? `**Fix it at dinner** rather than by skipping food tomorrow: cut the portion, do not skip the meal.`
      : `**Closest foods to close the gap** (fits ${fmt(remaining)} kcal remaining):`,
    ...(over.length
      ? []
      : pickAllowedFoods(remaining < 300 ? 'veg' : 'balanced', context.dietaryRestrictions, 3)
          .map((f) => `- **${f.name}** — ${macroLine(f)}`))
  ].join('\n');
};

const buildMealIdeaAnswer = (context) => {
  const remaining = Math.max(0, (context.targetCalories || 2000) - (context.consumedCalories || 0));
  const text = normalise(context.lastMessage);
  // An explicit slot in the question ("give me a lunch") beats the time-of-day guess
  const slot = context.mealContext || detectSlot(text) || guessSlotFromHour();
  const targets = parseTargets(text);

  // An explicit budget in the question wins over what's left today; otherwise a single
  // meal gets roughly a third of the daily target (or all of what is left, if less).
  const budget = targets.calories || (remaining > 0 ? Math.min(remaining, Math.round((context.targetCalories || 2000) / 3)) : Math.round((context.targetCalories || 2000) / 3));

  const pools = {
    // Proteins first so a protein floor or a restricted diet still lands on a real
    // protein source; complete dishes and sides follow as variety
    breakfast: [...FOOD_DATABASE.protein.slice(4), ...FOOD_DATABASE.carbs.slice(0, 2), ...FOOD_DATABASE.fats.slice(1, 2)],
    lunch: [...FOOD_DATABASE.protein.slice(1), ...FOOD_DATABASE.balanced],
    dinner: [...FOOD_DATABASE.protein.slice(5), ...FOOD_DATABASE.balanced],
    snack: [...FOOD_DATABASE.protein.slice(3), ...FOOD_DATABASE.fats.slice(0, 2)]
  };

  const restrictions = context.dietaryRestrictions || [];

  // Restrictions are a hard filter, applied before the calorie and protein constraints
  let candidates = filterAllowed(pools[slot], restrictions)
    .filter((f) => f.kcal <= Math.max(200, budget));

  // If the user asked for a protein floor, lead with the options that actually hit it
  if (targets.protein) {
    const hits = candidates.filter((f) => f.protein >= targets.protein);
    if (hits.length) candidates = [...hits, ...candidates.filter((f) => f.protein < targets.protein)];
  }

  const picks = candidates.length ? candidates.slice(0, 3) : pickAllowedFoods('balanced', restrictions, 3);
  const best = picks[0];

  const constraints = [
    targets.calories ? `under **${fmt(targets.calories)} kcal**` : null,
    targets.protein ? `at least **${targets.protein}g protein**` : null
  ].filter(Boolean);

  const headline = constraints.length
    ? `Here is a ${slot} option ${constraints.join(' and ')}.`
    : `You have **${fmt(remaining)} kcal** left today, so here is a ${slot} option sized to fit.`;

  const shortfall = targets.protein && best.protein < targets.protein ? targets.protein - best.protein : 0;

  // Look across every allowed protein, not just the first few, so the shortfall can
  // actually be closed when a viable booster exists
  const boosterPool = restrictions.length
    ? filterAllowed(FOOD_DATABASE.protein, restrictions)
    : FOOD_DATABASE.protein;
  const booster = boosterPool.find((f) => f.name !== best.name && f.protein >= shortfall);

  const bestLine = targets.protein
    ? shortfall === 0
      ? `**Best match:** ${best.name} — ${best.kcal} kcal with ${best.protein}g protein, which clears your ${targets.protein}g target.`
      : booster
        ? `**Build it up:** ${best.name} (${best.protein}g protein) plus ${booster.name} (${booster.protein}g) gets you to ${best.protein + booster.protein}g, clearing your ${targets.protein}g target inside the budget.`
        : `**Best available:** ${best.name} — ${best.protein}g protein, which is ${shortfall}g short of your ${targets.protein}g target.`
    : `**What I would pick right now:** ${best.name} — ${best.protein}g protein with the least fat of the options.`;

  const side = pickAllowedFoods('veg', restrictions, 1)[0];

  return [
    `## ${slot.charAt(0).toUpperCase() + slot.slice(1)} idea`,
    headline,
    ...(restrictions.length ? [`*Filtered for: ${restrictions.join(', ')}.*`] : []),
    '',
    ...picks.map((f) => `- **${f.name}** — ${macroLine(f)}`),
    '',
    bestLine,
    '',
    side ? `Pair it with ${side.name.toLowerCase()} on the side for fibre and volume.` : ''
  ]
    .filter(Boolean)
    .join('\n');
};

/** Pull explicit numeric targets out of the question, e.g. "40g protein dinner under 550 kcal" */
const parseTargets = (text) => {
  const proteinMatch = text.match(/(\d{1,3})\s*(?:g|gram|grams)?\s*(?:of\s+)?protein/);
  const kcalMatch = text.match(/(\d{3,5})\s*(?:kcal|cal|calories|cals)/);
  return {
    protein: proteinMatch ? Number(proteinMatch[1]) : null,
    calories: kcalMatch ? Number(kcalMatch[1]) : null
  };
};

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

const detectSlot = (text) => SLOTS.find((slot) => hasWord(text, slot) || (slot === 'snack' && hasWord(text, 'snacks')));

const guessSlotFromHour = () => {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
};

const buildGeneralAnswer = (context) => {
  const { lines } = remainingStatus(context);
  const proteinGap = (context.proteinTarget || 0) - (context.consumedProtein || 0);
  const remaining = Math.max(0, (context.targetCalories || 2000) - (context.consumedCalories || 0));

  const body = [
    `Here is where you stand for a ${profileGoalLabel(context)} goal:`,
    ...lines.map((l) => `- ${l}`),
    '',
    proteinGap > 20
      ? `**Where to spend your ${fmt(remaining)} kcal:** prioritise protein. Options — ${pickAllowedFoods('protein', context.dietaryRestrictions, 2).map((f) => `${f.name} (${f.protein}g)`).join(' or ')}.`
      : `**Where to spend your ${fmt(remaining)} kcal:** you are on track for protein, so use the rest on vegetables and a whole grain of your choice.`,
    '',
    `**One thing to change today:** your activity level is set to *${context.activityLabel || 'moderate'}*. That single field shifts your daily target by roughly ${context.activityLevel === 'sedentary' ? '250' : context.activityLevel === 'very_active' ? '450' : '150'} kcal, so it is worth keeping accurate.`
  ];

  return body.join('\n');
};

// Replacement guidance per restriction. The exclusion patterns live in
// RESTRICTION_PATTERNS above so there is a single source of truth.
const RESTRICTION_SWAPS = {
  vegan: 'plant protein like tofu, tempeh, lentils or seitan',
  vegetarian: 'eggs, dairy, tofu or legumes',
  gluten: 'rice, quinoa, potato or buckwheat',
  dairy: 'plant alternatives, or coconut and nut based options',
  halal: 'chicken, beef, lamb, fish or legumes',
  kosher: 'beef, chicken, dairy or plant proteins',
  nut: 'pumpkin or sunflower seeds as a partial replacement',
  shellfish: 'fish or lean meat'
};

const buildRestrictionAnswer = (context) => {
  const restrictions = context.dietaryRestrictions || [];
  if (!restrictions.length) return null;

  const applied = [...new Set(restrictions.map(canonicalRestriction))]
    .filter((key) => RESTRICTION_PATTERNS[key]);

  const sections = ['## Dietary restrictions'];

  if (applied.length) {
    sections.push(
      `Your profile lists: **${restrictions.join(', ')}**. Every suggestion below already excludes conflicting foods:`,
      ''
    );
    applied.forEach((key) => {
      sections.push(`- **${key}** — excluded /${RESTRICTION_PATTERNS[key].source}/i, and I suggest ${RESTRICTION_SWAPS[key] || 'the nearest compliant alternative'} instead.`);
    });
  }

  const safe = pickAllowedFoods('veg', restrictions, 2);
  sections.push(
    '',
    '**Options that work with your restrictions:**',
    ...safe.map((f) => `- **${f.name}** — ${f.kcal} kcal, ${f.protein}g protein`)
  );

  sections.push('', '_Working from the restrictions saved in your profile. Update them in settings if anything has changed._');

  return sections.join('\n');
};

const INTENT_ORDER = [
  {
    key: 'restriction',
    test: (t) =>
      t.includes('what can i eat') ||
      ['vegan', 'vegetarian', 'gluten', 'dairy', 'lactose', 'halal', 'kosher', 'allergy', 'allergic', 'shellfish', 'pescatarian']
        .some((term) => hasWord(t, term)) ||
      /\bnuts?\b|peanut/i.test(t),
    handler: buildRestrictionAnswer
  },
  {
    key: 'balance',
    test: (t) =>
      hasAny(t, ['balance', 'review', 'how am i doing', 'how am i', 'progress', 'today so far', 'summary', 'analyse', 'analyze', 'on track']) ||
      /\bmacros?\b|macro[- ]?nutrient/i.test(t),
    handler: buildMacroBalanceAnswer
  },
  {
    key: 'lateNight',
    test: (t) => hasAny(t, ['late night', 'late-night', 'midnight', 'before bed', 'at night', 'insomnia', 'can\'t sleep']),
    handler: buildLateNightAnswer
  },
  {
    key: 'workout',
    test: (t) => hasAny(t, ['pre-workout', 'pre workout', 'before training', 'before workout', 'after workout', 'post-workout', 'post workout', 'after training', 'gym', 'workout', 'training', 'exercise']),
    handler: buildWorkoutAnswer
  },
  {
    key: 'swap',
    test: (t) => hasAny(t, ['swap', 'substitute', 'instead of', 'alternative', 'replace', 'butter', 'healthy fat', 'sugar']),
    handler: buildSwapAnswer
  },
  {
    key: 'hydration',
    test: (t) => hasAny(t, ['water', 'hydrat', 'how much should i drink', 'fluids']),
    handler: buildHydrationAnswer
  },
  {
    key: 'meal',
    test: (t) => hasAny(t, ['meal', 'eat', 'recipe', 'dinner', 'lunch', 'breakfast', 'snack', 'hungry', 'cook', 'food idea']),
    handler: buildMealIdeaAnswer
  },
  {
    key: 'protein',
    test: (t) => hasAny(t, ['protein', 'muscle', 'lean', 'recovery', 'whey', 'creatine']),
    handler: buildProteinAnswer
  }
];

/**
 * Produce a context-aware answer without any external AI provider.
 * @param {object} context - same shape passed to the Gemini path
 * @returns {{reply: string, source: string, intent: string}}
 */
const answerLocally = (context) => {
  const text = normalise(context.lastMessage || '');
  const restrictions = context.dietaryRestrictions || [];

  // A question like "what can I eat for lunch if I'm vegan?" is really a meal request —
  // the meal builder already applies the user's restrictions, so prefer it over the
  // generic restriction explainer.
  const asksForFood = detectSlot(text) || parseTargets(text).calories || parseTargets(text).protein;
  if (restrictions.length && asksForFood) {
    return { reply: buildMealIdeaAnswer(context), source: 'Aura Local Nutrition Engine', intent: 'meal' };
  }

  const intent = INTENT_ORDER.find((entry) => entry.test(text));

  if (intent) {
    const reply = intent.handler(context);
    if (reply) {
      return { reply, source: 'Aura Local Nutrition Engine', intent: intent.key };
    }
  }

  return {
    reply: buildGeneralAnswer(context),
    source: 'Aura Local Nutrition Engine',
    intent: 'general'
  };
};

module.exports = { answerLocally, FOOD_DATABASE, SWAPS };