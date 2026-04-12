const { Notification } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const getNotifications = async (req, res) => {
  const start = Date.now();
  try {
    const notifications = await Notification.find({ recipientId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('senderId', 'name avatarUrl')
      .lean();
    
    const duration = Date.now() - start;
    if (duration > 100) {
      console.warn(`[Performance Warning] getNotifications took ${duration}ms for user ${req.user.userId}`);
    }

    res.json(notifications);
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
    } catch {}

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getNotifications, markAsRead, sendNotification };
