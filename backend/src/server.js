require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const morgan = require('morgan');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Trust Render's proxy (required for rate limiting and IP detection behind load balancers)
app.set('trust proxy', 1);

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Auth rate limiting — strict on login/signup/otp, relaxed on /me
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  message: { error: 'Too many authentication attempts. Try again in 15 minutes.' },
  skip: (req) => req.path === '/me' // don't rate limit the /me endpoint
});
app.use('/api/auth', authLimiter);

// Main rate limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, message: { error: 'Too many requests' } }));

// Stricter limit for content creation
const createLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, message: { error: 'Too many requests. Slow down.' } });
app.use('/api/posts', createLimiter);
app.use('/api/events', createLimiter);
app.use('/api/communities', createLimiter);

// CORS
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://collabro.onrender.com', process.env.FRONTEND_URL].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, true); // Keep permissive for now — tighten when custom domain is set
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token'],
  credentials: true
}));
app.use(compression());
app.use(express.json());

// Input sanitization middleware — strip XSS from string fields (skip sensitive fields)
const SKIP_SANITIZE = new Set(['password', 'currentPassword', 'newPassword', 'code', 'token']);
app.use((req, res, next) => {
  const sanitizeHtml = require('sanitize-html');
  const clean = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (SKIP_SANITIZE.has(key)) continue; // never sanitize passwords or OTP codes
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeHtml(obj[key], { allowedTags: [], allowedAttributes: {} });
      } else if (typeof obj[key] === 'object') {
        clean(obj[key]);
      }
    }
  };
  clean(req.body);
  next();
});

// Request Logger
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Database Connection
require('./config/db');

// Health Check
app.get('/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.status(isConnected ? 200 : 503).json({ status: isConnected ? 'ok' : 'waiting', db: isConnected ? 'connected' : 'connecting' });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/auth/oauth', require('./routes/oauthRoutes'));
app.use('/api/profile', require('./routes/userRoutes'));
app.use('/api/discover', require('./routes/discoveryRoutes'));
app.use('/api/connections', require('./routes/connectionRoutes'));
app.use('/api/conversations', require('./routes/chatRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/communities', require('./routes/communityRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/challenges', require('./routes/challengeRoutes'));
app.use('/api/qa', require('./routes/qaRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/daily-challenge', require('./routes/dailyChallengeRoutes'));
app.use('/api/user-challenges', require('./routes/userChallengeRoutes'));

// Socket.io
const { initSocket } = require('./socket/index');
initSocket(server);

// Static Files (Frontend)
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
const uploadsPath = path.join(__dirname, '..', 'uploads');

console.log('Static Paths initialized (Source):');
console.log(' - Dist:', distPath);
console.log(' - Uploads:', uploadsPath);

app.use('/uploads', express.static(uploadsPath));
app.use(express.static(distPath));

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack, path: req.path });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Single Page Application Routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => { logger.info(`✅ Server running on port ${PORT}`); });

// Prevent process crashes from unhandled errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});
