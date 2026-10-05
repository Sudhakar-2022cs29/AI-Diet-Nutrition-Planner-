const express = require('express');
const router = express.Router();
const { addWeight, getWeightHistory, deleteWeight } = require('../controllers/weightController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { weightLogSchema } = require('../validators/schemas');

router.use(protect);

router.post('/', validate(weightLogSchema), addWeight);
router.get('/', getWeightHistory);
router.delete('/:id', deleteWeight);

module.exports = router;

