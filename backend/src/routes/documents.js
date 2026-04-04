const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');

const router = express.Router();

// GET /documents - List documents, optional skill filter
router.get('/', async (req, res) => {
  try {
    const { Document, Skill } = require('../config/db');
    const { skill } = req.query;
    let query = {};
    
    if (skill) {
      const skillDoc = await Skill.findOne({ name: skill });
      if (skillDoc) query.skillId = skillDoc._id;
    }

    const documents = await Document.find(query)
      .populate('authorId', 'name')
      .populate('skillId', 'name')
      .sort({ updatedAt: -1 })
      .lean();
    res.json(documents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /documents - Create a document (auth required)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { Document } = require('../config/db');
    const { skillId, title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });
    
    const document = new Document({
      _id: uuidv4(),
      skillId,
      title,
      content,
      authorId: req.user.userId
    });
    await document.save();
    res.json({ id: document._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /documents/:id - Get specific document
router.get('/:id', async (req, res) => {
  try {
    const { Document } = require('../config/db');
    const document = await Document.findById(req.params.id)
      .populate('authorId', 'name')
      .lean();
    if (!document) return res.status(404).json({ error: 'Document not found' });
    res.json(document);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /documents/:id - Update document (author only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { Document } = require('../config/db');
    const { content } = req.body;
    const document = await Document.findById(req.params.id).select('authorId').lean();
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (document.authorId.toString() !== req.user.userId) return res.status(403).json({ error: 'Only author can edit' });
    
    await Document.findByIdAndUpdate(req.params.id, { content, updatedAt: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;