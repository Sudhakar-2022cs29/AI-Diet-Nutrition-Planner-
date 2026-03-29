// Weight log routes
const express = require('express');
const router = express.Router();
const { addWeight, getWeightHistory, deleteWeight } = require('../controllers/weightController');
const { protect } = require('../middleware/auth');

router.post('/', protect, addWeight);
router.get('/', protect, getWeightHistory);
router.delete('/:id', protect, deleteWeight);

module.exports = router;
