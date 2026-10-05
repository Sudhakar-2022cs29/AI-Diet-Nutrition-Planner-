// Diet planner controller — energy/macro targets plus selectable named diet styles
const { buildNutritionProfile } = require('../utils/nutrition');
const { listStyles, isValidStyle, suggestStyle, buildStylePlan, DEFAULT_STYLE } = require('../services/dietStyles');

// @route  GET /api/diet/recommendation
// @desc   Get personalized daily energy target + diet style plan
// @access Private
const getRecommendation = async (req, res) => {
  try {
    const user = req.user;
    const profile = buildNutritionProfile(user);

    const requested = req.query.style;
    const selected = isValidStyle(requested) ? requested : suggestStyle(profile.goal, user.dietaryRestrictions);
    const plan = buildStylePlan(profile, selected);

    const goalDescription = {
      weight_loss:
        `Weight Loss — ${Math.abs(profile.calorieAdjustment)} calorie deficit for sustainable fat loss (~0.5kg/week)`,
      weight_gain:
        `Weight Gain — ${profile.calorieAdjustment} calorie surplus for lean muscle building (~0.5kg/week)`,
      maintenance: 'Maintenance — keeping your current weight stable'
    }[profile.goal];

    res.json({
      bmr: profile.bmr,
      tdee: profile.tdee,
      targetCalories: profile.targetCalories,
      calorieAdjustment: profile.calorieAdjustment,
      goal: profile.goal,
      goalLabel: profile.goalLabel,
      goalDescription,
      activityLevel: profile.activityLevel,
      activityLabel: profile.activityLabel,
      profile: {
        weight: profile.weight,
        height: profile.height,
        age: profile.age,
        gender: profile.gender
      },
      // Default macros plus the style-adjusted plan, so existing UI keeps working
      macros: profile.macros,
      macrosPlan: plan.macros,
      hydration: profile.hydration,
      availableStyles: listStyles(),
      suggestedStyle: suggestStyle(profile.goal, user.dietaryRestrictions),
      selectedStyle: selected,
      isDefaultStyle: selected === DEFAULT_STYLE,
      plan: {
        ...plan,
        // Flat map retained for backwards compatibility with the mealSuggestions shape
        mealSuggestions: Object.fromEntries(plan.mealPlan.map(({ slot, options }) => [slot, options.map((o) => o.name)]))
      },
      mealSuggestions: Object.fromEntries(plan.mealPlan.map(({ slot, options }) => [slot, options.map((o) => o.name)]))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating recommendation', error: error.message });
  }
};

// @route  GET /api/diet/styles
// @desc   List selectable diet styles (auth required so it can use user restrictions)
// @access Private
const getStyles = async (req, res) => {
  try {
    const profile = buildNutritionProfile(req.user);
    res.json({
      styles: listStyles(),
      suggested: suggestStyle(profile.goal, req.user.dietaryRestrictions),
      dietaryRestrictions: req.user.dietaryRestrictions || []
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading diet styles', error: error.message });
  }
};

module.exports = { getRecommendation, getStyles };