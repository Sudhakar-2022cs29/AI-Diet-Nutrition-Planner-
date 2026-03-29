// Auth controller — handles user registration and login
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate a JWT token for a user
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d' // Token valid for 30 days
  });
};

// @route  POST /api/auth/signup
// @desc   Register a new user
// @access Public
const signup = async (req, res) => {
  try {
    const { name, email, password, weight, height, age, gender, goal, activityLevel } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user (password is automatically hashed by the User model pre-save hook)
    const user = await User.create({
      name, email, password,
      weight:        weight        || 70,
      height:        height        || 170,
      age:           age           || 25,
      gender:        gender        || 'male',
      goal:          goal          || 'maintenance',
      activityLevel: activityLevel || 'moderate'
    });

    // Return user data + token
    res.status(201).json({
      _id:           user._id,
      name:          user.name,
      email:         user.email,
      weight:        user.weight,
      height:        user.height,
      age:           user.age,
      gender:        user.gender,
      goal:          user.goal,
      activityLevel: user.activityLevel,
      token:         generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
};

// @route  POST /api/auth/login
// @desc   Authenticate user and get token
// @access Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id:           user._id,
      name:          user.name,
      email:         user.email,
      weight:        user.weight,
      height:        user.height,
      age:           user.age,
      gender:        user.gender,
      goal:          user.goal,
      activityLevel: user.activityLevel,
      token:         generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// @route  GET /api/auth/profile
// @desc   Get current user profile
// @access Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// @route  PUT /api/auth/profile
// @desc   Update user profile
// @access Private
const updateProfile = async (req, res) => {
  try {
    const { name, weight, height, age, gender, goal, activityLevel } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, weight, height, age, gender, goal, activityLevel },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

module.exports = { signup, login, getProfile, updateProfile };
