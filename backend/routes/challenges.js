const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');
const db = require('../db/index');

const router = express.Router();

// GET /challenges - List all challenges
router.get('/', (req, res) => {
  const challenges = db.prepare('SELECT c.*, s.name as skill_name FROM challenges c LEFT JOIN skills s ON s.id = c.skill_id ORDER BY c.created_at DESC').all();
  res.json(challenges);
});

// POST /challenges - Create a challenge (auth required, perhaps admin only)
router.post('/', verifyToken, (req, res) => {
  const { title, description, skillId, difficulty, startDate, endDate, points } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  
  const id = uuidv4();
  db.prepare('INSERT INTO challenges (id, title, description, skill_id, difficulty, start_date, end_date, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, title, description, skillId, difficulty, startDate, endDate, points || 10);
  res.json({ id });
});

// POST /challenges/:id/submit - Submit to a challenge
router.post('/:id/submit', verifyToken, (req, res) => {
  const { submissionData, score } = req.body;
  const challengeId = req.params.id;
  const challenge = db.prepare('SELECT id FROM challenges WHERE id = ?').get(challengeId);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
  
  const id = uuidv4();
  try {
    db.prepare('INSERT INTO challenge_submissions (id, challenge_id, user_id, submission_data, score) VALUES (?, ?, ?, ?, ?)').run(id, challengeId, req.user.userId, submissionData, score);
    res.json({ id });
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Already submitted' });
    }
    throw e;
  }
});

// GET /challenges/:id/submissions - Get submissions for a challenge
router.get('/:id/submissions', verifyToken, (req, res) => {
  const submissions = db.prepare('SELECT cs.*, u.name as user_name FROM challenge_submissions cs JOIN users u ON u.id = cs.user_id WHERE cs.challenge_id = ? ORDER BY cs.score DESC').all(req.params.id);
  res.json(submissions);
});

module.exports = router;