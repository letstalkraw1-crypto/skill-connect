require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// Security Middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Use Helmet
app.use(helmet({
  contentSecurityPolicy: false, // Turn off for API
  crossOriginEmbedderPolicy: false
}));

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 500, // Limit each IP to 500 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.use(cors({
  origin: '*', // Allow all origins (standard for public APIs accessed by mobile apps)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Initialize DB (creates file + schema + seeds on first run)
require('./db/index');

// Middleware: Ensure DB is ready for non-health requests
app.use((req, res, next) => {
  if (req.path === '/health') return next(); // Health check doesn't need DB
  if (req.path === '/' || req.path.includes('.')) return next(); // Frontend files don't need DB
  
  if (mongoose.connection.readyState !== 1) {
    console.warn(`⏳ DB not ready (state: ${mongoose.connection.readyState}), delaying request to ${req.path}`);
    return res.status(503).json({ 
      error: 'Database connection initializing',
      status: 'waiting'
    });
  }
  next();
});

// Health check with MongoDB status
app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const status = {
    status: dbConnected ? 'ok' : 'waiting',
    db: dbConnected ? 'connected' : 'connecting',
    timestamp: new Date().toISOString()
  };
  console.log('Health check:', status);
  res.status(dbConnected ? 200 : 503).json(status);
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/profile', require('./routes/profile'));
app.use('/discover', require('./routes/discovery'));
app.use('/connections', require('./routes/connections'));
app.use('/conversations', require('./routes/messaging'));
app.use('/admin', require('./routes/admin'));
app.use('/upload', require('./routes/upload'));
app.use('/posts', require('./routes/posts'));
app.use('/events', require('./routes/events'));
app.use('/communities', require('./routes/communities'));
app.use('/resources', require('./routes/resources'));
app.use('/challenges', require('./routes/challenges'));
app.use('/qa', require('./routes/qa'));
app.use('/documents', require('./routes/documents'));

// Socket.io
const { initSocket } = require('./socket/index');
initSocket(server);

// Global error handler — always return JSON
app.use((err, req, res, next) => {
  console.error('❌ Error on', req.method, req.path, ':', err.message);
  console.error(err.stack);
  // Ensure we always return JSON, never HTML
  res.setHeader('Content-Type', 'application/json');
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    path: req.path
  });
});

// Serve frontend — no cache so mobile always gets latest
const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
}));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html')));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Production API Server running on port ${PORT}`);
});

module.exports = { app, server };
