// Entry point for the Express server
// Loads env vars, connects to DB, mounts all routes

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ── Middleware ──────────────────────────────────────────────
// Allow requests from the React frontend (port 5173)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Parse incoming JSON request bodies
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/food',   require('./routes/food'));
app.use('/api/diet',   require('./routes/diet'));
app.use('/api/weight', require('./routes/weight'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'AI Diet & Nutrition Planner API is running 🥗' });
});

// ── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
