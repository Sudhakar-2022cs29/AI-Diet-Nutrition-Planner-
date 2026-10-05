// Diet planner routes
const express = require('express');
const router = express.Router();
const { getRecommendation, getStyles } = require('../controllers/dietController');
const { protect } = require('../middleware/auth');

router.get('/recommendation', protect, getRecommendation);
router.get('/styles', protect, getStyles);

module.exports = router;