const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../services/auth');
const db = require('../db/index');

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', '..', 'frontend', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user.userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// POST /upload/avatar
router.post('/avatar', verifyToken, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const avatarUrl = `/uploads/${req.file.filename}`;

  // Delete old avatar file if it was a local upload
  const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.user.userId);
  if (user?.avatar_url?.startsWith('/uploads/')) {
    const oldPath = path.join(__dirname, '..', '..', 'frontend', user.avatar_url);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, req.user.userId);
  res.json({ avatarUrl, avatar_url: avatarUrl, url: avatarUrl });
});

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.webm';
    cb(null, `chat-${req.user.userId}-${Date.now()}${ext}`);
  },
});

const uploadChat = multer({
  storage: chatStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter: (req, file, cb) => {
    // allow images and audio extensions
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.m4a', '.mp3', '.wav', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    // Allow empty ext if blob is sent from MediaRecorder without name, default to webm above
    if (!ext || allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type for chat'));
    }
  },
});

// POST /upload/chat
router.post('/chat', verifyToken, uploadChat.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
