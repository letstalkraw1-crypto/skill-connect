const mongoose = require('mongoose');

const challengeSubmissionSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  challengeId: { type: String, required: true, ref: 'Challenge' },
  userId: { type: String, required: true, ref: 'User' },
  submissionData: String,
  score: Number,
  submittedAt: { type: Date, default: Date.now }
});

challengeSubmissionSchema.index({ challengeId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ChallengeSubmission', challengeSubmissionSchema);
