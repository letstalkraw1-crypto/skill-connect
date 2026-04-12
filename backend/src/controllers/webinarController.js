const { v4: uuidv4 } = require('uuid');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// In-memory store for paid webinar sessions
const webinarStore = new Map();
// Code → roomName lookup
const codeToRoom = new Map();

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (codeToRoom.has(code));
  return code;
};

// POST /api/webinars — register a webinar
const createWebinar = async (req, res) => {
  try {
    const { title, scheduledAt, description, price, roomName } = req.body;
    if (!title || !roomName) return res.status(400).json({ error: 'Title and roomName are required' });

    const entryFee = price ? parseFloat(price) : 0;
    const code = generateCode();

    webinarStore.set(roomName, {
      title,
      description,
      scheduledAt,
      hostId: req.user.userId,
      price: entryFee,
      code,
      paidUsers: new Set(),
      createdAt: new Date(),
    });
    codeToRoom.set(code, roomName);

    res.json({ ok: true, roomName, title, price: entryFee, code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/webinars/by-code/:code — resolve code to roomName
const getWebinarByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const roomName = codeToRoom.get(code.toUpperCase());
    if (!roomName) return res.status(404).json({ error: 'Invalid webinar code' });
    const info = webinarStore.get(roomName);
    if (!info) return res.status(404).json({ error: 'Webinar not found or expired' });
    const isHost = info.hostId === req.user.userId;
    const hasPaid = info.paidUsers.has(req.user.userId);
    res.json({ roomName, title: info.title, price: info.price, isHost, hasPaid, canJoin: isHost || info.price === 0 || hasPaid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/webinars/:roomName — get webinar info
const getWebinarInfo = async (req, res) => {
  try {
    const { roomName } = req.params;
    const info = webinarStore.get(roomName);
    if (!info) return res.status(404).json({ error: 'Webinar not found' });
    const isHost = info.hostId === req.user.userId;
    const hasPaid = info.paidUsers.has(req.user.userId);
    res.json({
      title: info.title,
      description: info.description,
      scheduledAt: info.scheduledAt,
      price: info.price,
      isHost,
      hasPaid,
      canJoin: isHost || info.price === 0 || hasPaid,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/webinars/:roomName/payment/order
const createPaymentOrder = async (req, res) => {
  try {
    const { roomName } = req.params;
    const info = webinarStore.get(roomName);
    if (!info) return res.status(404).json({ error: 'Webinar not found' });
    if (!info.price || info.price <= 0) return res.status(400).json({ error: 'This webinar is free' });
    if (info.hostId === req.user.userId) return res.status(403).json({ error: 'You are the host' });

    const { User } = require('../config/db');
    const user = await User.findById(req.user.userId).select('name email').lean();

    const order = await razorpay.orders.create({
      amount: Math.round(info.price * 100),
      currency: 'INR',
      receipt: `web_${roomName.slice(0, 8)}_${req.user.userId.slice(0, 8)}`,
      notes: { roomName, userId: req.user.userId },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      webinarTitle: info.title,
      userName: user?.name || '',
      userEmail: user?.email || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/webinars/:roomName/payment/verify
const verifyPayment = async (req, res) => {
  try {
    const { roomName } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const info = webinarStore.get(roomName);
    if (info) info.paidUsers.add(req.user.userId);

    res.json({ success: true, paid: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createWebinar, getWebinarByCode, getWebinarInfo, createPaymentOrder, verifyPayment };
