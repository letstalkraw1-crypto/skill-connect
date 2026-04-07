const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  participants: [{ type: String, ref: 'User' }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String },
  groupAvatar: { type: String },
  communityId: { type: String, ref: 'Community' }, // linked community if group chat
  wallpaper: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', conversationSchema);
