const { QARoom, QAQuestion, User } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const listRooms = async (req, res) => {
  try {
    const rooms = await QARoom.find().populate('hostId', 'name avatarUrl').populate('skillId', 'name').sort({ scheduledAt: -1 }).lean();
    res.json(rooms.map(room => ({
      ...room,
      hostName: room.hostId?.name,
      host_name: room.hostId?.name,
      hostAvatar: room.hostId?.avatarUrl,
      skillName: room.skillId?.name || null,
      skill_name: room.skillId?.name || null,
      scheduled_at: room.scheduledAt,
      isHost: room.hostId?._id?.toString() === req.user?.userId
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createRoom = async (req, res) => {
  try {
    const { skillId, title, scheduledAt, price } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const roomId = uuidv4();
    await new QARoom({
      _id: roomId,
      hostId: req.user.userId,
      skillId: skillId || null,
      title,
      scheduledAt: scheduledAt || null,
      price: price ? parseFloat(price) : 0
    }).save();
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

    // If paid room, host can always ask; others need to have paid (we trust frontend for now)
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
      askerName: q.userId?.name,
      asker_name: q.userId?.name,
      room_id: q.roomId,
      user_id: q.userId?._id,
      answered_at: q.answeredAt
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createPaymentOrder = async (req, res) => {
  try {
    const room = await QARoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Q&A room not found' });
    if (!room.price || room.price <= 0) return res.status(400).json({ error: 'This session is free' });
    if (room.hostId.toString() === req.user.userId) return res.status(403).json({ error: 'You are the host' });

    const user = await User.findById(req.user.userId).select('name email').lean();
    const order = await razorpay.orders.create({
      amount: Math.round(room.price * 100),
      currency: 'INR',
      receipt: `qa_${room._id.slice(0, 8)}_${req.user.userId.slice(0, 8)}`,
      notes: { roomId: room._id, userId: req.user.userId }
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      sessionTitle: room.title,
      userName: user?.name || '',
      userEmail: user?.email || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }
    res.json({ success: true, paid: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listRooms, createRoom, askQuestion, answerQuestion, getQuestions, createPaymentOrder, verifyPayment };
