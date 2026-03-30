const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');
const db = require('../db/index');

const router = express.Router();

// GET /qa - List Q&A rooms
router.get('/', (req, res) => {
  const rooms = db.prepare('SELECT qr.*, u.name as host_name, s.name as skill_name FROM qa_rooms qr JOIN users u ON u.id = qr.host_id LEFT JOIN skills s ON s.id = qr.skill_id ORDER BY qr.scheduled_at DESC').all();
  res.json(rooms);
});

// POST /qa - Create a Q&A room (auth required)
router.post('/', verifyToken, (req, res) => {
  const { skillId, title, scheduledAt } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  
  const id = uuidv4();
  db.prepare('INSERT INTO qa_rooms (id, host_id, skill_id, title, scheduled_at) VALUES (?, ?, ?, ?, ?)').run(id, req.user.userId, skillId, title, scheduledAt);
  res.json({ id });
});

// POST /qa/:id/questions - Ask a question
router.post('/:id/questions', verifyToken, (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'question required' });
  
  const roomId = req.params.id;
  const room = db.prepare('SELECT id FROM qa_rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'Q&A room not found' });
  
  const id = uuidv4();
  db.prepare('INSERT INTO qa_questions (id, room_id, user_id, question) VALUES (?, ?, ?, ?)').run(id, roomId, req.user.userId, question);
  res.json({ id });
});

// PUT /qa/questions/:id - Answer a question (host only)
router.put('/questions/:id', verifyToken, (req, res) => {
  const { answer } = req.body;
  const question = db.prepare('SELECT qq.*, qr.host_id FROM qa_questions qq JOIN qa_rooms qr ON qr.id = qq.room_id WHERE qq.id = ?').get(req.params.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  if (question.host_id !== req.user.userId) return res.status(403).json({ error: 'Only host can answer' });
  
  db.prepare('UPDATE qa_questions SET answer = ?, answered_at = datetime("now") WHERE id = ?').run(answer, req.params.id);
  res.json({ ok: true });
});

// GET /qa/:id/questions - Get questions for a room
router.get('/:id/questions', (req, res) => {
  const questions = db.prepare('SELECT qq.*, u.name as asker_name FROM qa_questions qq JOIN users u ON u.id = qq.user_id WHERE qq.room_id = ? ORDER BY qq.created_at ASC').all(req.params.id);
  res.json(questions);
});

module.exports = router;