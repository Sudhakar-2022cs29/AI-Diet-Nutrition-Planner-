// Diet planner controller — calculates calorie needs + meal suggestions
const User = require('../models/User');

// Activity level multipliers (Harris-Benedict formula)
const activityMultipliers = {
  sedentary:  1.2,
  light:      1.375,
  moderate:   1.55,
  active:     1.725,
  very_active: 1.9
};

// Calculate Basal Metabolic Rate (BMR) using Harris-Benedict equation
const calculateBMR = (weight, height, age, gender) => {
  if (gender === 'female') {
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
  // Male formula
  return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
};

// Meal suggestion database based on goals
const mealSuggestions = {
  weight_loss: {
    breakfast: ['Oatmeal with berries & nuts', 'Greek yogurt with fruit', 'Egg whites with spinach omelette', 'Smoothie with protein powder'],
    lunch:     ['Grilled chicken salad', 'Lentil soup with whole grain bread', 'Turkey wrap with veggies', 'Quinoa & vegetable bowl'],
    dinner:    ['Grilled salmon with steamed broccoli', 'Chicken stir-fry with veggies', 'Baked cod with sweet potato', 'Lean beef with green beans'],
    snacks:    ['Apple slices with almond butter', 'Carrot sticks', 'Handful of mixed nuts', 'Celery with hummus']
  },
  maintenance: {
    breakfast: ['Whole grain toast with avocado & eggs', 'Granola with milk and fruit', 'Pancakes with berries', 'Overnight oats'],
    lunch:     ['Chicken rice bowl', 'Pasta with marinara sauce', 'Tuna sandwich on whole wheat', 'Buddha bowl with tahini'],
    dinner:    ['Pasta with chicken & vegetables', 'Rice with grilled fish & salad', 'Chicken curry with brown rice', 'Beef stew with root vegetables'],
    snacks:    ['Fruit & nut mix', 'Yogurt parfait', 'Whole grain crackers with cheese', 'Banana with peanut butter']
  },
  weight_gain: {
    breakfast: ['Large omelette with cheese (4 eggs)', 'Protein smoothie with oats & banana', 'Peanut butter toast with banana & milk', 'Full English breakfast'],
    lunch:     ['Double chicken rice bowl', 'Large whole wheat pasta with meat sauce', 'Big burrito with rice & beans', 'Whole grain wrap with chicken, avocado & cheese'],
    dinner:    ['Steak with baked potato & vegetables', 'Large salmon with rice & vegetables', 'Chicken pasta primavera', 'Beef burger on whole grain bun with sweet potato fries'],
    snacks:    ['Mass gainer shake', 'Cheese & crackers with nuts', 'Protein bar', 'Peanut butter sandwich']
  }
};

// @route  GET /api/diet/recommendation
// @desc   Get personalized daily calorie recommendation
// @access Private
const getRecommendation = async (req, res) => {
  try {
    const user = req.user;

    // Calculate BMR
    const bmr = calculateBMR(user.weight, user.height, user.age, user.gender);

    // Calculate TDEE (Total Daily Energy Expenditure)
    const multiplier = activityMultipliers[user.activityLevel] || 1.55;
    const tdee = Math.round(bmr * multiplier);

    // Adjust based on goal
    let targetCalories;
    let goalDescription;
    let calorieAdjustment;

    switch (user.goal) {
      case 'weight_loss':
        targetCalories   = tdee - 500; // 500 cal deficit = ~0.5kg/week loss
        goalDescription  = 'Weight Loss — 500 calorie deficit for sustainable fat loss (~0.5kg/week)';
        calorieAdjustment = -500;
        break;
      case 'weight_gain':
        targetCalories   = tdee + 500; // 500 cal surplus = ~0.5kg/week gain
        goalDescription  = 'Weight Gain — 500 calorie surplus for lean muscle building (~0.5kg/week)';
        calorieAdjustment = +500;
        break;
      default:
        targetCalories   = tdee;
        goalDescription  = 'Maintenance — keeping your current weight stable';
        calorieAdjustment = 0;
    }

    // Macronutrient targets (general guidelines)
    const macros = {
      protein:  Math.round((targetCalories * 0.30) / 4),  // 30% of calories from protein (4 cal/g)
      carbs:    Math.round((targetCalories * 0.40) / 4),  // 40% from carbs
      fat:      Math.round((targetCalories * 0.30) / 9),  // 30% from fat (9 cal/g)
    };

    const suggestions = mealSuggestions[user.goal] || mealSuggestions.maintenance;

    res.json({
      bmr:              Math.round(bmr),
      tdee,
      targetCalories,
      calorieAdjustment,
      goal:             user.goal,
      goalDescription,
      macros,
      mealSuggestions: suggestions,
      hydration:        Math.round(user.weight * 0.033 * 10) / 10, // ~33ml per kg
    });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating recommendation', error: error.message });
  }
};

module.exports = { getRecommendation };
