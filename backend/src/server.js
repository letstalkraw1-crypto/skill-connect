require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, message: { error: 'Too many requests' } }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token'] }));
app.use(compression());
app.use(express.json());

// Request Logger
app.use((req, res, next) => { console.log(`${req.method} ${req.path}`); next(); });

// Database Connection
require('./config/db');

// Health Check
app.get('/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.status(isConnected ? 200 : 503).json({ status: isConnected ? 'ok' : 'waiting', db: isConnected ? 'connected' : 'connecting' });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
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
  console.error(`❌ Error: ${err.message}`);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Single Page Application Routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => { console.log(`✅ Server running on port ${PORT}`); });
