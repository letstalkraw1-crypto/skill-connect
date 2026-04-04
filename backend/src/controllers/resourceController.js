const { Resource, Skill, User, ResourceFavorite } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const listResources = async (req, res) => {
  try {
    const { skill, category, type } = req.query;
    let query = {};
    if (skill) {
      const skillDoc = await Skill.findOne({ name: skill });
      if (skillDoc) query.skillId = skillDoc._id;
    }
    if (category) query.category = category;
    if (type) query.type = type;

    const resources = await Resource.find(query).populate('userId', 'name').sort({ createdAt: -1 }).lean();
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createResource = async (req, res) => {
  try {
    const { title, description, type, url, category, skillId } = req.body;
    if (!title || !type) return res.status(400).json({ error: 'title and type required' });
    const resource = new Resource({ _id: uuidv4(), userId: req.user.userId, title, description, type, url, category, skillId });
    await resource.save();
    res.json({ id: resource._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).populate('userId', 'name').lean();
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const favoriteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    await new ResourceFavorite({ userId: req.user.userId, resourceId: req.params.id }).save();
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already favorited' });
    res.status(500).json({ error: err.message });
  }
};

const unfavoriteResource = async (req, res) => {
  try {
    await ResourceFavorite.deleteOne({ userId: req.user.userId, resourceId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listResources, createResource, getResource, favoriteResource, unfavoriteResource };
