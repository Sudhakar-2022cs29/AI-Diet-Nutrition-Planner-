const express = require('express');
const router = express.Router();
const {
  detectFood,
  addFoodLog,
  getTodayLog,
  getWeeklyData,
  deleteFoodLog
} = require('../controllers/foodController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { foodDetectSchema, foodLogSchema } = require('../validators/schemas');

router.use(protect);

router.post('/detect', validate(foodDetectSchema), detectFood);
router.post('/log', validate(foodLogSchema), addFoodLog);
router.get('/log', getTodayLog);
router.get('/weekly', getWeeklyData);
router.delete('/log/:id', deleteFoodLog);

module.exports = router;
