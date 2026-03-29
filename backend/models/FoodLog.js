// FoodLog schema — records each food item a user eats
const mongoose = require('mongoose');

const foodLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  foodName: {
    type: String,
    required: true,
    trim: true
  },
  calories:  { type: Number, required: true, default: 0 },
  // Macronutrients (optional, from API)
  protein:   { type: Number, default: 0 },  // grams
  carbs:     { type: Number, default: 0 },  // grams
  fat:       { type: Number, default: 0 },  // grams
  fiber:     { type: Number, default: 0 },  // grams
  serving:   { type: String, default: '100g' },
  mealType:  { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], default: 'snack' },
  // Date without time for easy daily queries
  date: {
    type: Date,
    default: () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('FoodLog', foodLogSchema);
