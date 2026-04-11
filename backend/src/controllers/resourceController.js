const { Resource, ResourceFavorite, Skill, User } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

    const resources = await Resource.find(query).populate('userId', 'name avatarUrl').sort({ createdAt: -1 }).lean();
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createResource = async (req, res) => {
  try {
    const { title, description, type, url, category, skillId, price } = req.body;
    if (!title || !type) return res.status(400).json({ error: 'title and type required' });
    const resource = new Resource({
      _id: uuidv4(),
      userId: req.user.userId,
      title, description, type, url, category, skillId,
      price: price ? parseFloat(price) : 0
    });
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

const createPaymentOrder = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    if (!resource.price || resource.price <= 0) return res.status(400).json({ error: 'This resource is free' });

    const user = await User.findById(req.user.userId).select('name email').lean();
    const order = await razorpay.orders.create({
      amount: Math.round(resource.price * 100),
      currency: 'INR',
      receipt: `res_${resource._id.slice(0, 8)}_${req.user.userId.slice(0, 8)}`,
      notes: { resourceId: resource._id, userId: req.user.userId }
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      resourceTitle: resource.title,
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

    const resource = await Resource.findById(req.params.id).lean();
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    res.json({ success: true, url: resource.url, paid: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listResources, createResource, getResource, favoriteResource, unfavoriteResource, createPaymentOrder, verifyPayment };
