const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');

const router = express.Router();

// GET /challenges - List all challenges
router.get('/', async (req, res) => {
  try {
    const { Challenge } = require('../db/index');
    const challenges = await Challenge.find()
      .populate('skillId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /challenges - Create a challenge (auth required, perhaps admin only)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { Challenge } = require('../db/index');
    const { title, description, skillId, difficulty, startDate, endDate, points } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    
    const challenge = new Challenge({
      _id: uuidv4(),
      title,
      description,
      skillId,
      difficulty,
      startDate,
      endDate,
      points: points || 10
    });
    await challenge.save();
    res.json({ id: challenge._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /challenges/:id/submit - Submit to a challenge
router.post('/:id/submit', verifyToken, async (req, res) => {
  try {
    const { Challenge, ChallengeSubmission } = require('../db/index');
    const { submissionData, score } = req.body;
    const challengeId = req.params.id;
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    
    const submission = new ChallengeSubmission({
      _id: uuidv4(),
      challengeId,
      userId: req.user.userId,
      submissionData,
      score
    });
    await submission.save();
    res.json({ id: submission._id });
  } catch (e) {
    if (e.code === 11000 || e.message.includes('duplicate')) {
      return res.status(409).json({ error: 'Already submitted' });
    }
    res.status(500).json({ error: e.message });
  }
});

// GET /challenges/:id/submissions - Get submissions for a challenge
router.get('/:id/submissions', verifyToken, async (req, res) => {
  try {
    const { ChallengeSubmission } = require('../db/index');
    const submissions = await ChallengeSubmission.find({ challengeId: req.params.id })
      .populate('userId', 'name')
      .sort({ score: -1 })
      .lean();
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;