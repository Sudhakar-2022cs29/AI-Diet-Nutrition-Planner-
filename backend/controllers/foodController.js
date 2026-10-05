// Food controller — food detection, calorie lookup, and aggregation-driven CRUD
const FoodLog = require('../models/FoodLog');
const fetch = require('node-fetch');
const cacheService = require('../config/redis');
const AppError = require('../utils/AppError');

// Built-in food database for offline/demo reliability
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
  soup:        { calories: 50,  protein: 2,   carbs: 9,  fat: 0.8, fiber: 1 }
};

// Healthier alternative suggestions
const alternatives = {
  pizza:       ['Whole wheat vegetable pizza', 'Cauliflower crust pizza', 'Grilled chicken wrap'],
  burger:      ['Grilled chicken burger', 'Veggie burger', 'Turkey burger with salad'],
  pasta:       ['Whole wheat pasta', 'Zucchini noodles (zoodles)', 'Lentil pasta'],
  chocolate:   ['Dark chocolate (70%+)', 'Mixed berries', 'Dates with almond butter'],
  bread:       ['Whole grain bread', 'Sourdough bread', 'Rice cakes'],
  rice:        ['Brown rice', 'Quinoa', 'Cauliflower rice'],
  sandwich:    ['Whole wheat wrap', 'Lettuce wrap', 'Pita with hummus']
};

/**
 * Look up a food item with Redis caching & CalorieNinjas API
 */
const lookupFood = async (foodName) => {
  const cleanName = foodName.toLowerCase().trim();
  const cacheKey = `food:query:${cleanName}`;

  // 1. Check Redis / memory cache
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.CALORIENINJAS_API_KEY;

  // 2. Query CalorieNinjas API if key is present
  if (apiKey && apiKey.trim() !== '') {
    try {
      const response = await fetch(
        `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(foodName)}`,
        { headers: { 'X-Api-Key': apiKey } }
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const result = {
          foodName: item.name,
          calories: Math.round(item.calories),
          protein:  Math.round(item.protein_g),
          carbs:    Math.round(item.carbohydrates_total_g),
          fat:      Math.round(item.fat_total_g),
          fiber:    Math.round(item.fiber_g),
          serving:  `${item.serving_size_g}g`,
          source:   'CalorieNinjas API'
        };

        // Cache 24 hours
        await cacheService.set(cacheKey, result, 86400);
        return result;
      }
    } catch (err) {
      console.warn('CalorieNinjas API failed, falling back:', err.message);
    }
  }

  // 3. Fall back to local database
  let match = mockFoodDatabase[cleanName];
  if (!match) {
    const matchKey = Object.keys(mockFoodDatabase).find(k => cleanName.includes(k) || k.includes(cleanName));
    if (matchKey) match = mockFoodDatabase[matchKey];
  }

  if (match) {
    const result = {
      foodName,
      calories: match.calories,
      protein:  match.protein,
      carbs:    match.carbs,
      fat:      match.fat,
      fiber:    match.fiber,
      serving:  '100g',
      source:   'Verified Nutrition DB'
    };
    await cacheService.set(cacheKey, result, 86400);
    return result;
  }

  // 4. Default estimation
  const result = {
    foodName,
    calories: 150,
    protein:  5,
    carbs:    20,
    fat:      5,
    fiber:    2,
    serving:  '100g',
    source:   'Estimated'
  };
  await cacheService.set(cacheKey, result, 3600);
  return result;
};

// @route  POST /api/food/detect
// @desc   Detect food and get nutrition info
// @access Private
const detectFood = async (req, res, next) => {
  try {
    const { foodName } = req.body;
    const nutritionData = await lookupFood(foodName);

    const key = foodName.toLowerCase().trim();
    const altKey = Object.keys(alternatives).find(k => key.includes(k));
    nutritionData.alternatives = altKey ? alternatives[altKey] : ['Boost vegetable portion', 'Add seasonal fruits', 'Choose whole grains'];

    res.json(nutritionData);
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/food/log
// @desc   Add food to today's log
// @access Private
const addFoodLog = async (req, res, next) => {
  try {
    const { foodName, calories, protein, carbs, fat, fiber, serving, mealType, source, imageUrl, date } = req.body;

    const logDate = date ? new Date(date) : new Date();
    const normalizedDate = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());

    const log = await FoodLog.create({
      userId:   req.user._id,
      foodName,
      calories,
      protein:  protein || 0,
      carbs:    carbs || 0,
      fat:      fat || 0,
      fiber:    fiber || 0,
      serving:  serving || '100g',
      mealType: mealType || 'snack',
      source:   source || 'Manual',
      imageUrl: imageUrl || null,
      date:     normalizedDate
    });

    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/food/log
// @desc   Get today's food log using MongoDB Aggregation Pipeline ($facet)
// @access Private
const getTodayLog = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // MongoDB Aggregation Pipeline for fast parallel aggregation and log listing
    const [result] = await FoodLog.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $facet: {
          logs: [
            { $sort: { createdAt: -1 } }
          ],
          totals: [
            {
              $group: {
                _id: null,
                calories: { $sum: '$calories' },
                protein:  { $sum: '$protein' },
                carbs:    { $sum: '$carbs' },
                fat:      { $sum: '$fat' },
                fiber:    { $sum: '$fiber' }
              }
            }
          ]
        }
      }
    ]);

    const logs = result?.logs || [];
    const totals = result?.totals?.[0] || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    delete totals._id;

    res.json({ logs, totals });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/food/weekly
// @desc   Get the last 7 days of calorie data via MongoDB aggregation
// @access Private
const getWeeklyData = async (req, res, next) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);

    // Aggregate daily totals on database layer
    const dailyTotals = await FoodLog.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          calories: { $sum: '$calories' },
          protein:  { $sum: '$protein' },
          carbs:    { $sum: '$carbs' },
          fat:      { $sum: '$fat' }
        }
      }
    ]);

    const totalsMap = new Map();
    dailyTotals.forEach(item => totalsMap.set(item._id, item));

    // Fill in last 7 consecutive days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;

      const stat = totalsMap.get(key);
      days.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        dateKey: key,
        calories: stat ? Math.round(stat.calories) : 0,
        protein:  stat ? Math.round(stat.protein) : 0,
        carbs:    stat ? Math.round(stat.carbs) : 0,
        fat:      stat ? Math.round(stat.fat) : 0
      });
    }

    res.json(days);
  } catch (error) {
    next(error);
  }
};

// @route  DELETE /api/food/log/:id
// @desc   Delete a food log entry
// @access Private
const deleteFoodLog = async (req, res, next) => {
  try {
    const log = await FoodLog.findById(req.params.id);
    if (!log) return next(new AppError('Log entry not found', 404));

    if (log.userId.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to delete this entry', 403));
    }

    await FoodLog.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Food log entry deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  detectFood,
  addFoodLog,
  getTodayLog,
  getWeeklyData,
  deleteFoodLog
};

