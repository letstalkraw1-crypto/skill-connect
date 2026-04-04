const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');

const router = express.Router();

// GET /resources - List all resources, with optional filters
router.get('/', async (req, res) => {
  try {
    const { Resource, Skill, User } = require('../db/index');
    const { skill, category, type } = req.query;
    let query = {};
    
    if (skill) {
      const skillDoc = await Skill.findOne({ name: skill });
      if (skillDoc) query.skillId = skillDoc._id;
    }
    if (category) query.category = category;
    if (type) query.type = type;

    const resources = await Resource.find(query)
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /resources - Create a new resource (auth required)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { Resource } = require('../db/index');
    const { title, description, type, url, category, skillId } = req.body;
    if (!title || !type) return res.status(400).json({ error: 'title and type required' });
    
    const resource = new Resource({
      _id: uuidv4(),
      userId: req.user.userId,
      title,
      description,
      type,
      url,
      category,
      skillId
    });
    await resource.save();
    res.json({ id: resource._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /resources/:id - Get specific resource
router.get('/:id', async (req, res) => {
  try {
    const { Resource } = require('../db/index');
    const resource = await Resource.findById(req.params.id)
      .populate('userId', 'name')
      .lean();
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /resources/:id/favorite - Favorite a resource (auth required)
router.post('/:id/favorite', verifyToken, async (req, res) => {
  try {
    const { Resource, ResourceFavorite } = require('../db/index');
    const resourceId = req.params.id;
    const resource = await Resource.findById(resourceId);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    
    const favorite = new ResourceFavorite({
      userId: req.user.userId,
      resourceId
    });
    await favorite.save();
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 11000 || e.message.includes('duplicate')) {
      return res.status(409).json({ error: 'Already favorited' });
    }
    res.status(500).json({ error: e.message });
  }
});

// DELETE /resources/:id/favorite - Unfavorite
router.delete('/:id/favorite', verifyToken, async (req, res) => {
  try {
    const { ResourceFavorite } = require('../db/index');
    await ResourceFavorite.deleteOne({ userId: req.user.userId, resourceId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;