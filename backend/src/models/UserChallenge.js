const mongoose = require('mongoose');

const userChallengeSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  userId: { type: String, required: true, ref: 'User' },
  type: { type: String, enum: ['starter', 'builder', 'pro'], required: true },
  targetVideos: { type: Number, required: true }, // 3, 5, or 7
  windowDays: { type: Number, required: true },   // 7, 10, or 14
  videosCompleted: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'expired'], default: 'active' },
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  completedAt: { type: Date },
});

userChallengeSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('UserChallenge', userChallengeSchema);
