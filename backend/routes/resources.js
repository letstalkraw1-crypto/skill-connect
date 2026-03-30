const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');
const db = require('../db/index');

const router = express.Router();

// GET /resources - List all resources, with optional filters
router.get('/', (req, res) => {
  const { skill, category, type } = req.query;
  let query = 'SELECT r.*, u.name as author_name FROM resources r JOIN users u ON u.id = r.user_id WHERE 1=1';
  const params = [];
  if (skill) {
    query += ' AND r.skill_id = (SELECT id FROM skills WHERE name = ?)';
    params.push(skill);
  }
  if (category) {
    query += ' AND r.category = ?';
    params.push(category);
  }
  if (type) {
    query += ' AND r.type = ?';
    params.push(type);
  }
  query += ' ORDER BY r.created_at DESC';
  const resources = db.prepare(query).all(...params);
  res.json(resources);
});

// POST /resources - Create a new resource (auth required)
router.post('/', verifyToken, (req, res) => {
  const { title, description, type, url, category, skillId } = req.body;
  if (!title || !type) return res.status(400).json({ error: 'title and type required' });
  
  const id = uuidv4();
  db.prepare('INSERT INTO resources (id, user_id, title, description, type, url, category, skill_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, req.user.userId, title, description, type, url, category, skillId);
  res.json({ id });
});

// GET /resources/:id - Get specific resource
router.get('/:id', (req, res) => {
  const resource = db.prepare('SELECT r.*, u.name as author_name FROM resources r JOIN users u ON u.id = r.user_id WHERE r.id = ?').get(req.params.id);
  if (!resource) return res.status(404).json({ error: 'Resource not found' });
  res.json(resource);
});

// POST /resources/:id/favorite - Favorite a resource (auth required)
router.post('/:id/favorite', verifyToken, (req, res) => {
  const resourceId = req.params.id;
  const resource = db.prepare('SELECT id FROM resources WHERE id = ?').get(resourceId);
  if (!resource) return res.status(404).json({ error: 'Resource not found' });
  
  try {
    db.prepare('INSERT INTO resource_favorites (user_id, resource_id) VALUES (?, ?)').run(req.user.userId, resourceId);
    res.json({ ok: true });
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Already favorited' });
    }
    throw e;
  }
});

// DELETE /resources/:id/favorite - Unfavorite
router.delete('/:id/favorite', verifyToken, (req, res) => {
  db.prepare('DELETE FROM resource_favorites WHERE user_id = ? AND resource_id = ?').run(req.user.userId, req.params.id);
  res.json({ ok: true });
});

module.exports = router;