// Diet planner routes
const express = require('express');
const router = express.Router();
const { getRecommendation } = require('../controllers/dietController');
const { protect } = require('../middleware/auth');

router.get('/recommendation', protect, getRecommendation);

module.exports = router;
