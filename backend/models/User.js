// User schema — stores profile info + auth credentials + refresh token family
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false // Exclude from queries by default for security
  },
  // Physical stats for calorie calculations
  weight: { type: Number, default: 70, min: 20, max: 300 },    // kg
  height: { type: Number, default: 170, min: 50, max: 280 },   // cm
  age:    { type: Number, default: 25, min: 10, max: 120 },
  gender: { type: String, enum: ['male', 'female'], default: 'male' },
  // User's fitness goal
  goal: {
    type: String,
    enum: ['weight_loss', 'maintenance', 'weight_gain'],
    default: 'maintenance'
  },
  activityLevel: {
    type: String,
    enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    default: 'moderate'
  },
  dietaryRestrictions: {
    type: [String],
    default: []
  },
  // Rotating refresh tokens array for secure session management
  refreshTokens: {
    type: [String],
    default: [],
    select: false
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

