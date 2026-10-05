// Named diet styles — each style re-scales the user's energy/macro targets and ships
// its own meal library. Portions scale automatically with the user's goal so the same
// style produces a cut, maintenance or bulk version without duplicating meal data.

const GOAL_PORTION_SCALE = {
  weight_loss: 0.85,
  maintenance: 1.0,
  weight_gain: 1.2
};

const round = (value) => Math.round(value);

/**
 * Meal library per style. Portions are stated for a maintenance day at ~2000 kcal and
 * are scaled by GOAL_PORTION_SCALE against the user's actual targets.
 */
const DIET_STYLES = {
  balanced: {
    name: 'Balanced',
    emoji: '⚖️',
    tagline: 'Evidence-based 40/30/30 split for everyday sustainable eating',
    description:
      'A flexible plan built around whole grains, lean protein and healthy fats. The safest starting point and the easiest to sustain long-term.',
    macroShift: { protein: 1.0, carbs: 1.0, fat: 1.0 },
    calorieFactor: 1.0,
    focus: ['Whole grains', 'Lean protein', 'Colourful vegetables'],
    avoid: ['Sugary drinks', 'Highly processed snacks'],
    tips: [
      'Plate method: 1/2 non-starchy vegetables, 1/4 protein, 1/4 whole grain.',
      'Aim for two protein sources at every meal to improve satiety.'
    ],
    meals: {
      breakfast: [
        { name: 'Overnight oats with berries, chia and almond butter', kcal: 420, protein: 18 },
        { name: 'Greek yogurt bowl with granola and seasonal fruit', kcal: 390, protein: 24 },
        { name: 'Spinach and feta omelette with sourdough toast', kcal: 410, protein: 26 }
      ],
      lunch: [
        { name: 'Grilled chicken quinoa bowl with roasted vegetables', kcal: 560, protein: 45 },
        { name: 'Lentil and vegetable soup with wholegrain bread', kcal: 480, protein: 22 },
        { name: 'Tuna and white bean salad with olive oil dressing', kcal: 520, protein: 38 }
      ],
      dinner: [
        { name: 'Baked salmon with quinoa and steamed broccoli', kcal: 620, protein: 48 },
        { name: 'Chicken stir-fry with mixed vegetables and brown rice', kcal: 590, protein: 42 },
        { name: 'Lean beef and vegetable curry with basmati rice', kcal: 650, protein: 44 }
      ],
      snacks: [
        { name: 'Apple with a tablespoon of almond butter', kcal: 190, protein: 6 },
        { name: 'Handful of mixed nuts and a clementine', kcal: 200, protein: 6 },
        { name: 'Skyr with berries', kcal: 170, protein: 20 }
      ]
    }
  },

  high_protein: {
    name: 'High Protein',
    emoji: '💪',
    tagline: '1.6–2.2g protein per kg of bodyweight to protect and build lean mass',
    description:
      'Protein-forward plan for anyone training hard, cutting, or over 40 where preserving muscle matters more than chasing a low calorie number.',
    macroShift: { protein: 1.25, carbs: 0.85, fat: 0.85 },
    calorieFactor: 1.0,
    focus: ['Lean meat, fish, eggs', 'Whey or casein', 'Cottage cheese'],
    avoid: ['Protein with no fibre alongside', 'Skipping carbs entirely'],
    tips: [
      'Split protein across 4–5 feedings of 0.4g/kg per meal to maximise muscle protein synthesis.',
      'Prefer food-first protein; supplements are a convenience, not a requirement.'
    ],
    meals: {
      breakfast: [
        { name: 'Four-egg protein omelette with spinach and avocado', kcal: 470, protein: 38 },
        { name: 'Cottage cheese bowl with whey scoop, berries and seeds', kcal: 450, protein: 42 },
        { name: 'Skyr, banana and peanut butter overnight oats', kcal: 480, protein: 34 }
      ],
      lunch: [
        { name: 'Double chicken breast rice bowl with edamame', kcal: 640, protein: 58 },
        { name: 'Turkey mince and black bean bowl with corn salsa', kcal: 600, protein: 50 },
        { name: 'Tuna and egg salad on wholegrain bread', kcal: 560, protein: 46 }
      ],
      dinner: [
        { name: 'Grilled chicken breast with sweet potato and asparagus', kcal: 660, protein: 60 },
        { name: 'Baked cod with quinoa and green beans', kcal: 620, protein: 55 },
        { name: 'Sirloin steak with roasted potatoes and greens', kcal: 700, protein: 58 }
      ],
      snacks: [
        { name: 'Whey protein shake with water', kcal: 150, protein: 30 },
        { name: 'Cottage cheese with cherry tomatoes', kcal: 180, protein: 26 },
        { name: 'Boiled eggs and a small handful of almonds', kcal: 220, protein: 20 }
      ]
    }
  },

  low_carb: {
    name: 'Low Carb',
    emoji: '🥑',
    tagline: '~130g carbs per day for steady energy without glucose spikes',
    description:
      'Moderate-carb approach rather than strict keto. Fits well for people who feel sluggish on high-carb days or are managing blood sugar.',
    macroShift: { protein: 1.1, carbs: 0.45, fat: 1.2 },
    calorieFactor: 1.0,
    focus: ['Non-starchy vegetables', 'Berries in small portions', 'Avocado, nuts, olive oil'],
    avoid: ['Bread, pasta, rice', 'Sugary fruit like mango and grapes'],
    tips: [
      'Keep carbs concentrated in one meal rather than spread thin across the day.',
      'Add electrolytes when carb intake drops — water, sodium and magnesium matter more than usual.'
    ],
    meals: {
      breakfast: [
        { name: 'Bacon and avocado omelette with roasted tomatoes', kcal: 450, protein: 26 },
        { name: 'Full-fat Greek yogurt with walnuts and blueberries', kcal: 420, protein: 22 },
        { name: 'Chia pudding with coconut milk and vanilla', kcal: 400, protein: 16 }
      ],
      lunch: [
        { name: 'Grilled chicken Caesar salad without croutons', kcal: 560, protein: 45 },
        { name: 'Tuna and egg lettuce wraps with avocado', kcal: 520, protein: 38 },
        { name: 'Turkey and vegetable soup with cauliflower rice', kcal: 470, protein: 40 }
      ],
      dinner: [
        { name: 'Pan-seared salmon with asparagus and cauliflower mash', kcal: 640, protein: 48 },
        { name: 'Sirloin steak with roasted mushrooms and green beans', kcal: 660, protein: 52 },
        { name: 'Chicken thighs with zucchini noodles and pesto', kcal: 580, protein: 44 }
      ],
      snacks: [
        { name: 'Hummus with cucumber and pepper strips', kcal: 160, protein: 6 },
        { name: 'Small handful of macadamias', kcal: 210, protein: 5 },
        { name: 'Olives and a hard-boiled egg', kcal: 180, protein: 8 }
      ]
    }
  },

  keto: {
    name: 'Keto',
    emoji: '🥓',
    tagline: 'Very low carb, high fat — pushes the body into ketosis',
    description:
      'Strict ketogenic protocol. Effective short-term for appetite control, but demanding to sustain and best followed with clinical supervision.',
    macroShift: { protein: 1.05, carbs: 0.15, fat: 1.55 },
    calorieFactor: 1.0,
    focus: ['Oils, butter, cream', 'Eggs and fatty cuts of meat', 'Low-carb vegetables'],
    avoid: ['All grains and legumes', 'Sugar and most fruit'],
    tips: [
      'Expect a 1–3 week adaptation period with fatigue, thirst and headaches before energy stabilises.',
      'This is a clinical tool, not a default. Fat-heavy intake raises LDL — get lipids checked after 3 months.'
    ],
    meals: {
      breakfast: [
        { name: 'Bacon, egg and cheese skillet with avocado', kcal: 560, protein: 26 },
        { name: 'Whipped cream, butter and cinnamon berry bowl', kcal: 480, protein: 12 },
        { name: 'Chia seed pudding made with coconut cream', kcal: 460, protein: 14 }
      ],
      lunch: [
        { name: 'Grilled chicken Caesar salad with Parmesan and olive oil', kcal: 680, protein: 48 },
        { name: 'Salmon salad with egg and avocado', kcal: 660, protein: 40 },
        { name: 'Beef and broccoli stir-fry in sesame oil', kcal: 700, protein: 46 }
      ],
      dinner: [
        { name: 'Butter-basted steak with roasted cauliflower', kcal: 780, protein: 52 },
        { name: 'Grilled salmon with asparagus in hollandaise', kcal: 740, protein: 46 },
        { name: 'Chicken thighs with spinach and Alfredo sauce', kcal: 760, protein: 44 }
      ],
      snacks: [
        { name: 'Cheese, cured meats and pickles', kcal: 280, protein: 18 },
        { name: 'Macadamias with sugar-free dark chocolate', kcal: 300, protein: 6 },
        { name: 'Full-fat cottage cheese with cinnamon', kcal: 240, protein: 20 }
      ]
    }
  },

  mediterranean: {
    name: 'Mediterranean',
    emoji: '🫒',
    tagline: 'Plant-forward with olive oil, fish and whole grains',
    description:
      'The most evidence-backed eating pattern for long-term heart and metabolic health. Sustainable, flexible and easy to socialise with.',
    macroShift: { protein: 1.0, carbs: 0.95, fat: 1.1 },
    calorieFactor: 1.0,
    focus: ['Extra virgin olive oil', 'Oily fish 2–3x weekly', 'Legumes and nuts'],
    avoid: ['Red meat more than twice weekly', 'Butter-heavy dishes'],
    tips: [
      'Fat quality matters here — aim for 3–4 tbsp of extra virgin olive oil daily.',
      'A glass of red wine fits the pattern but is optional; polyphenols work from food.'
    ],
    meals: {
      breakfast: [
        { name: 'Greek yogurt with honey, walnuts and figs', kcal: 420, protein: 20 },
        { name: 'Avocado and tomato on wholegrain sourdough', kcal: 440, protein: 15 },
        { name: 'Overnight oats with apricot and almonds', kcal: 430, protein: 17 }
      ],
      lunch: [
        { name: 'Chickpea and tomato bowl with feta and olive oil', kcal: 540, protein: 20 },
        { name: 'Grilled sardines with salad and roasted peppers', kcal: 500, protein: 32 },
        { name: 'Lentil salad with tuna and rocket', kcal: 520, protein: 36 }
      ],
      dinner: [
        { name: 'Baked sea bass with tomatoes, olives and roasted vegetables', kcal: 600, protein: 42 },
        { name: 'Chicken with lemon, garlic and orzo', kcal: 640, protein: 40 },
        { name: 'Bean and vegetable stew with wholemeal bread', kcal: 570, protein: 24 }
      ],
      snacks: [
        { name: 'Olives, walnuts and a small piece of cheese', kcal: 220, protein: 10 },
        { name: 'Roasted red pepper dip with crudités', kcal: 160, protein: 5 },
        { name: 'Fresh figs with mascarpone', kcal: 200, protein: 8 }
      ]
    }
  },

  vegetarian: {
    name: 'Vegetarian',
    emoji: '🥗',
    tagline: 'Plant-based with dairy and eggs, protein-forward',
    description:
      'Lacto-ovo vegetarian plan. Protein is deliberately spread across the day rather than concentrated at one meal, which is where most plant-based plans fail.',
    macroShift: { protein: 1.05, carbs: 1.0, fat: 0.95 },
    calorieFactor: 1.0,
    focus: ['Legumes and tofu', 'Greek yogurt and eggs', 'Quinoa and wheat protein'],
    avoid: ['Protein only at dinner', 'Refined carbs with no protein pairing'],
    tips: [
      'Pair every plant protein with a grain or seed to complete the amino acid profile.',
      'Iron and zinc are the nutrients to watch — rotate lentils, chickpeas, tofu and pumpkin seeds.'
    ],
    meals: {
      breakfast: [
        { name: 'Vegetable omelette with feta and wholegrain toast', kcal: 420, protein: 24 },
        { name: 'Tofu scramble with black beans and avocado', kcal: 440, protein: 26 },
        { name: 'Greek yogurt with muesli and ground flaxseed', kcal: 400, protein: 22 }
      ],
      lunch: [
        { name: 'Falafel and quinoa bowl with tahini dressing', kcal: 580, protein: 26 },
        { name: 'Paneer and vegetable curry with brown rice', kcal: 620, protein: 30 },
        { name: 'Lentil and roast pepper salad with feta', kcal: 540, protein: 28 }
      ],
      dinner: [
        { name: 'Ricotta and spinach cannelloni with side salad', kcal: 620, protein: 32 },
        { name: 'Tofu stir-fry with soba noodles and edamame', kcal: 600, protein: 30 },
        { name: 'Chana masala with wholemeal roti', kcal: 580, protein: 24 }
      ],
      snacks: [
        { name: 'Hummus with carrot and cucumber sticks', kcal: 180, protein: 8 },
        { name: 'Cottage cheese with cherry tomatoes and seeds', kcal: 190, protein: 22 },
        { name: 'Apple with peanut butter', kcal: 200, protein: 7 }
      ]
    }
  },

  vegan: {
    name: 'Vegan',
    emoji: '🌱',
    tagline: 'Fully plant-based, with protein and B12 planned deliberately',
    description:
      'Whole-food vegan plan. Vitamin B12, iron, zinc and omega-3 need active attention, so those are called out rather than left to chance.',
    macroShift: { protein: 1.05, carbs: 1.05, fat: 0.95 },
    calorieFactor: 1.05,
    focus: ['Tofu, tempeh, legumes', 'Seitan and quinoa', 'Fortified plant milks'],
    avoid: ['Unfortified plant milks as the only protein source', 'Relying on one protein source'],
    tips: [
      'B12 supplementation is required — no plant food provides it reliably.',
      'Use a fortified plant milk plus 1 tbsp ground flaxseed or chia daily for omega-3.'
    ],
    meals: {
      breakfast: [
        { name: 'Tofu scramble with black beans, avocado and corn tortillas', kcal: 450, protein: 28 },
        { name: 'Overnight oats with fortified soy milk and hemp seeds', kcal: 430, protein: 22 },
        { name: 'Chickpea flour pancake with berries and maple', kcal: 410, protein: 18 }
      ],
      lunch: [
        { name: 'Black bean and quinoa bowl with chipotle lime dressing', kcal: 590, protein: 26 },
        { name: 'Seitan and vegetable stir-fry with brown rice', kcal: 610, protein: 34 },
        { name: 'Red lentil dal with basmati rice and cucumber raita', kcal: 580, protein: 25 }
      ],
      dinner: [
        { name: 'Baked tofu with sesame, broccoli and sweet potato', kcal: 620, protein: 32 },
        { name: 'Smoky bean and pumpkin stew with wholemeal bread', kcal: 570, protein: 22 },
        { name: 'Tempeh tacos with charred corn and avocado', kcal: 640, protein: 36 }
      ],
      snacks: [
        { name: 'Edamame with sea salt', kcal: 190, protein: 18 },
        { name: 'Hummus with crudités and wholegrain crackers', kcal: 200, protein: 8 },
        { name: 'Pea protein shake with fortified soy milk', kcal: 160, protein: 25 }
      ]
    }
  },

  intermittent_fasting: {
    name: 'Intermittent Fasting',
    emoji: '⏰',
    tagline: '16:8 eating window — calories matter, timing comes second',
    description:
      'A scheduling approach layered on top of your calorie target. Two meals inside an 8-hour window, with hydration and electrolytes in the fasting block.',
    macroShift: { protein: 1.2, carbs: 0.9, fat: 1.0 },
    calorieFactor: 0.97,
    focus: ['Protein-heavy first meal', 'Electrolytes while fasting', 'Calorie total above all'],
    tips: [
      'Protein at the first meal of the window prevents late-night hunger spikes.',
      'Black coffee, tea, sparkling water and electrolytes do not break a fast.'
    ],
    meals: {
      breakfast: [
        { name: 'Window-opening meal: large omelette with avocado and rye', kcal: 620, protein: 40 },
        { name: 'Break-fast brunch: shakshuka with feta and sourdough', kcal: 600, protein: 32 },
        { name: 'Greek yogurt and whey bowl with oats and blueberries', kcal: 590, protein: 38 }
      ],
      lunch: [
        { name: 'Chicken and rice bowl with double greens', kcal: 600, protein: 48 },
        { name: 'Seared salmon with quinoa and cucumber salad', kcal: 620, protein: 44 },
        { name: 'Turkey meatballs with zucchini and tomato sauce', kcal: 560, protein: 46 }
      ],
      dinner: [
        { name: 'Closing meal: grilled steak with roasted vegetables', kcal: 640, protein: 52 },
        { name: 'Cod and sweet potato with greens', kcal: 580, protein: 44 },
        { name: 'Chicken and vegetable stir-fry with cauliflower rice', kcal: 560, protein: 42 }
      ],
      snacks: [
        { name: 'Electrolyte drink with a small handful of nuts', kcal: 200, protein: 6 },
        { name: 'Cottage cheese with chia seeds', kcal: 200, protein: 22 },
        { name: 'Boiled eggs with black coffee inside the window', kcal: 190, protein: 17 }
      ]
    }
  }
};

const DEFAULT_STYLE = 'balanced';

// Goal-to-style alignment: a keto plan for a bulk request is usually the wrong call
const STYLE_GOAL_FIT = {
  weight_loss: ['low_carb', 'high_protein', 'intermittent_fasting', 'mediterranean', 'keto', 'balanced', 'vegetarian', 'vegan'],
  maintenance: ['mediterranean', 'balanced', 'vegetarian', 'vegan', 'high_protein', 'low_carb', 'intermittent_fasting', 'keto'],
  weight_gain: ['high_protein', 'intermittent_fasting', 'balanced', 'mediterranean', 'vegetarian', 'vegan', 'low_carb', 'keto']
};

/** Lightweight metadata list for the UI selector */
const listStyles = () =>
  Object.entries(DIET_STYLES).map(([key, style]) => ({
    key,
    name: style.name,
    emoji: style.emoji,
    tagline: style.tagline
  }));

const isValidStyle = (key) => Object.prototype.hasOwnProperty.call(DIET_STYLES, key);

/** Recommend a style that suits the goal and any dietary restrictions */
const suggestStyle = (goal = 'maintenance', dietaryRestrictions = []) => {
  const order = STYLE_GOAL_FIT[goal] || STYLE_GOAL_FIT.maintenance;
  const restrictions = (dietaryRestrictions || []).map((r) => String(r).toLowerCase());

  const penalised = { keto: 0.4, low_carb: 0.15, vegetarian: 0.5, vegan: 0.5 };

  if (restrictions.some((r) => r.includes('vegan'))) return 'vegan';
  if (restrictions.some((r) => r.includes('vegetarian'))) {
    return restrictions.some((r) => r.includes('dairy') || r.includes('lactose')) ? 'vegan' : 'vegetarian';
  }

  // Lower score wins: base rank from the goal fit, plus a penalty for styles that
  // restrict food groups unnecessarily (e.g. keto for a maintenance goal).
  const scored = order
    .map((key, index) => ({ key, score: index + (penalised[key] || 0) }))
    .sort((a, b) => a.score - b.score);

  return scored[0]?.key || DEFAULT_STYLE;
};

/**
 * Build the full plan for a style, scaled to the user's actual targets.
 * @param {object} profile - output of buildNutritionProfile()
 * @param {string} styleKey
 */
const buildStylePlan = (profile, styleKey) => {
  const key = isValidStyle(styleKey) ? styleKey : DEFAULT_STYLE;
  const style = DIET_STYLES[key];
  const scale = GOAL_PORTION_SCALE[profile.goal] ?? 1.0;

  // Style macro shift is relative to the profile macros, then re-normalised to the
  // style's calorie factor so the plan still adds up to the prescribed target.
  const shifted = {
    protein: profile.macros.protein * style.macroShift.protein,
    carbs: profile.macros.carbs * style.macroShift.carbs,
    fat: profile.macros.fat * style.macroShift.fat
  };

  const styleCalories = profile.targetCalories * style.calorieFactor;

  const currentCalories = shifted.protein * 4 + shifted.carbs * 4 + shifted.fat * 9;
  const ratio = currentCalories > 0 ? styleCalories / currentCalories : 1;

  // Renormalising can push a high-protein style past a safe ceiling, so cap protein at
  // 2.2g/kg of bodyweight and redistribute the surplus calories to carbs and fat in the
  // same proportions the style asked for.
  const proteinCeiling = profile.weight * 2.2;
  const scaledProtein = shifted.protein * ratio;
  const protein = Math.min(scaledProtein, proteinCeiling);

  const surplus = Math.max(0, (scaledProtein - protein) * 4);
  const carbFatCalories = Math.max(0, shifted.carbs * ratio * 4 + shifted.fat * ratio * 9);
  const surplusRatio = carbFatCalories > 0 ? surplus / carbFatCalories : 0;

  const macros = {
    protein: round(protein),
    carbs: round(shifted.carbs * ratio * (1 + surplusRatio)),
    fat: round(shifted.fat * ratio * (1 + surplusRatio))
  };

  const mealPlan = Object.entries(style.meals).map(([slot, options]) => ({
    slot,
    label: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' }[slot] || slot,
    options: options.map((option) => ({
      name: option.name,
      calories: round(option.kcal * scale),
      protein: round(option.protein * scale)
    }))
  }));

  return {
    key,
    name: style.name,
    emoji: style.emoji,
    tagline: style.tagline,
    description: style.description,
    calories: round(styleCalories),
    macros,
    macroSplit: {
      protein: round((macros.protein * 4 * 100) / Math.max(1, styleCalories)),
      carbs: round((macros.carbs * 4 * 100) / Math.max(1, styleCalories)),
      fat: round((macros.fat * 9 * 100) / Math.max(1, styleCalories))
    },
    focus: style.focus,
    avoid: style.avoid,
    tips: style.tips,
    mealPlan
  };
};

module.exports = {
  DIET_STYLES,
  DEFAULT_STYLE,
  GOAL_PORTION_SCALE,
  listStyles,
  isValidStyle,
  suggestStyle,
  buildStylePlan
};