const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  shortId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: String,
  bio: String,
  avatarUrl: String,
  lat: Number,
  lng: Number,
  location: String,
  stravaId: String,
  garminId: String,
  instagramId: String,
  githubId: String,
  portfolioUrl: String,
  allowTagging: { type: String, default: 'everyone' },
  theme: { type: String, default: 'bright' },
  accountType: { type: String, default: 'public' },
  // Onboarding fields
  lookingFor: { type: String, enum: ['learn', 'collaborate', 'compete', ''], default: '' },
  onboardingComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

userSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model('User', userSchema);
