// WeightLog schema — tracks user's weight over time
const mongoose = require('mongoose');

const weightLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  weight: { type: Number, required: true, min: 20, max: 300 }, // kg
  note:   { type: String, default: '', trim: true, maxlength: 200 }
}, { timestamps: true });

// Compound index for chronological weight queries per user
weightLogSchema.index({ userId: 1, createdAt: 1 });

module.exports = mongoose.model('WeightLog', weightLogSchema);

