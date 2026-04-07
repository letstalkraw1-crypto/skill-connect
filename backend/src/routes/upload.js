const express = require('express');
const multer = require('multer');
const { uploadToCloudinary } = require('../config/cloudinary');
const { verifyToken } = require('../services/auth');
const { User } = require('../config/db');
const { delCache } = require('../utils/cache');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// POST /upload/avatar
router.post('/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Upload to Cloudinary via buffer stream
    const result = await uploadToCloudinary(req.file.buffer);
    const avatarUrl = result.secure_url;
    
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
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
});

// POST /upload/chat
router.post('/chat', verifyToken, uploadChat.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await uploadToCloudinary(req.file.buffer);
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error('Chat upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
