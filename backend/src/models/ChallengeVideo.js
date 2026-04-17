const mongoose = require('mongoose');

const challengeVideoSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  challengeId: { type: String, required: true, ref: 'DailyChallenge' },
  userId: { type: String, required: true, ref: 'User' },
  videoUrl: { type: String, required: true },
  caption: { type: String, default: '' },
  duration: { type: Number },
  bytes: { type: Number, default: null },
  feedbackCount: { type: Number, default: 0 },
  // AI Analysis
  aiAnalysis: {
    status: { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending' },
    transcript: { type: String, default: null },
    scores: {
      confidence: { type: Number, min: 1, max: 10 },
      clarity: { type: Number, min: 1, max: 10 },
      structure: { type: Number, min: 1, max: 10 },
      relevance: { type: Number, min: 1, max: 10 },
      overall: { type: Number, min: 1, max: 10 },
    },
    feedback: { type: String, default: null },   // AI written feedback
    strengths: [String],
    improvements: [String],
    nlp: {
      wordCount: { type: Number, default: null },
      fillerCount: { type: Number, default: null },
      vocabularyRichness: { type: Number, default: null },
      avgWordsPerSentence: { type: Number, default: null },
    },
    analyzedAt: { type: Date, default: null },
    processingStartedAt: { type: Date, default: null },
  },
  createdAt: { type: Date, default: Date.now },
});

challengeVideoSchema.index({ challengeId: 1, createdAt: -1 });
challengeVideoSchema.index({ userId: 1, createdAt: -1 });
challengeVideoSchema.index({ challengeId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ChallengeVideo', challengeVideoSchema);
