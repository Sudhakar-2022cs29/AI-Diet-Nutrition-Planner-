// Food routes
const express = require('express');
const router = express.Router();
const { detectFood, addFoodLog, getTodayLog, getWeeklyData, deleteFoodLog } = require('../controllers/foodController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.post('/detect', protect, detectFood);
router.post('/log', protect, addFoodLog);
router.get('/log', protect, getTodayLog);
router.get('/weekly', protect, getWeeklyData);
router.delete('/log/:id', protect, deleteFoodLog);

module.exports = router;
