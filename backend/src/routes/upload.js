const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../services/auth');
const { User } = require('../config/db');
const { delCache } = require('../utils/cache');

const router = express.Router();

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const saveLocally = (buffer, mimetype) => {
  const ext = mimetype.split('/')[1] || 'jpg';
  const filename = `avatar-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, buffer);
  return `/uploads/${filename}`;
};

// POST /api/upload/avatar
router.post('/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Make sure the field name is "avatar".' });
    }

    let avatarUrl;

    if (isCloudinaryConfigured()) {
      try {
        const { uploadToCloudinary } = require('../config/cloudinary');
        const result = await uploadToCloudinary(req.file.buffer);
        avatarUrl = result.secure_url;
      } catch (cloudErr) {
        console.error('Cloudinary upload failed, falling back to local storage:', cloudErr.message);
        avatarUrl = saveLocally(req.file.buffer, req.file.mimetype);
      }
    } else {
      console.warn('Cloudinary not configured — saving avatar locally');
      avatarUrl = saveLocally(req.file.buffer, req.file.mimetype);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { avatarUrl },
      { new: true }
    ).select('avatarUrl');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

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
  limits: { fileSize: 15 * 1024 * 1024 },
});

// POST /api/upload/chat
router.post('/chat', verifyToken, uploadChat.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let url;
    if (isCloudinaryConfigured()) {
      try {
        const { uploadToCloudinary } = require('../config/cloudinary');
        const result = await uploadToCloudinary(req.file.buffer);
        url = result.secure_url;
      } catch (cloudErr) {
        console.error('Cloudinary chat upload failed, saving locally:', cloudErr.message);
        url = saveLocally(req.file.buffer, req.file.mimetype);
      }
    } else {
      url = saveLocally(req.file.buffer, req.file.mimetype);
    }

    res.json({ url });
  } catch (err) {
    console.error('Chat upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
