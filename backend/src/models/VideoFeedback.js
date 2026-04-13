const mongoose = require('mongoose');

const videoFeedbackSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  videoId: { type: String, required: true, ref: 'ChallengeVideo' },
  reviewerId: { type: String, required: true, ref: 'User' },
  positive: { type: String, required: true },    // 1 positive point
  improvement: { type: String, required: true }, // 1 improvement suggestion
  ratings: {
    confidence: { type: Number, min: 1, max: 5 },
    clarity: { type: Number, min: 1, max: 5 },
    structure: { type: Number, min: 1, max: 5 },
  },
  createdAt: { type: Date, default: Date.now },
});

videoFeedbackSchema.index({ videoId: 1 });
videoFeedbackSchema.index({ reviewerId: 1 });
// One feedback per reviewer per video
videoFeedbackSchema.index({ videoId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('VideoFeedback', videoFeedbackSchema);
