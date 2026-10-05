// Shared nutrition math — single source of truth for BMR / TDEE / macro targets.
// Every input is coerced and clamped so a missing or non-numeric profile field can
// never produce NaN and crash the response (NaN serialises to null over JSON).

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

const ACTIVITY_LABELS = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Very active',
  very_active: 'Athlete level'
};

const GOAL_LABELS = {
  weight_loss: 'Weight Loss',
  maintenance: 'Maintenance',
  weight_gain: 'Weight Gain'
};

const GOAL_ADJUSTMENT = {
  weight_loss: -500,
  maintenance: 0,
  weight_gain: 500
};

// Profile fallbacks — deliberately conservative, healthy adult defaults
const DEFAULTS = {
  weight: 70, // kg
  height: 170, // cm
  age: 25,
  gender: 'male',
  activityLevel: 'moderate',
  goal: 'maintenance'
};

const clamp = (value, min, max, fallback) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
};

const toNumber = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

// Water needs ~33ml per kg, and never below the 2L baseline
const calculateHydration = (weight) =>
  Math.round(Math.max(2, toNumber(weight, DEFAULTS.weight) * 0.033) * 10) / 10;

// Harris-Benedict equation
const calculateBMR = (weight, height, age, gender) => {
  const w = clamp(weight, 20, 300, DEFAULTS.weight);
  const h = clamp(height, 50, 280, DEFAULTS.height);
  const a = clamp(age, 10, 120, DEFAULTS.age);

  return gender === 'female'
    ? 447.593 + 9.247 * w + 3.098 * h - 4.33 * a
    : 88.362 + 13.397 * w + 4.799 * h - 5.677 * a;
};

const calculateTDEE = (bmr, activityLevel) => {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate;
  return Math.round(bmr * multiplier);
};

// Protein is driven by bodyweight and goal rather than a flat calorie percentage —
// that is what clinical practice actually does — while carbs/fat absorb the remainder.
const calculateMacros = ({ targetCalories, weight, goal }) => {
  const perKg = goal === 'weight_loss' ? 1.8 : goal === 'weight_gain' ? 1.9 : 1.6;
  const protein = Math.round(clamp(weight, 20, 300, DEFAULTS.weight) * perKg);

  // Keep protein inside a sane 25–40% of intake, then split the rest 60/40 carb/fat
  const proteinPct = clamp((protein * 4) / targetCalories, 0.25, 0.4, 0.3);
  const remaining = Math.max(0, targetCalories - protein * 4);

  const carbs = Math.round((remaining * 0.6) / 4);
  const fat = Math.round((remaining * 0.4) / 9);

  return {
    protein,
    carbs,
    fat,
    percentages: {
      protein: Math.round(proteinPct * 100),
      carbs: Math.round(0.6 * (1 - proteinPct) * 100),
      fat: Math.round(0.4 * (1 - proteinPct) * 100)
    }
  };
};

/**
 * Full energy + macro profile for a user document.
 * Never returns NaN — every field is a finite number.
 */
const buildNutritionProfile = (user = {}) => {
  const weight = clamp(user.weight, 20, 300, DEFAULTS.weight);
  const height = clamp(user.height, 50, 280, DEFAULTS.height);
  const age = clamp(user.age, 10, 120, DEFAULTS.age);
  const gender = user.gender === 'female' ? 'female' : DEFAULTS.gender;
  const activityLevel = ACTIVITY_MULTIPLIERS[user.activityLevel] ? user.activityLevel : DEFAULTS.activityLevel;
  const goal = GOAL_ADJUSTMENT[user.goal] !== undefined ? user.goal : DEFAULTS.goal;

  const bmr = Math.round(calculateBMR(weight, height, age, gender));
  const tdee = calculateTDEE(bmr, activityLevel);
  const calorieAdjustment = GOAL_ADJUSTMENT[goal];

  // Never prescribe below a gender-aware floor — aggressive deficits slow metabolism
  // and risk muscle loss, so clamp instead of handing back an unsafe target.
  const floor = gender === 'female' ? 1200 : 1500;
  const targetCalories = Math.max(floor, tdee + calorieAdjustment);

  return {
    bmr,
    tdee,
    targetCalories,
    calorieAdjustment: targetCalories - tdee,
    goal,
    goalLabel: GOAL_LABELS[goal],
    activityLevel,
    activityLabel: ACTIVITY_LABELS[activityLevel],
    weight,
    height,
    age,
    gender,
    macros: calculateMacros({ targetCalories, weight, goal }),
    hydration: calculateHydration(weight)
  };
};

module.exports = {
  ACTIVITY_MULTIPLIERS,
  ACTIVITY_LABELS,
  GOAL_LABELS,
  GOAL_ADJUSTMENT,
  DEFAULTS,
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  calculateHydration,
  buildNutritionProfile
};