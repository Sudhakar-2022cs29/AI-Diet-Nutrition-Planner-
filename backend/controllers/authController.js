// Auth controller — handles user registration, login, token rotation, and profile management
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const ACCESS_TOKEN_EXPIRY = '30d'; // Keep 30d for compatibility or 15m for high security
const REFRESH_TOKEN_EXPIRY = '7d';

const signTokens = (id) => {
  const accessToken = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });

  const refreshToken = jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY
  });

  return { accessToken, refreshToken };
};

const sendTokenResponse = async (user, statusCode, res) => {
  const { accessToken, refreshToken } = signTokens(user._id);

  // Store refresh token in user document
  user.refreshTokens = user.refreshTokens || [];
  user.refreshTokens.push(refreshToken);
  if (user.refreshTokens.length > 5) user.refreshTokens.shift(); // keep max 5 active sessions
  await user.save({ validateBeforeSave: false });

  // Cookie options
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);
  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

  res.status(statusCode).json({
    status: 'success',
    _id: user._id,
    name: user.name,
    email: user.email,
    weight: user.weight,
    height: user.height,
    age: user.age,
    gender: user.gender,
    goal: user.goal,
    activityLevel: user.activityLevel,
    dietaryRestrictions: user.dietaryRestrictions || [],
    token: accessToken, // Backward compatibility
    accessToken,
    refreshToken
  });
};

// @route  POST /api/auth/signup
// @desc   Register a new user
// @access Public
const signup = async (req, res, next) => {
  try {
    const { name, email, password, weight, height, age, gender, goal, activityLevel, dietaryRestrictions } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('A user with this email address already exists.', 400, 'EMAIL_EXISTS'));
    }

    const user = await User.create({
      name,
      email,
      password,
      weight: weight || 70,
      height: height || 170,
      age: age || 25,
      gender: gender || 'male',
      goal: goal || 'maintenance',
      activityLevel: activityLevel || 'moderate',
      dietaryRestrictions: dietaryRestrictions || []
    });

    await sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/auth/login
// @desc   Authenticate user and issue tokens
// @access Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.matchPassword(password))) {
      return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/auth/refresh
// @desc   Refresh access token using valid refresh token
// @access Public
const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return next(new AppError('Refresh token not provided', 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
    } catch (err) {
      return next(new AppError('Invalid or expired refresh token', 403));
    }

    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      // Possible reuse / token theft detected: clear all tokens for security
      if (user) {
        user.refreshTokens = [];
        await user.save({ validateBeforeSave: false });
      }
      return next(new AppError('Token reuse or revocation detected. Please login again.', 403));
    }

    // Rotate refresh token
    const { accessToken, refreshToken: newRefreshToken } = signTokens(user._id);
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      status: 'success',
      token: accessToken,
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/auth/logout
// @desc   Log user out and revoke refresh token
// @access Private
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (refreshToken && req.user) {
      const user = await User.findById(req.user._id).select('+refreshTokens');
      if (user) {
        user.refreshTokens = (user.refreshTokens || []).filter(t => t !== refreshToken);
        await user.save({ validateBeforeSave: false });
      }
    }

    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');

    res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/auth/profile
// @desc   Get current user profile
// @access Private
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @route  PUT /api/auth/profile
// @desc   Update user profile
// @access Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, weight, height, age, gender, goal, activityLevel, dietaryRestrictions } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, weight, height, age, gender, goal, activityLevel, dietaryRestrictions },
      { new: true, runValidators: true }
    );

    res.json(user);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  refreshAccessToken,
  logout,
  getProfile,
  updateProfile
};

