const express = require('express');
const { getUserAchievements, getLeaderboard } = require('../services/achievementService');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/achievements - Get user's achievements with progress
router.get('/', authMiddleware, async (req, res) => {
  try {
    const achievements = await getUserAchievements(req.user.userId);
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// GET /api/achievements/leaderboard - Get points leaderboard
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;