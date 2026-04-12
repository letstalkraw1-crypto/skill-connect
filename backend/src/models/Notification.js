const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  recipientId: { type: String, ref: 'User', required: true },
  senderId: { type: String, ref: 'User' },
  type: { type: String, required: true },
  message: { type: String, required: true },
  relatedId: { type: String },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Compound index covers all notification queries efficiently
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
