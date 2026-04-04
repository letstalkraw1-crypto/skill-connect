const express = require('express');
const postController = require('../controllers/postController');
const { verifyToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const uploadDir = path.join(process.cwd(), '..', 'frontend', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `post-${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.gif','.webp','.mp4','.mov'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

router.get('/', verifyToken, postController.getFeed);
router.post('/', verifyToken, upload.array('images', 10), postController.createPost);
router.delete('/:id', verifyToken, postController.deletePost);
router.post('/:id/interact', verifyToken, postController.interact);
router.post('/:id/like', verifyToken, postController.likePost);
router.get('/:id/comments', verifyToken, postController.getComments);
router.post('/:id/comments', verifyToken, postController.addComment);

module.exports = router;
