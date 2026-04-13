const mongoose = require('mongoose');

const challengeVideoSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  challengeId: { type: String, required: true, ref: 'DailyChallenge' },
  userId: { type: String, required: true, ref: 'User' },
  videoUrl: { type: String, required: true },
  caption: { type: String, default: '' },
  duration: { type: Number }, // seconds
  feedbackCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

challengeVideoSchema.index({ challengeId: 1, createdAt: -1 });
challengeVideoSchema.index({ userId: 1, createdAt: -1 });
// One submission per user per challenge
challengeVideoSchema.index({ challengeId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ChallengeVideo', challengeVideoSchema);
