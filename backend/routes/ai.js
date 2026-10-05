const express = require('express');
const router = express.Router();
const { scanFood, chat, scanBarcode } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { aiScanSchema, aiChatSchema } = require('../validators/schemas');
const rateLimit = require('express-rate-limit');

// Protect AI routes from abuse with a specific rate limiter
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { status: 'fail', message: 'Too many AI requests. Please slow down.' }
});

router.use(protect);
router.use(aiLimiter);

router.post('/scan-food', validate(aiScanSchema), scanFood);
router.post('/chat', validate(aiChatSchema), chat);
router.get('/barcode/:barcode', scanBarcode);

module.exports = router;

