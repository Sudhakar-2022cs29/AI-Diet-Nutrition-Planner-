// WeightLog schema — tracks user's weight over time
const mongoose = require('mongoose');

const weightLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  weight: { type: Number, required: true }, // kg
  note:   { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('WeightLog', weightLogSchema);
