// Weight log controller — track user's weight over time
const WeightLog = require('../models/WeightLog');
const AppError = require('../utils/AppError');

// @route  POST /api/weight
// @desc   Add a new weight entry
// @access Private
const addWeight = async (req, res, next) => {
  try {
    const { weight, note } = req.body;

    const log = await WeightLog.create({
      userId: req.user._id,
      weight,
      note: note || ''
    });

    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/weight
// @desc   Get weight history (last 30 entries)
// @access Private
const getWeightHistory = async (req, res, next) => {
  try {
    const logs = await WeightLog.find({ userId: req.user._id })
      .sort({ createdAt: 1 })
      .limit(60);

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

// @route  DELETE /api/weight/:id
// @desc   Delete a weight log entry
// @access Private
const deleteWeight = async (req, res, next) => {
  try {
    const log = await WeightLog.findById(req.params.id);
    if (!log) return next(new AppError('Weight log not found', 404));

    if (log.userId.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to delete this entry', 403));
    }

    await WeightLog.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Weight entry deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { addWeight, getWeightHistory, deleteWeight };
