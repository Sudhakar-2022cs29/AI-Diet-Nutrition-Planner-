// Weight log controller — track user's weight over time
const WeightLog = require('../models/WeightLog');

// @route  POST /api/weight
// @desc   Add a new weight entry
// @access Private
const addWeight = async (req, res) => {
  try {
    const { weight, note } = req.body;
    if (!weight) return res.status(400).json({ message: 'Weight is required' });

    const log = await WeightLog.create({
      userId: req.user._id,
      weight,
      note: note || ''
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: 'Error adding weight entry', error: error.message });
  }
};

// @route  GET /api/weight
// @desc   Get weight history (last 30 entries)
// @access Private
const getWeightHistory = async (req, res) => {
  try {
    const logs = await WeightLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(logs.reverse()); // Return in chronological order
  } catch (error) {
    res.status(500).json({ message: 'Error fetching weight history', error: error.message });
  }
};

// @route  DELETE /api/weight/:id
// @desc   Delete a weight log entry
// @access Private
const deleteWeight = async (req, res) => {
  try {
    const log = await WeightLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Weight log not found' });

    if (log.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await WeightLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Weight entry deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting weight entry', error: error.message });
  }
};

module.exports = { addWeight, getWeightHistory, deleteWeight };
