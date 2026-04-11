const { QARoom, QAQuestion } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const listRooms = async (req, res) => {
  try {
    const rooms = await QARoom.find().populate('hostId', 'name').populate('skillId', 'name').sort({ scheduledAt: -1 }).lean();
    res.json(rooms.map(room => ({
      ...room,
      hostName: room.hostId.name,
      host_name: room.hostId.name,
      skillName: room.skillId?.name || null,
      skill_name: room.skillId?.name || null,
      scheduled_at: room.scheduledAt
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createRoom = async (req, res) => {
  try {
    const { skillId, title, scheduledAt } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const roomId = uuidv4();
    await new QARoom({ _id: roomId, hostId: req.user.userId, skillId: skillId || null, title, scheduledAt: scheduledAt || null }).save();
    res.json({ id: roomId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });
    const roomId = req.params.id;
    const room = await QARoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Q&A room not found' });
    const questionId = uuidv4();
    await new QAQuestion({ _id: questionId, roomId, userId: req.user.userId, question }).save();
    res.json({ id: questionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const answerQuestion = async (req, res) => {
  try {
    const { answer } = req.body;
    const question = await QAQuestion.findById(req.params.id).populate('roomId');
    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (question.roomId.hostId.toString() !== req.user.userId) return res.status(403).json({ error: 'Only host can answer' });
    await QAQuestion.findByIdAndUpdate(req.params.id, { answer, answeredAt: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getQuestions = async (req, res) => {
  try {
    const questions = await QAQuestion.find({ roomId: req.params.id }).populate('userId', 'name').sort({ createdAt: 1 }).lean();
    res.json(questions.map(q => ({
      ...q,
      askerName: q.userId.name,
      asker_name: q.userId.name,
      room_id: q.roomId,
      user_id: q.userId._id,
      answered_at: q.answeredAt
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listRooms, createRoom, askQuestion, answerQuestion, getQuestions };
