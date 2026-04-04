const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');
const { QARoom, QAQuestion, User, Skill } = require('../config/db');

const router = express.Router();

// GET /qa - List Q&A rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await QARoom.find()
      .populate({
        path: 'hostId',
        select: 'name',
        model: User
      })
      .populate({
        path: 'skillId',
        select: 'name',
        model: Skill
      })
      .sort({ scheduledAt: -1 })
      .lean();
    
    const formattedRooms = rooms.map(room => ({
      ...room,
      hostName: room.hostId.name,
      host_name: room.hostId.name,
      skillName: room.skillId?.name || null,
      skill_name: room.skillId?.name || null,
      scheduled_at: room.scheduledAt
    }));
    
    res.json(formattedRooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /qa - Create a Q&A room (auth required)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { skillId, title, scheduledAt } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    
    const roomId = uuidv4();
    
    const newRoom = new QARoom({
      _id: roomId,
      hostId: req.user.userId,
      skillId: skillId || null,
      title,
      scheduledAt: scheduledAt || null
    });
    
    await newRoom.save();
    
    res.json({ id: roomId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /qa/:id/questions - Ask a question
router.post('/:id/questions', verifyToken, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });
    
    const roomId = req.params.id;
    const room = await QARoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Q&A room not found' });
    
    const questionId = uuidv4();
    
    const newQuestion = new QAQuestion({
      _id: questionId,
      roomId,
      userId: req.user.userId,
      question
    });
    
    await newQuestion.save();
    
    res.json({ id: questionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /qa/questions/:id - Answer a question (host only)
router.put('/questions/:id', verifyToken, async (req, res) => {
  try {
    const { answer } = req.body;
    
    const question = await QAQuestion.findById(req.params.id).populate({
      path: 'roomId',
      select: 'hostId',
      model: QARoom
    });
    
    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (question.roomId.hostId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only host can answer' });
    }
    
    await QAQuestion.findByIdAndUpdate(req.params.id, {
      answer,
      answeredAt: new Date()
    });
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /qa/:id/questions - Get questions for a room
router.get('/:id/questions', async (req, res) => {
  try {
    const questions = await QAQuestion.find({ roomId: req.params.id })
      .populate({
        path: 'userId',
        select: 'name',
        model: User
      })
      .sort({ createdAt: 1 })
      .lean();
    
    const formattedQuestions = questions.map(q => ({
      ...q,
      askerName: q.userId.name,
      asker_name: q.userId.name,
      room_id: q.roomId,
      user_id: q.userId._id,
      answered_at: q.answeredAt
    }));
    
    res.json(formattedQuestions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;