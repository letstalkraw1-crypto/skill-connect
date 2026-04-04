const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  recipientId: { type: String, ref: 'User', required: true, index: true },
  senderId: { type: String, ref: 'User', required: true },
  type: { type: String, required: true }, // 'connection_request', 'like', 'comment'
  message: { type: String, required: true },
  relatedId: { type: String }, // e.g., PostId or ConnectionId
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
