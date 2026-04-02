const express = require('express');
const { verifyToken } = require('../services/auth');
const { discoverUsers, getSuggestions } = require('../services/discovery');
const db = require('../db/index');

const router = express.Router();

/**
 * GET /discover/search?q=name
 * Search users by name or short ID
 */
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const { User } = require('../db/index');
    const searchTerm = q.trim();
    
    // Search by name or shortId
    const users = await User.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { shortId: searchTerm }
      ],
      _id: { $ne: req.user.userId } // Exclude self
    })
      .select('_id name shortId avatarUrl bio location')
      .limit(20)
      .lean();

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /discover/suggestions
 * Returns suggested users ranked by mutual connections + shared skills (default feed)
 */
router.get('/suggestions', verifyToken, async (req, res) => {
  try {
    const results = await getSuggestions(req.user.userId);
    return res.status(200).json(results);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /discover?skill=running&lat=40.7&lng=-74.0&radius=10&proficiency=Beginner
 */
router.get('/', verifyToken, async (req, res) => {
  const { skill, lat, lng, radius, proficiency, subSkill, lookingFor } = req.query;
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusNum = parseFloat(radius) || 25;

  if (isNaN(latNum) || isNaN(lngNum)) {
    try {
      const results = await getSuggestions(req.user.userId);
      return res.status(200).json(results);
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
  }

  try {
    const results = await discoverUsers(req.user.userId, skill, latNum, lngNum, radiusNum, proficiency, subSkill, lookingFor);
    return res.status(200).json(results);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /discover/skills - list all available skill terms (including new admin skills)
router.get('/skills', verifyToken, async (req, res) => {
  try {
    const { Skill } = require('../db/index');
    const skills = await Skill.find().select('id name').sort({ name: 1 }).lean();
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
