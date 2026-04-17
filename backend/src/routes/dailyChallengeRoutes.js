const express = require('express');
const multer = require('multer');
const {
  getTodayChallenge, createChallenge, submitVideo, getChallengeFeed,
  giveFeedback, getVideoFeedback, getMySubmissions,
  replyToFeedback, deleteFeedback, getAIAnalysis, retryAIAnalysis, deleteSubmission,
  getTranscript, getTranscriptAdmin,
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

// Debug: test a specific video's transcription status
// GET /api/daily-challenge/debug/:videoId
router.get('/debug/:videoId', verifyToken, async (req, res) => {
  try {
    const { ChallengeVideo } = require('../config/db');
    const video = await ChallengeVideo.findById(req.params.videoId).lean();
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const assemblyKey = process.env.ASSEMBLYAI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    res.json({
      videoId: video._id,
      videoUrl: video.videoUrl,
      duration: video.duration,
      bytes: video.bytes,
      aiStatus: video.aiAnalysis?.status,
      hasTranscript: !!video.aiAnalysis?.transcript,
      transcriptLength: video.aiAnalysis?.transcript?.length || 0,
      transcriptPreview: video.aiAnalysis?.transcript?.slice(0, 200) || null,
      processingStartedAt: video.aiAnalysis?.processingStartedAt,
      analyzedAt: video.aiAnalysis?.analyzedAt,
      assemblyKeySet: !!assemblyKey,
      groqKeySet: !!groqKey,
      scores: video.aiAnalysis?.scores || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
  const groqKey = process.env.GROQ_API_KEY;
  const assemblyKey = process.env.ASSEMBLYAI_API_KEY;

  const result = {
    groq: { configured: !!groqKey, keyPrefix: groqKey ? groqKey.slice(0, 10) + '...' : null },
    assemblyai: { configured: !!assemblyKey, keyPrefix: assemblyKey ? assemblyKey.slice(0, 8) + '...' : null },
    groqTest: null,
    assemblyTest: null,
  };

  // Test Groq
  if (groqKey) {
    try {
      const https = require('https');
      const body = JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Reply with exactly: {"status":"ok"}' }],
        max_tokens: 20,
      });
      const groqResult = await new Promise((resolve, reject) => {
        const r = https.request({
          hostname: 'api.groq.com', path: '/openai/v1/chat/completions', method: 'POST',
          headers: { authorization: `Bearer ${groqKey}`, 'content-type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, res2 => {
          let raw = ''; res2.on('data', c => raw += c); res2.on('end', () => resolve(raw));
        });
        r.on('error', reject); r.write(body); r.end();
      });
      const parsed = JSON.parse(groqResult);
      result.groqTest = parsed.error ? `ERROR: ${parsed.error.message}` : 'OK ✅';
    } catch (e) {
      result.groqTest = `FAILED: ${e.message}`;
    }
  }

  // Test AssemblyAI (just check auth, don't submit a job)
  if (assemblyKey) {
    try {
      const https = require('https');
      const authResult = await new Promise((resolve, reject) => {
        const r = https.request({
          hostname: 'api.assemblyai.com', path: '/v2/transcript', method: 'GET',
          headers: { authorization: assemblyKey }
        }, res2 => {
          let raw = ''; res2.on('data', c => raw += c);
          res2.on('end', () => resolve({ status: res2.statusCode, body: raw.slice(0, 100) }));
        });
        r.on('error', reject); r.end();
      });
      // 200 or 400 both mean the key is valid (400 = missing params, not auth error)
      result.assemblyTest = [200, 400, 404].includes(authResult.status) ? 'OK ✅' : `HTTP ${authResult.status} — key may be invalid`;
    } catch (e) {
      result.assemblyTest = `FAILED: ${e.message}`;
    }
  }

  res.json(result);
});

router.post('/', verifyToken, createChallenge);
router.post('/:id/submit', verifyToken, videoUpload.single('video'), submitVideo);
router.delete('/:id/submit', verifyToken, deleteSubmission);
router.get('/:id/feed', verifyToken, getChallengeFeed);
router.post('/feedback/:videoId', verifyToken, giveFeedback);
router.get('/feedback/:videoId', verifyToken, getVideoFeedback);
router.post('/feedback/:feedbackId/reply', verifyToken, replyToFeedback);
router.delete('/feedback/:feedbackId', verifyToken, deleteFeedback);
router.get('/ai/:videoId', verifyToken, getAIAnalysis);
router.post('/ai/:videoId/retry', verifyToken, retryAIAnalysis);
router.get('/transcript/:videoId', verifyToken, getTranscript);
router.get('/transcript/:videoId/admin', verifyToken, getTranscriptAdmin);

module.exports = router;
