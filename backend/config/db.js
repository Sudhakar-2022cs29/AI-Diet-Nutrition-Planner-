// MongoDB connection using Mongoose with resilient test handling
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/diet-planner', {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ MongoDB connection warning: ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Backend server will continue running in degraded mode.');
    }
  }
};

module.exports = connectDB;
