const express = require('express');
const multer = require('multer');
const {
  getTodayChallenge,
  createChallenge,
  submitVideo,
  getChallengeFeed,
  giveFeedback,
  getVideoFeedback,
  getMySubmissions,
  replyToFeedback,
  deleteFeedback,
} = require('../controllers/dailyChallengeController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max for video
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed'));
    }
    cb(null, true);
  },
});

router.get('/today', verifyToken, getTodayChallenge);
router.get('/my-submissions', verifyToken, getMySubmissions);
router.post('/', verifyToken, createChallenge); // admin creates challenge
router.post('/:id/submit', verifyToken, videoUpload.single('video'), submitVideo);
router.get('/:id/feed', verifyToken, getChallengeFeed);
router.post('/feedback/:videoId', verifyToken, giveFeedback);
router.get('/feedback/:videoId', verifyToken, getVideoFeedback);
router.post('/feedback/:feedbackId/reply', verifyToken, replyToFeedback);
router.delete('/feedback/:feedbackId', verifyToken, deleteFeedback);

module.exports = router;
