const mongoose = require('mongoose');

const postLikeSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  postId: { type: String, required: true, ref: 'Post' },
  userId: { type: String, required: true, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

postLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('PostLike', postLikeSchema);
