const express = require('express');
const multer = require('multer');
const {
  getTodayChallenge, createChallenge, submitVideo, getChallengeFeed,
  giveFeedback, getVideoFeedback, getMySubmissions,
  replyToFeedback, deleteFeedback, getAIAnalysis, retryAIAnalysis,
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
router.get('/ai/:videoId', verifyToken, getAIAnalysis);
router.post('/ai/:videoId/retry', verifyToken, retryAIAnalysis);

// Temp debug endpoint — remove after testing
router.get('/ai-test', verifyToken, async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.json({ error: 'GEMINI_API_KEY not set', env: Object.keys(process.env).filter(k => k.includes('GEMINI')) });
  
  const https = require('https');
  const prompt = 'Say "AI is working" in JSON: {"message": "AI is working"}';
  const path = `/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
  
  const result = await new Promise((resolve, reject) => {
    const req2 = https.request({ hostname: 'generativelanguage.googleapis.com', path, method: 'POST', headers: { 'content-type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res2 => {
      let raw = ''; res2.on('data', c => raw += c); res2.on('end', () => resolve(raw));
    });
    req2.on('error', reject); req2.write(body); req2.end();
  });
  
  res.json({ keyPrefix: key.slice(0, 10) + '...', response: result.slice(0, 500) });
});

module.exports = router;
