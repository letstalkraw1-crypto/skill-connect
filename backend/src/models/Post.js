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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
