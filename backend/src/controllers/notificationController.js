const { Notification } = require('../config/db');

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

module.exports = { getNotifications, markAsRead };
