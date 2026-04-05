const express = require('express');
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const { verifyToken } = require('../services/auth');
const { User } = require('../config/db');
const { delCache } = require('../utils/cache');

const router = express.Router();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// POST /upload/avatar
router.post('/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Cloudinary provides the URL in path or secure_url
    const avatarUrl = req.file.path || req.file.secure_url;
    
    // Update user record
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId, 
      { avatarUrl }, 
      { new: true }
    ).select('avatarUrl');

    await delCache(`user:${req.user.userId}`);

    res.json({ 
      avatarUrl: updatedUser.avatarUrl, 
      avatar_url: updatedUser.avatarUrl, 
      url: updatedUser.avatarUrl 
    });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

const uploadChat = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
});

// POST /upload/chat
router.post('/chat', verifyToken, uploadChat.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = req.file.path || req.file.secure_url;
  res.json({ url });
});

module.exports = router;
