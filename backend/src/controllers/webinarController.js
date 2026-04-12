const { v4: uuidv4 } = require('uuid');
const https = require('https');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'api.daily.co';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// In-memory store for active webinar sessions (price, hostId, title)
// Keyed by roomName — sufficient for active sessions
const webinarStore = new Map();

const dailyRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: DAILY_API_URL,
      path: `/v1${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(responseData)); }
        catch { resolve(responseData); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

// POST /api/webinars
const createWebinar = async (req, res) => {
  try {
    const { title, scheduledAt, description, price } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const roomName = `collabro-${uuidv4().slice(0, 8)}`;
    const entryFee = price ? parseFloat(price) : 0;

    const room = await dailyRequest('POST', '/rooms', {
      name: roomName,
      privacy: 'private',
      properties: {
        enable_screenshare: true,
        enable_chat: true,
        enable_knocking: true,
        start_video_off: false,
        start_audio_off: true,
        exp: scheduledAt
          ? Math.floor(new Date(scheduledAt).getTime() / 1000) + 86400
          : Math.floor(Date.now() / 1000) + 86400 * 7,
      },
    });

    if (room.error) return res.status(500).json({ error: room.error });

    // Store webinar metadata
    webinarStore.set(roomName, {
      title,
      description,
      scheduledAt,
      hostId: req.user.userId,
      price: entryFee,
      paidUsers: new Set(), // track who has paid
      createdAt: new Date(),
    });

    res.json({
      id: uuidv4(),
      title,
      description,
      scheduledAt,
      roomName: room.name,
      roomUrl: room.url,
      hostId: req.user.userId,
      price: entryFee,
      createdAt: new Date(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/webinars/:roomName — get webinar info (price, title)
const getWebinarInfo = async (req, res) => {
  try {
    const { roomName } = req.params;
    const info = webinarStore.get(roomName);
    if (!info) return res.status(404).json({ error: 'Webinar not found or expired' });
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

// POST /api/webinars/:roomName/token
const getMeetingToken = async (req, res) => {
  try {
    const { roomName } = req.params;
    const { isHost } = req.body;
    const userId = req.user.userId;

    // Check if paid webinar and user hasn't paid
    const info = webinarStore.get(roomName);
    if (info && !isHost && info.price > 0 && info.hostId !== userId && !info.paidUsers.has(userId)) {
      return res.status(402).json({ error: 'Payment required', price: info.price, requiresPayment: true });
    }

    const tokenData = await dailyRequest('POST', '/meeting-tokens', {
      properties: {
        room_name: roomName,
        is_owner: !!isHost,
        enable_screenshare: !!isHost,
        start_video_off: false,
        start_audio_off: !isHost,
        exp: Math.floor(Date.now() / 1000) + 86400,
      },
    });

    if (tokenData.error) return res.status(500).json({ error: tokenData.error });
    res.json({ token: tokenData.token });
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

// DELETE /api/webinars/:roomName
const deleteWebinar = async (req, res) => {
  try {
    const { roomName } = req.params;
    await dailyRequest('DELETE', `/rooms/${roomName}`);
    webinarStore.delete(roomName);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createWebinar, getWebinarInfo, getMeetingToken, createPaymentOrder, verifyPayment, deleteWebinar };
