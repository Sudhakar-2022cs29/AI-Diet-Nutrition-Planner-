// Food controller — food detection, calorie lookup, CRUD for food logs
const FoodLog = require('../models/FoodLog');
const fetch = require('node-fetch');

// ── Mock food database (used when API key is not set or API fails) ──────────
const mockFoodDatabase = {
  pizza:       { calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2.3 },
  apple:       { calories: 52,  protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 },
  banana:      { calories: 89,  protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6 },
  rice:        { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  chicken:     { calories: 165, protein: 31,  carbs: 0,  fat: 3.6, fiber: 0 },
  egg:         { calories: 155, protein: 13,  carbs: 1.1,fat: 11,  fiber: 0 },
  bread:       { calories: 265, protein: 9,   carbs: 49, fat: 3.2, fiber: 2.7 },
  milk:        { calories: 42,  protein: 3.4, carbs: 5,  fat: 1,   fiber: 0 },
  salad:       { calories: 20,  protein: 1.8, carbs: 3.5,fat: 0.2, fiber: 2 },
  burger:      { calories: 295, protein: 17,  carbs: 24, fat: 14,  fiber: 1.3 },
  pasta:       { calories: 220, protein: 8,   carbs: 43, fat: 1.3, fiber: 2.5 },
  salmon:      { calories: 208, protein: 20,  carbs: 0,  fat: 13,  fiber: 0 },
  broccoli:    { calories: 34,  protein: 2.8, carbs: 7,  fat: 0.4, fiber: 2.6 },
  yogurt:      { calories: 59,  protein: 3.5, carbs: 3.6,fat: 3.3, fiber: 0 },
  oatmeal:     { calories: 68,  protein: 2.4, carbs: 12, fat: 1.4, fiber: 1.7 },
  sandwich:    { calories: 250, protein: 12,  carbs: 30, fat: 8,   fiber: 2 },
  orange:      { calories: 47,  protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4 },
  chocolate:   { calories: 546, protein: 5,   carbs: 60, fat: 31,  fiber: 7 },
  steak:       { calories: 271, protein: 26,  carbs: 0,  fat: 18,  fiber: 0 },
  soup:        { calories: 50,  protein: 2,   carbs: 9,  fat: 0.8, fiber: 1 },
};

// Healthier alternative suggestions
const alternatives = {
  pizza:       ['Whole wheat vegetable pizza', 'Cauliflower crust pizza', 'Grilled chicken wrap'],
  burger:      ['Grilled chicken burger', 'Veggie burger', 'Turkey burger with salad'],
  pasta:       ['Whole wheat pasta', 'Zucchini noodles (zoodles)', 'Lentil pasta'],
  chocolate:   ['Dark chocolate (70%+)', 'Mixed berries', 'Dates with almond butter'],
  bread:       ['Whole grain bread', 'Sourdough bread', 'Rice cakes'],
  rice:        ['Brown rice', 'Quinoa', 'Cauliflower rice'],
  sandwich:    ['Whole wheat wrap', 'Lettuce wrap', 'Pita with hummus'],
};

// Look up a food by name — tries CalorieNinjas API first, falls back to mock DB
const lookupFood = async (foodName) => {
  const apiKey = process.env.CALORIENINJAS_API_KEY;

  // Use real API if key is provided
  if (apiKey && apiKey.trim() !== '') {
    try {
      const response = await fetch(
        `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(foodName)}`,
        { headers: { 'X-Api-Key': apiKey } }
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        return {
          foodName: item.name,
          calories: Math.round(item.calories),
          protein:  Math.round(item.protein_g),
          carbs:    Math.round(item.carbohydrates_total_g),
          fat:      Math.round(item.fat_total_g),
          fiber:    Math.round(item.fiber_g),
          serving:  `${item.serving_size_g}g`,
          source:   'CalorieNinjas API'
        };
      }
    } catch (err) {
      console.log('CalorieNinjas API failed, using mock database:', err.message);
    }
  }

  // Fall back to mock database
  const key = foodName.toLowerCase().trim();
  // Try exact match first, then partial
  let match = mockFoodDatabase[key];
  if (!match) {
    const matchKey = Object.keys(mockFoodDatabase).find(k => key.includes(k) || k.includes(key));
    if (matchKey) match = mockFoodDatabase[matchKey];
  }

  if (match) {
    return {
      foodName: foodName,
      calories: match.calories,
      protein:  match.protein,
      carbs:    match.carbs,
      fat:      match.fat,
      fiber:    match.fiber,
      serving:  '100g',
      source:   'Simulation (Demo)'
    };
  }

  // Unknown food — return estimated values
  return {
    foodName: foodName,
    calories: 150,
    protein:  5,
    carbs:    20,
    fat:      5,
    fiber:    2,
    serving:  '100g',
    source:   'Estimated'
  };
};

// @route  POST /api/food/detect
// @desc   Detect food and get nutrition info
// @access Private
const detectFood = async (req, res) => {
  try {
    const { foodName } = req.body;
    if (!foodName) return res.status(400).json({ message: 'Food name is required' });

    const nutritionData = await lookupFood(foodName);

    // Include healthier alternatives if available
    const key = foodName.toLowerCase().trim();
    const altKey = Object.keys(alternatives).find(k => key.includes(k));
    nutritionData.alternatives = altKey ? alternatives[altKey] : ['Try more vegetables!', 'Add fruits to your diet', 'Choose whole grains'];

    res.json(nutritionData);
  } catch (error) {
    res.status(500).json({ message: 'Error detecting food', error: error.message });
  }
};

// @route  POST /api/food/log
// @desc   Add food to today's log
// @access Private
const addFoodLog = async (req, res) => {
  try {
    const { foodName, calories, protein, carbs, fat, fiber, serving, mealType } = req.body;

    const log = await FoodLog.create({
      userId:   req.user._id,
      foodName, calories, protein, carbs, fat, fiber,
      serving:  serving || '100g',
      mealType: mealType || 'snack'
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: 'Error adding food log', error: error.message });
  }
};

// @route  GET /api/food/log
// @desc   Get today's food log for the user
// @access Private
const getTodayLog = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const logs = await FoodLog.find({
      userId: req.user._id,
      date: { $gte: startOfDay, $lt: endOfDay }
    }).sort({ createdAt: -1 });

    // Calculate totals
    const totals = logs.reduce((acc, log) => {
      acc.calories += log.calories;
      acc.protein  += log.protein;
      acc.carbs    += log.carbs;
      acc.fat      += log.fat;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    res.json({ logs, totals });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching food log', error: error.message });
  }
};

// @route  GET /api/food/weekly
// @desc   Get the last 7 days of calorie data for charts
// @access Private
const getWeeklyData = async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const logs = await FoodLog.find({
      userId: req.user._id,
      date: { $gte: sevenDaysAgo }
    });

    // Group by date — build a map for the last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({
        date:     d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        dateKey:  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        calories: 0,
        protein:  0,
        carbs:    0,
        fat:      0
      });
    }

    // Sum calories for each day
    logs.forEach(log => {
      const logDate = new Date(log.date);
      const key = `${logDate.getFullYear()}-${logDate.getMonth()}-${logDate.getDate()}`;
      const day = days.find(d => d.dateKey === key);
      if (day) {
        day.calories += log.calories;
        day.protein  += log.protein;
        day.carbs    += log.carbs;
        day.fat      += log.fat;
      }
    });

    res.json(days);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching weekly data', error: error.message });
  }
};

// @route  DELETE /api/food/log/:id
// @desc   Delete a food log entry
// @access Private
const deleteFoodLog = async (req, res) => {
  try {
    const log = await FoodLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log entry not found' });

    // Make sure user owns this entry
    if (log.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this entry' });
    }

    await FoodLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Food log entry deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting food log', error: error.message });
  }
};

module.exports = { detectFood, addFoodLog, getTodayLog, getWeeklyData, deleteFoodLog };
