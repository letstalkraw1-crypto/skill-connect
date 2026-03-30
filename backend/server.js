require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const server = http.createServer(app);

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

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

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

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({ error: err.message });
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
