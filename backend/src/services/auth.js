const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, OTP } = require('../config/db');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = '30d';
const OTP_EXPIRY_MINUTES = 10;

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

  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Email already in use'); err.status = 409; throw err;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = uuidv4();
  const shortId = await generateShortId();
  
  const user = new User({
    _id: userId,
    shortId,
    name,
    email,
    password: hashedPassword,
    location: location || null
  });
  
  await user.save();
  const userJson = user.toObject();
  delete userJson.password;

  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { user: userJson, token };
}

// ── Email + Password login ───────────────────────────────────────────────────
async function login(email, password) {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    const err = new Error('Invalid credentials'); err.status = 401; throw err;
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const err = new Error('Invalid credentials'); err.status = 401; throw err;
  }
  const userJson = user.toObject();
  delete userJson.password;

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { user: userJson, token };
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

// ── Generate & store OTP ─────────────────────────────────────────────────────
async function generateOtp(phone) {
  // Clean up old OTPs for this phone
  await OTP.deleteMany({ phone });

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  
  const otp = new OTP({ phone, code, expiresAt });
  await otp.save();

  return code;
}

// ── Verify OTP & return JWT ──────────────────────────────────────────────────
async function verifyOtp(phone, code) {
  const otp = await OTP.findOne({ phone, code, used: false }).sort({ _id: -1 });

  if (!otp) {
    const err = new Error('Invalid OTP'); err.status = 401; throw err;
  }
  if (new Date(otp.expiresAt) < new Date()) {
    const err = new Error('OTP expired'); err.status = 401; throw err;
  }

  // Mark as used
  otp.used = true;
  await otp.save();

  // Find or auto-create user for this phone
  let user = await User.findOne({ phone });
  if (!user) {
    const userId = uuidv4();
    const shortId = await generateShortId();
    user = new User({
      _id: userId,
      shortId,
      name: phone,
      phone
    });
    await user.save();
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { userId: user._id, token };
}

module.exports = { signup, login, signupPhone, generateOtp, verifyOtp };

