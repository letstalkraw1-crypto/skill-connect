const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, OTP } = require('../config/db');
const { sendOtpEmail } = require('./emailService');

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS) || 12;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET not found in environment');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
const MAX_OTP_ATTEMPTS = 5;

// ── Generate unique 8-digit short ID ────────────────────────────────────────
async function generateShortId() {
  let id;
  let exists = true;
  while (exists) {
    id = Math.floor(10000000 + Math.random() * 90000000).toString();
    const user = await User.findOne({ shortId: id });
    exists = !!user;
  }
  return id;
}

// ── Email + Password signup ──────────────────────────────────────────────────
async function signup(name, email, password, location) {
  if (!name || !email || !password) {
    const err = new Error('Name, email and password are required');
    err.status = 400; throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const err = new Error('Email already in use'); err.status = 409; throw err;
  }

  const userId = uuidv4();
  const shortId = await generateShortId();

  const user = new User({
    _id: userId,
    shortId,
    name,
    email: normalizedEmail,
    password,
    location: location || null,
    isEmailVerified: false
  });

  await user.save();

  // Send verification OTP
  await generateEmailOtp(normalizedEmail, 'verify');

  const userJson = user.toObject();
  delete userJson.password;

  // Don't issue token yet — require email verification
  return { userId, user: userJson, requiresVerification: true };
}

// ── Email + Password login ───────────────────────────────────────────────────
async function login(email, password) {
  console.log(`🔐 Login attempt for: ${email}`);
  const normalizedEmail = (email || '').toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user) {
    console.log('❌ User not found');
    const err = new Error('Invalid credentials'); err.status = 401; throw err;
  }
  console.log(`👤 User found: ${user._id}`);
  
  let match = false;
  const isBcryptHash = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');

  if (isBcryptHash) {
    match = await user.matchPassword(password);
  } else {
    match = (password === user.password);
    if (match) {
      console.log('🔄 Migrating plain-text password to hash...');
      user.password = password;
      await user.save();
    }
  }

  if (!match) {
    console.log('❌ Password mismatch');
    const err = new Error('Invalid credentials'); err.status = 401; throw err;
  }
  console.log('✅ Login successful');
  const userJson = user.toObject();
  delete userJson.password;

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { userId: user._id, user: userJson, token };
}

// ── Phone signup ─────────────────────────────────────────────────────────────
async function signupPhone(name, phone, location) {
  if (!name || !phone) {
    const err = new Error('Name and phone are required'); err.status = 400; throw err;
  }
  const existing = await User.findOne({ phone });
  if (existing) {
    const err = new Error('Phone number already registered'); err.status = 409; throw err;
  }
  const userId = uuidv4();
  const shortId = await generateShortId();
  
  const user = new User({
    _id: userId,
    shortId,
    name,
    phone,
    location: location || null
  });
  
  await user.save();
  return { userId };
}

// ── Generate & store OTP (Phone) ─────────────────────────────────────────────
async function generateOtp(phone) {
  await OTP.deleteMany({ phone });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const otp = new OTP({ phone, code, expiresAt });
  await otp.save();
  return code;
}

// ── Verify OTP & return JWT (Phone) ──────────────────────────────────────────
async function verifyOtp(phone, code) {
  const otp = await OTP.findOne({ phone, code, used: false }).sort({ _id: -1 });
  if (!otp) {
    const err = new Error('Invalid OTP'); err.status = 401; throw err;
  }
  if (new Date(otp.expiresAt) < new Date()) {
    const err = new Error('OTP expired'); err.status = 401; throw err;
  }
  otp.used = true;
  await otp.save();

  let user = await User.findOne({ phone });
  if (!user) {
    const userId = uuidv4();
    const shortId = await generateShortId();
    user = new User({ _id: userId, shortId, name: phone, phone });
    await user.save();
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { userId: user._id, token };
}

// ── Generate & Send OTP (Email) ──────────────────────────────────────────────
async function generateEmailOtp(email, purpose = 'login') {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail) {
    const err = new Error('Email is required'); err.status = 400; throw err;
  }

  await OTP.deleteMany({ email: normalizedEmail, used: false });

  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const hashedOtp = await bcrypt.hash(plainOtp, 10);

  const otp = new OTP({ email: normalizedEmail, code: hashedOtp, expiresAt, attempts: 0, purpose });
  await otp.save();

  await sendOtpEmail(normalizedEmail, plainOtp, purpose);
  return { message: 'OTP sent to your email' };
}

// ── Verify OTP & return JWT (Email) ──────────────────────────────────────────
async function verifyEmailOtp(email, code, purpose = 'login') {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail || !code) {
    const err = new Error('Email and OTP code are required'); err.status = 400; throw err;
  }

  const otp = await OTP.findOne({ email: normalizedEmail, used: false }).sort({ _id: -1 });

  if (!otp) {
    const err = new Error('No OTP found. Please request a new one.'); err.status = 401; throw err;
  }
  if (new Date(otp.expiresAt) < new Date()) {
    await OTP.deleteOne({ _id: otp._id });
    const err = new Error('OTP has expired. Please request a new one.'); err.status = 401; throw err;
  }
  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    await OTP.deleteOne({ _id: otp._id });
    const err = new Error('Too many attempts. Please request a new OTP.'); err.status = 429; throw err;
  }

  const isMatch = await bcrypt.compare(code, otp.code);
  if (!isMatch) {
    otp.attempts += 1;
    await otp.save();
    const remaining = MAX_OTP_ATTEMPTS - otp.attempts;
    const err = new Error(`Invalid OTP. ${remaining} attempt(s) remaining.`); err.status = 401; throw err;
  }

  otp.used = true;
  await otp.save();

  let user = await User.findOne({ email: normalizedEmail });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const userId = uuidv4();
    const shortId = await generateShortId();
    user = new User({ _id: userId, shortId, name: normalizedEmail.split('@')[0], email: normalizedEmail, isEmailVerified: true });
    await user.save();
  } else {
    // Mark email as verified
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }
  }

  const userJson = user.toObject();
  delete userJson.password;

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { userId: user._id, user: userJson, token, isNewUser };
}

// ── Forgot Password — send reset OTP ─────────────────────────────────────────
async function forgotPassword(email) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  // Always return success to prevent email enumeration
  if (!user) return { message: 'If that email exists, a reset code has been sent.' };

  await generateEmailOtp(normalizedEmail, 'reset');
  return { message: 'Password reset code sent to your email.' };
}

// ── Reset Password — verify OTP then set new password ────────────────────────
async function resetPassword(email, code, newPassword) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!newPassword || newPassword.length < 6) {
    const err = new Error('Password must be at least 6 characters'); err.status = 400; throw err;
  }

  const otp = await OTP.findOne({ email: normalizedEmail, used: false }).sort({ _id: -1 });
  if (!otp) { const err = new Error('Invalid or expired reset code'); err.status = 401; throw err; }
  if (new Date(otp.expiresAt) < new Date()) {
    await OTP.deleteOne({ _id: otp._id });
    const err = new Error('Reset code expired'); err.status = 401; throw err;
  }

  const isMatch = await bcrypt.compare(code, otp.code);
  if (!isMatch) {
    otp.attempts = (otp.attempts || 0) + 1;
    await otp.save();
    const err = new Error('Invalid reset code'); err.status = 401; throw err;
  }

  otp.used = true;
  await otp.save();

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await User.findOneAndUpdate({ email: normalizedEmail }, { password: hashed, isEmailVerified: true });

  return { message: 'Password reset successfully. You can now log in.' };
}

// ── Middleware: Verify JWT Token ───────────────────────────────────────────
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const err = new Error('Access denied. No token provided.');
    err.status = 401;
    return res.status(401).json({ error: err.message });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Middleware: Optional JWT Verification ──────────────────────────────────
function optionalVerifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    next();
  }
}

module.exports = {
  signup, login, signupPhone,
  generateOtp, verifyOtp,
  generateEmailOtp, verifyEmailOtp,
  forgotPassword, resetPassword,
  verifyToken, optionalVerifyToken
};
