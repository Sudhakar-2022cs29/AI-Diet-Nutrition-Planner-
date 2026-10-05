const { analyzeFoodImage, chatWithNutritionist } = require('../services/geminiService');
const { lookupBarcode } = require('../services/openFoodFactsService');
const { buildNutritionProfile } = require('../utils/nutrition');
const FoodLog = require('../models/FoodLog');
const AppError = require('../utils/AppError');

// @route  POST /api/ai/scan-food
// @desc   Detect meal items, portions and macros from photo
// @access Private
const scanFood = async (req, res, next) => {
  try {
    const { imageBase64, mimeType, mealContext } = req.body;
    if (!imageBase64) {
      return next(new AppError('Image base64 data is required', 400));
    }

    const result = await analyzeFoodImage(
      imageBase64,
      mimeType,
      mealContext,
      req.user?.dietaryRestrictions || []
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/ai/chat
// @desc   Context-aware AI Nutritionist consultation
// @access Private
const chat = async (req, res, next) => {
  try {
    const { message, history, mealContext } = req.body;
    const user = req.user;

    // Fetch today's consumed macros from DB for real context
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const logs = await FoodLog.find({
      userId: user._id,
      date: { $gte: startOfDay, $lt: endOfDay }
    });

    const consumed = logs.reduce((acc, l) => {
      acc.calories += l.calories || 0;
      acc.protein += l.protein || 0;
      acc.carbs += l.carbs || 0;
      acc.fat += l.fat || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Shared with /api/diet/recommendation so the coach and the planner can never disagree
    const profile = buildNutritionProfile(user);

    const userContext = {
      name: user.name,
      goal: profile.goal,
      goalLabel: profile.goalLabel,
      activityLevel: profile.activityLevel,
      activityLabel: profile.activityLabel,
      age: profile.age,
      dietaryRestrictions: user.dietaryRestrictions || [],
      weight: profile.weight,
      height: profile.height,
      targetCalories: profile.targetCalories,
      proteinTarget: profile.macros.protein,
      carbsTarget: profile.macros.carbs,
      fatTarget: profile.macros.fat,
      hydration: profile.hydration,
      consumedCalories: Math.round(consumed.calories),
      consumedProtein: Math.round(consumed.protein),
      consumedCarbs: Math.round(consumed.carbs),
      consumedFat: Math.round(consumed.fat),
      loggedToday: logs.map((l) => ({ foodName: l.foodName, calories: l.calories, mealType: l.mealType })),
      mealContext: mealContext || null
    };

    const aiResponse = await chatWithNutritionist(userContext, message, history);
    res.json(aiResponse);
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/ai/barcode/:barcode
// @desc   Look up nutritional facts by product barcode
// @access Private
const scanBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    if (!barcode) {
      return next(new AppError('Barcode parameter is required', 400));
    }

    const product = await lookupBarcode(barcode);
    if (!product) {
      return next(new AppError(`No nutritional product found for barcode ${barcode}`, 404));
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanFood,
  chat,
  scanBarcode
};