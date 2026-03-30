const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  userId: { type: String, required: true, ref: 'User' },
  caption: String,
  imageUrl: String,
  imageUrls: { type: [String], default: [] },
  visibility: { type: String, default: 'everyone' },
  verificationLink: String,
  note: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
