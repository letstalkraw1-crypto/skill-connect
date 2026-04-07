const express = require('express');
const postController = require('../controllers/postController');
const { verifyToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.get('/', verifyToken, postController.getFeed);
router.post('/', verifyToken, upload.array('images', 10), postController.createPost);
router.delete('/:id', verifyToken, postController.deletePost);
router.post('/:id/interact', verifyToken, postController.interact);
router.post('/:id/like', verifyToken, postController.likePost);
router.get('/:id/comments', verifyToken, postController.getComments);
router.post('/:id/comments', verifyToken, postController.addComment);

module.exports = router;
