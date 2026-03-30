const express = require('express');
const { verifyToken } = require('../services/auth');
const { discoverUsers, getSuggestions } = require('../services/discovery');
const db = require('../db/index');

const router = express.Router();

/**
 * GET /discover/suggestions
 * Returns suggested users ranked by mutual connections + shared skills (default feed)
 */
router.get('/suggestions', verifyToken, (req, res) => {
  try {
    const results = getSuggestions(req.user.userId);
    return res.status(200).json(results);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /discover?skill=running&lat=40.7&lng=-74.0&radius=10&proficiency=Beginner
 */
router.get('/', verifyToken, async (req, res) => {
  const { skill, lat, lng, radius, proficiency } = req.query;
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusNum = parseFloat(radius) || 25;

  // If no valid coordinates, fall back to suggestions
  if (isNaN(latNum) || isNaN(lngNum)) {
    try {
      const results = getSuggestions(req.user.userId);
      return res.status(200).json(results);
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
  }

  try {
    const results = await discoverUsers(req.user.userId, skill, latNum, lngNum, radiusNum, proficiency);
    return res.status(200).json(results);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /discover/skills - list all available skill terms (including new admin skills)
router.get('/skills', verifyToken, (req, res) => {
  const skills = db.prepare('SELECT id, name FROM skills ORDER BY name COLLATE NOCASE').all();
  res.json(skills);
});

module.exports = router;
