// Unit tests for the nutrition math, diet styles and local coach engine.
// These cover the bugs that previously produced NaN/null responses and a canned
// demo reply, and do not require MongoDB or a Gemini API key.
import { describe, it, expect } from 'vitest';

const { buildNutritionProfile, calculateBMR, calculateHydration } = require('../utils/nutrition');
const { buildStylePlan, listStyles, isValidStyle, suggestStyle, DIET_STYLES } = require('../services/dietStyles');
const { answerLocally } = require('../services/localNutritionist');
const { chatWithNutritionist } = require('../services/geminiService');

const baseContext = {
  name: 'Test',
  goal: 'weight_loss',
  goalLabel: 'Weight Loss',
  weight: 80,
  height: 180,
  age: 30,
  activityLevel: 'moderate',
  activityLabel: 'Moderately active',
  targetCalories: 2200,
  proteinTarget: 140,
  carbsTarget: 250,
  fatTarget: 70,
  hydration: 2.6,
  dietaryRestrictions: [],
  consumedCalories: 1200,
  consumedProtein: 80,
  consumedCarbs: 120,
  consumedFat: 40,
  loggedToday: [{ foodName: 'Oats', calories: 300, mealType: 'breakfast' }]
};

describe('buildNutritionProfile', () => {
  it('returns finite numbers for a complete profile', () => {
    const profile = buildNutritionProfile({
      weight: 80, height: 180, age: 30, gender: 'male', activityLevel: 'active', goal: 'weight_loss'
    });

    expect(Number.isFinite(profile.bmr)).toBe(true);
    expect(Number.isFinite(profile.tdee)).toBe(true);
    expect(Number.isFinite(profile.targetCalories)).toBe(true);
    expect(profile.tdee).toBeGreaterThan(profile.bmr);
    expect(profile.targetCalories).toBe(profile.tdee - 500);
  });

  it('falls back to defaults for a completely empty profile instead of returning NaN', () => {
    const profile = buildNutritionProfile({});

    expect(Number.isFinite(profile.bmr)).toBe(true);
    expect(Number.isFinite(profile.tdee)).toBe(true);
    expect(Number.isFinite(profile.targetCalories)).toBe(true);
    expect(profile.weight).toBe(70);
    expect(profile.height).toBe(170);
    expect(profile.age).toBe(25);
  });

  it('never returns NaN for missing or non-numeric fields', () => {
    const profile = buildNutritionProfile({ weight: '', height: null, age: undefined, gender: 'other' });

    ['bmr', 'tdee', 'targetCalories', 'hydration', 'weight', 'height', 'age'].forEach((key) => {
      expect(Number.isFinite(profile[key])).toBe(true);
    });
    expect(Number.isFinite(profile.macros.protein)).toBe(true);
    expect(Number.isFinite(profile.macros.carbs)).toBe(true);
    expect(Number.isFinite(profile.macros.fat)).toBe(true);
  });

  it('never prescribes below the gender-aware calorie floor', () => {
    const sedentaryMale = buildNutritionProfile({
      weight: 45, height: 150, age: 60, gender: 'male', activityLevel: 'sedentary', goal: 'weight_loss'
    });
    const sedentaryFemale = buildNutritionProfile({
      weight: 45, height: 150, age: 60, gender: 'female', activityLevel: 'sedentary', goal: 'weight_loss'
    });

    expect(sedentaryMale.targetCalories).toBeGreaterThanOrEqual(1500);
    expect(sedentaryFemale.targetCalories).toBeGreaterThanOrEqual(1200);
  });

  it('applies the goal adjustment in the correct direction', () => {
    const shared = { weight: 70, height: 175, age: 30, gender: 'male', activityLevel: 'moderate' };

    expect(buildNutritionProfile({ ...shared, goal: 'weight_gain' }).targetCalories)
      .toBeGreaterThan(buildNutritionProfile({ ...shared, goal: 'maintenance' }).targetCalories);
    expect(buildNutritionProfile({ ...shared, goal: 'weight_loss' }).targetCalories)
      .toBeLessThan(buildNutritionProfile({ ...shared, goal: 'maintenance' }).targetCalories);
  });

  it('uses the female Harris-Benedict constants for female profiles', () => {
    const female = calculateBMR(65, 165, 30, 'female');
    const male = calculateBMR(65, 165, 30, 'male');

    expect(female).not.toBeCloseTo(male, 1);
    expect(female).toBeCloseTo(447.593 + 9.247 * 65 + 3.098 * 165 - 4.33 * 30, 3);
  });

  it('enforces a 2L hydration minimum', () => {
    expect(calculateHydration(10)).toBe(2);
    expect(calculateHydration(80)).toBeCloseTo(2.6, 1);
  });
});

describe('diet styles', () => {
  const profile = buildNutritionProfile({
    weight: 80, height: 180, age: 30, gender: 'male', activityLevel: 'active', goal: 'weight_loss'
  });

  it('exposes every style with the metadata the UI selector needs', () => {
    const styles = listStyles();

    expect(styles.length).toBe(Object.keys(DIET_STYLES).length);
    styles.forEach((style) => {
      expect(style.key).toBeTruthy();
      expect(style.name).toBeTruthy();
      expect(style.emoji).toBeTruthy();
      expect(style.tagline).toBeTruthy();
    });
  });

  it('validates style keys', () => {
    expect(isValidStyle('keto')).toBe(true);
    expect(isValidStyle('not-a-diet')).toBe(false);
    expect(isValidStyle('constructor')).toBe(false);
    expect(isValidStyle('__proto__')).toBe(false);
  });

  it('builds a plan with finite macros and a complete meal library for every style', () => {
    Object.keys(DIET_STYLES).forEach((key) => {
      const plan = buildStylePlan(profile, key);

      expect(plan.key).toBe(key);
      expect(Number.isFinite(plan.calories)).toBe(true);
      ['protein', 'carbs', 'fat'].forEach((macro) => {
        expect(Number.isFinite(plan.macros[macro])).toBe(true);
        expect(plan.macros[macro]).toBeGreaterThan(0);
      });

      expect(plan.mealPlan.length).toBe(4);
      plan.mealPlan.forEach(({ slot, options }) => {
        expect(options.length).toBeGreaterThan(0);
        options.forEach((option) => {
          expect(Number.isFinite(option.calories)).toBe(true);
          expect(Number.isFinite(option.protein)).toBe(true);
        });
        expect(slot).toBeTruthy();
      });
    });
  });

  it('keeps macro calories within 5% of the style calorie target', () => {
    Object.keys(DIET_STYLES).forEach((key) => {
      const plan = buildStylePlan(profile, key);
      const macroCalories = plan.macros.protein * 4 + plan.macros.carbs * 4 + plan.macros.fat * 9;
      const drift = Math.abs(macroCalories - plan.calories) / plan.calories;

      expect(drift).toBeLessThan(0.05);
    });
  });

  it('caps protein at a safe 2.2g per kg ceiling', () => {
    Object.keys(DIET_STYLES).forEach((key) => {
      const plan = buildStylePlan(profile, key);
      expect(plan.macros.protein).toBeLessThanOrEqual(profile.weight * 2.2 + 1);
    });
  });

  it('scales portions down for weight loss and up for weight gain', () => {
    const shared = { weight: 70, height: 175, age: 30, gender: 'male', activityLevel: 'moderate' };
    const cut = buildStylePlan(buildNutritionProfile({ ...shared, goal: 'weight_loss' }), 'balanced');
    const maintain = buildStylePlan(buildNutritionProfile({ ...shared, goal: 'maintenance' }), 'balanced');
    const bulk = buildStylePlan(buildNutritionProfile({ ...shared, goal: 'weight_gain' }), 'balanced');

    const lunchKcal = (plan) => plan.mealPlan.find((m) => m.slot === 'lunch').options[0].calories;

    expect(lunchKcal(cut)).toBeLessThan(lunchKcal(maintain));
    expect(lunchKcal(bulk)).toBeGreaterThan(lunchKcal(maintain));
  });

  it('falls back to the default style for an unknown key', () => {
    const plan = buildStylePlan(profile, 'garbage-style');
    expect(plan.key).toBe('balanced');
  });

  it('honours dietary restrictions when suggesting a style', () => {
    expect(suggestStyle('maintenance', ['vegan'])).toBe('vegan');
    expect(suggestStyle('maintenance', ['Vegetarian'])).toBe('vegetarian');
    expect(suggestStyle('maintenance', ['vegetarian', 'dairy'])).toBe('vegan');
  });

  it('returns a known style for every goal', () => {
    ['weight_loss', 'maintenance', 'weight_gain'].forEach((goal) => {
      expect(isValidStyle(suggestStyle(goal, []))).toBe(true);
    });
  });
});

describe('local nutrition engine', () => {
  it('answers a macro review with the user\'s real remaining calories', () => {
    const result = answerLocally({ ...baseContext, lastMessage: 'Review my macronutrient balance today' });

    expect(result.intent).toBe('balance');
    expect(result.reply).toContain('1,000 kcal remaining');
    expect(result.reply).not.toContain('undefined');
    expect(result.reply).not.toContain('NaN');
  });

  it('respects an explicit calorie and protein budget from the question', () => {
    const result = answerLocally({ ...baseContext, lastMessage: 'Give me a 40g protein dinner under 550 kcal' });

    expect(result.reply).toContain('550 kcal');
    expect(result.reply).toContain('40g protein');

    const listedCalories = [...result.reply.matchAll(/— (\d+) kcal/g)].map((m) => Number(m[1]));
    expect(listedCalories.length).toBeGreaterThan(0);
    listedCalories.forEach((kcal) => expect(kcal).toBeLessThanOrEqual(550));
  });

  it('routes each supported intent to its own answer', () => {
    const cases = [
      ['best pre-workout snack 45 mins before training', 'workout'],
      ["Healthy late-night snack that won't spike insulin", 'lateNight'],
      ['What are healthy fat swaps for butter?', 'swap'],
      ['How much water should I drink today?', 'hydration'],
      ['Something for dinner', 'meal']
    ];

    cases.forEach(([question, expectedIntent]) => {
      const result = answerLocally({ ...baseContext, lastMessage: question });
      expect(result.intent).toBe(expectedIntent);
      expect(result.reply.length).toBeGreaterThan(50);
    });
  });

  it('falls back to a status summary for unrecognised questions', () => {
    const result = answerLocally({ ...baseContext, lastMessage: 'zzzz qqqq' });

    expect(result.intent).toBe('general');
    expect(result.reply).toContain('2,200 kcal');
    expect(result.reply).toContain('1,000 kcal remaining');
  });

  it('never emits undefined or NaN in any response', () => {
    const questions = [
      'review my macros', 'protein please', 'butter swap', 'water', 'late night',
      'pre-workout food', 'what about keto', 'i am vegan', 'random text'
    ];

    questions.forEach((question) => {
      const { reply } = answerLocally({ ...baseContext, lastMessage: question });
      expect(reply).not.toContain('undefined');
      expect(reply).not.toContain('NaN');
      expect(reply.length).toBeGreaterThan(0);
    });
  });

  it('handles a user with nothing logged today', () => {
    const result = answerLocally({
      ...baseContext,
      consumedCalories: 0,
      consumedProtein: 0,
      consumedCarbs: 0,
      consumedFat: 0,
      lastMessage: 'review my macros'
    });

    expect(result.reply).toContain('Nothing logged yet');
    expect(result.reply).not.toContain('NaN');
  });

  it('warns when the user is over target rather than encouraging a deficit', () => {
    const result = answerLocally({
      ...baseContext,
      consumedCalories: 2600,
      lastMessage: 'review my macros'
    });

    expect(result.reply).toContain('over');
  });

  it('surfaces dietary restrictions when the user asks about them', () => {
    const result = answerLocally({
      ...baseContext,
      dietaryRestrictions: ['dairy'],
      lastMessage: 'i have a dairy allergy, what should I avoid?'
    });

    expect(result.reply).toContain('dairy');
    expect(result.intent).toBe('restriction');
  });

  it('never suggests a food that conflicts with a saved restriction', () => {
    const restrictions = [
      ['vegan', /chicken|beef|pork|fish|salmon|cod|tuna|yogurt|cheese|egg|honey|whey|cottage/i],
      ['dairy', /yogurt|cheese|milk|feta|parmesan|cottage|whey/i],
      ['gluten-free', /bread|sourdough|oats|pasta|noodle|soba|granola/i],
      ['vegetarian', /chicken|beef|pork|turkey|fish|salmon|cod|tuna|shrimp|prawn/i]
    ];

    const questions = [
      'give me a 40g protein dinner under 600 kcal',
      'what can I eat for breakfast?',
      'protein ideas please',
      'late night snack',
      'something for lunch',
      'review my macros'
    ];

    restrictions.forEach(([restriction, pattern]) => {
      questions.forEach((question) => {
        const { reply } = answerLocally({
          ...baseContext,
          dietaryRestrictions: [restriction],
          lastMessage: question
        });

        // Only inspect the recommended food lines, not the explanatory prose
        const recommended = reply
          .split('\n')
          .filter((line) => line.startsWith('- **'))
          .join('\n');

        expect(recommended, `${restriction} / ${question}`).not.toMatch(pattern);
      });
    });
  });

  it('normalises restriction spellings before filtering', () => {
    const spellings = ['Gluten-Free', 'gluten free', 'Coeliac'];
    spellings.forEach((restriction) => {
      const { reply } = answerLocally({
        ...baseContext,
        dietaryRestrictions: [restriction],
        lastMessage: 'give me a breakfast under 500 kcal'
      });

      const recommended = reply.split('\n').filter((line) => line.startsWith('- **')).join('\n');
      expect(recommended).not.toMatch(/bread|sourdough|oats|granola|pancakes/i);
    });
  });

  it('closes a protein shortfall with a compliant booster when one exists', () => {
    const { reply } = answerLocally({
      ...baseContext,
      dietaryRestrictions: ['vegan'],
      lastMessage: 'give me a 40g protein dinner under 550 kcal'
    });

    expect(reply).toMatch(/Build it up|clears your 40g/);
    expect(reply).not.toMatch(/whey|chicken|cottage|yogurt/i);
  });

  it('routes a restriction-plus-meal question to the meal builder', () => {
    const result = answerLocally({
      ...baseContext,
      dietaryRestrictions: ['Gluten-Free'],
      lastMessage: 'what can I eat for lunch?'
    });

    expect(result.intent).toBe('meal');
    expect(result.reply).toContain('Lunch');
    expect(result.reply).not.toMatch(/^-+ .*(bread|sourdough)/m);
  });

  it('detects the meal slot named in the question', () => {
    const slots = [
      ['give me a breakfast with 30g protein', 'Breakfast'],
      ['something for lunch', 'Lunch'],
      ['I want a dinner option', 'Dinner'],
      ['a snack idea', 'Snack']
    ];

    slots.forEach(([question, expectedHeading]) => {
      const { reply } = answerLocally({ ...baseContext, lastMessage: question });
      expect(reply).toContain(`## ${expectedHeading} idea`);
    });
  });
});

describe('chatWithNutritionist', () => {
  it('returns a context-aware reply from the local engine when no API key is set', async () => {
    const previousKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';

    const result = await chatWithNutritionist(
      { ...baseContext },
      'review my macronutrient balance today'
    );

    expect(result.reply).toContain('1,000 kcal remaining');
    expect(result.provider).toBe('local');
    expect(result.source).toBe('Aura Local Nutrition Engine');

    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  });

  it('never throws for an empty history array or a malformed history payload', async () => {
    const previousKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';

    const histories = [
      [],
      [{ role: 'assistant', content: '' }],
      [{ role: 'assistant' }],
      [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }]
    ];

    for (const history of histories) {
      const result = await chatWithNutritionist({ ...baseContext }, 'what should I eat?', history);
      expect(typeof result.reply).toBe('string');
      expect(result.reply.length).toBeGreaterThan(0);
    }

    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  });
});