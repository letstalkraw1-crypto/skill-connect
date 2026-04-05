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
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token']
}));

// Enable gzip compression
const compression = require('compression');
app.use(compression());

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

// --- API Routes ---
const apiRouter = express.Router();

apiRouter.use('/auth', require('./routes/auth'));
apiRouter.use('/profile', require('./routes/profile'));
apiRouter.use('/discover', require('./routes/discovery'));
apiRouter.use('/connections', require('./routes/connections'));
apiRouter.use('/conversations', require('./routes/messaging'));
apiRouter.use('/admin', require('./routes/admin'));
apiRouter.use('/upload', require('./routes/upload'));
apiRouter.use('/posts', require('./routes/posts'));
apiRouter.use('/events', require('./routes/events'));
apiRouter.use('/communities', require('./routes/communities'));
apiRouter.use('/resources', require('./routes/resources'));
apiRouter.use('/challenges', require('./routes/challenges'));
apiRouter.use('/qa', require('./routes/qa'));
apiRouter.use('/documents', require('./routes/documents'));

// Support legacy /notifications hits (if needed) or move to /api/notifications
apiRouter.use('/notifications', (req, res, next) => {
  // If a dedicated notifications route exists, use it. For now, it might be in profile or elsewhere.
  // Assuming it's a separate route file:
  try {
    return require('./routes/notifications')(req, res, next);
  } catch (e) {
    next();
  }
});

// Register the API router
app.use('/api', apiRouter);

// Socket.io
const { initSocket } = require('./socket/index');
initSocket(server);

// Global error handler — always return JSON
app.use((err, req, res, next) => {
  console.error('❌ Error on', req.method, req.path, ':', err.message);
  console.error(err.stack);
  res.setHeader('Content-Type', 'application/json');
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    path: req.path
  });
});

// --- Static File Serving & Frontend ---
const path = require('path');
const uploadsPath = path.join(__dirname, 'uploads');
const distPath = path.join(__dirname, '..', 'frontend', 'dist');

console.log('Static Paths initialized:');
console.log(' - Dist:', distPath);
console.log(' - Uploads:', uploadsPath);

app.use('/uploads', express.static(uploadsPath));
app.use(express.static(distPath, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.match(/\.(js|css|webp|png|jpg|jpeg|gif|woff2?|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Catch-all: If not an API request, serve index.html
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Production API Server running on port ${PORT}`);
});

// Keep-alive ping to prevent Render free tier spin-down
if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
  const keepAliveUrl = process.env.RENDER_EXTERNAL_URL + '/health';
  setInterval(async () => {
    try {
      const http = require('http');
      const https = require('https');
      const client = keepAliveUrl.startsWith('https') ? https : http;
      client.get(keepAliveUrl, () => {}).on('error', () => {});
    } catch (e) {}
  }, 14 * 60 * 1000); // ping every 14 minutes
}

module.exports = { app, server };
