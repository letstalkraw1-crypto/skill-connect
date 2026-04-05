const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  shortId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, select: false },
  bio: String,
  avatarUrl: String,
  location: String,
  location_geo: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Verify password
userSchema.methods.matchPassword = async function(enteredPassword) {
  // If the stored password is NOT a bcrypt hash, it might be plain text
  // we handle this migration in the service for better visibility
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ location_geo: '2dsphere' });
userSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model('User', userSchema);
