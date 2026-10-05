const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  refreshAccessToken,
  logout,
  getProfile,
  updateProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { signupSchema, loginSchema, updateProfileSchema } = require('../validators/schemas');
const rateLimit = require('express-rate-limit');

// Strict rate limiter for auth authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 min per IP
  message: { status: 'fail', message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', protect, logout);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, validate(updateProfileSchema), updateProfile);

module.exports = router;

