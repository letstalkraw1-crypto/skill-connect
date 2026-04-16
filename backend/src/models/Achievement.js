const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  key: { type: String, required: true, unique: true }, // e.g., 'first_video', 'week_streak'
  name: { type: String, required: true },
  description: { type: String, required: true },
  badge: { type: String, required: true }, // emoji or icon
  points: { type: Number, default: 0 },
  category: { type: String, enum: ['streak', 'social', 'quality', 'milestone'], default: 'milestone' },
  requirements: {
    type: { type: String, enum: ['count', 'streak', 'score', 'custom'], required: true },
    target: { type: Number }, // target count/streak/score
    field: { type: String }, // field to check (e.g., 'totalVideos', 'streakCount')
    customCheck: { type: String } // custom logic identifier
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const userAchievementSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  userId: { type: String, required: true, ref: 'User' },
  achievementKey: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now },
  progress: { type: Number, default: 0 }, // current progress towards achievement
  isCompleted: { type: Boolean, default: false }
});

// Compound index for efficient queries
userAchievementSchema.index({ userId: 1, achievementKey: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1, isCompleted: 1 });

const Achievement = mongoose.model('Achievement', achievementSchema);
const UserAchievement = mongoose.model('UserAchievement', userAchievementSchema);

module.exports = { Achievement, UserAchievement };