// FoodLog schema — records each food item a user eats
const mongoose = require('mongoose');

const foodLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  foodName: {
    type: String,
    required: true,
    trim: true
  },
  calories:  { type: Number, required: true, default: 0, min: 0 },
  protein:   { type: Number, default: 0, min: 0 },
  carbs:     { type: Number, default: 0, min: 0 },
  fat:       { type: Number, default: 0, min: 0 },
  fiber:     { type: Number, default: 0, min: 0 },
  serving:   { type: String, default: '100g' },
  mealType:  { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], default: 'snack' },
  source:    { type: String, default: 'Manual' }, // 'Manual', 'Gemini 2.5 Vision AI', 'Barcode', 'CalorieNinjas'
  imageUrl:  { type: String, default: null },
  date: {
    type: Date,
    default: () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    },
    index: true
  }
}, { timestamps: true });

// Compound index for instant querying of a user's daily food logs
foodLogSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('FoodLog', foodLogSchema);
