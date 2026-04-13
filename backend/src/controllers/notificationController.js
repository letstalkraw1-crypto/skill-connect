const { Notification, User } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const getNotifications = async (req, res) => {
  try {
    // Fetch notifications without populate (faster)
    const notifications = await Notification.find({ recipientId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (!notifications.length) return res.json([]);

    // Batch fetch all unique senderIds in one query instead of N populate calls
    const senderIds = [...new Set(notifications.map(n => n.senderId).filter(Boolean))];
    const senders = await User.find({ _id: { $in: senderIds } })
      .select('name avatarUrl')
      .lean();
    const senderMap = Object.fromEntries(senders.map(s => [s._id.toString(), s]));

    const enriched = notifications.map(n => ({
      ...n,
      senderId: n.senderId ? (senderMap[n.senderId.toString()] || { _id: n.senderId }) : null,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.userId, isRead: false },
      { isRead: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const sendNotification = async (req, res) => {
  try {
    const { targetUserId, type, message, data } = req.body;
    if (!targetUserId || !message) return res.status(400).json({ error: 'targetUserId and message required' });

    const notification = new Notification({
      _id: uuidv4(),
      recipientId: targetUserId,
      senderId: req.user.userId,
      type: type || 'general',
      message,
      relatedId: data?.roomName || null,
      isRead: false,
    });
    await notification.save();

    // Real-time push
    try {
      const { emitToUser } = require('../socket/index');
      emitToUser(targetUserId, 'notification', {
        type: type || 'general',
        message,
        senderId: { _id: req.user.userId },
        createdAt: new Date(),
        data,
      });
    } catch (emitErr) {
      console.error('Failed to emit notification:', emitErr.message);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getNotifications, markAsRead, sendNotification };
