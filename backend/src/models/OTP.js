const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, sparse: true, lowercase: true, trim: true },
  phone: { type: String, sparse: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  purpose: { type: String, default: 'login', enum: ['login', 'verify', 'reset'] }
});

// Auto-delete expired OTPs after 10 minutes
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.model('OTP', otpSchema);
