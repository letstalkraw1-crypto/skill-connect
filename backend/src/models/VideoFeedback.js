const mongoose = require('mongoose');

const videoFeedbackSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  videoId: { type: String, required: true, ref: 'ChallengeVideo' },
  reviewerId: { type: String, required: true, ref: 'User' },
  positive: { type: String, required: true },
  improvement: { type: String, required: true },
  ratings: {
    confidence: { type: Number, min: 1, max: 5 },
    clarity: { type: Number, min: 1, max: 5 },
    structure: { type: Number, min: 1, max: 5 },
  },
  // Video owner's reply to this feedback
  ownerReply: { type: String, default: null },
  ownerRepliedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

videoFeedbackSchema.index({ videoId: 1 });
videoFeedbackSchema.index({ reviewerId: 1 });
videoFeedbackSchema.index({ videoId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('VideoFeedback', videoFeedbackSchema);
