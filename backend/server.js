// Entry point for the Express server
// Production-hardened with Helmet, CORS, CookieParser, Swagger, and Centralized Error Handling

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const swaggerDocument = require('./docs/swagger.json');

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ── Security & Middleware ────────────────────────────────────
// HTTP security headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false // Allows inline scripts for Swagger UI
}));

// Cookie parser for HttpOnly refresh tokens
app.use(cookieParser());

// Allow cross-origin requests
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow dev environments or fallback
    }
  },
  credentials: true
}));

// Body parsing with 15MB limit for image base64 uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Global API rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 300,
  message: { status: 'fail', message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', globalLimiter);

// ── Interactive API Documentation ───────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/food',   require('./routes/food'));
app.use('/api/diet',   require('./routes/diet'));
app.use('/api/weight', require('./routes/weight'));
app.use('/api/ai',     require('./routes/ai'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'AI Diet & Nutrition Platform API v2.0 is running 🥗',
    documentation: '/api/docs',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unknown routes
app.use('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot find route ${req.originalUrl} on this server`
  });
});

// ── Centralized Global Error Handler ────────────────────────
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Production server running on port ${PORT}`);
    console.log(`📑 OpenAPI Documentation available at: http://localhost:${PORT}/api/docs`);
  });
}

module.exports = app;

