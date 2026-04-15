const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  followerId: { type: String, required: true, ref: 'User' }, // who is following
  followingId: { type: String, required: true, ref: 'User' }, // who is being followed
  createdAt: { type: Date, default: Date.now },
});

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followSchema.index({ followingId: 1 });
followSchema.index({ followerId: 1 });

module.exports = mongoose.model('Follow', followSchema);
