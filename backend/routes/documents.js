const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');
const db = require('../db/index');

const router = express.Router();

// GET /documents - List documents, optional skill filter
router.get('/', (req, res) => {
  const { skill } = req.query;
  let query = 'SELECT d.*, u.name as author_name, s.name as skill_name FROM documents d JOIN users u ON u.id = d.author_id LEFT JOIN skills s ON s.id = d.skill_id WHERE 1=1';
  const params = [];
  if (skill) {
    query += ' AND d.skill_id = (SELECT id FROM skills WHERE name = ?)';
    params.push(skill);
  }
  query += ' ORDER BY d.updated_at DESC';
  const documents = db.prepare(query).all(...params);
  res.json(documents);
});

// POST /documents - Create a document (auth required)
router.post('/', verifyToken, (req, res) => {
  const { skillId, title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  
  const id = uuidv4();
  db.prepare('INSERT INTO documents (id, skill_id, title, content, author_id) VALUES (?, ?, ?, ?, ?)').run(id, skillId, title, content, req.user.userId);
  res.json({ id });
});

// GET /documents/:id - Get specific document
router.get('/:id', (req, res) => {
  const document = db.prepare('SELECT d.*, u.name as author_name FROM documents d JOIN users u ON u.id = d.author_id WHERE d.id = ?').get(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  res.json(document);
});

// PUT /documents/:id - Update document (author only)
router.put('/:id', verifyToken, (req, res) => {
  const { content } = req.body;
  const document = db.prepare('SELECT author_id FROM documents WHERE id = ?').get(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (document.author_id !== req.user.userId) return res.status(403).json({ error: 'Only author can edit' });
  
  db.prepare('UPDATE documents SET content = ?, updated_at = datetime("now") WHERE id = ?').run(content, req.params.id);
  res.json({ ok: true });
});

module.exports = router;