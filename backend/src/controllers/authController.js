const authService = require('../services/auth');
const { User } = require('../config/db');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const { getCache, setCache, delCache } = require('../utils/cache');

const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { name, email, password, location, phone } = req.body;
  try {
    if (phone && !email) {
      const result = await authService.signupPhone(name, phone, location);
      return res.status(201).json(result);
    }
    const result = await authService.signup(name, email, password, location);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, password } = req.body;
  try {
    const result = await authService.login(email, password);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

const sendOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  try {
    const code = await authService.generateOtp(phone);

    if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM) {
      const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      twilio.messages.create({
        body: `Your Collabro OTP is: ${code}. Valid for 10 minutes.`,
        from: process.env.TWILIO_FROM,
        to: phone,
      }).catch(e => console.error('SMS error:', e.message));
    } else {
      console.log(`\n📱 OTP for ${phone}: ${code}\n`);
    }

    return res.status(200).json({ message: 'OTP sent', devMode: !process.env.TWILIO_SID });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

const verifyOtp = async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Phone and OTP code required' });

  try {
    const result = await authService.verifyOtp(phone, code);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const cacheKey = `user:${req.user.userId}`;
    const cachedUser = await getCache(cacheKey);
    if (cachedUser) return res.status(200).json({ user: cachedUser });

    const user = await User.findById(req.user.userId).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    await setCache(cacheKey, user, 3600); // 1 hour TTL
    return res.status(200).json({ user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  try {
    const user = await User.findById(req.user.userId).select('password').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.password) {
      const match = await bcrypt.compare(currentPassword || '', user.password);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.user.userId, { password: hashed });
    
    await delCache(`user:${req.user.userId}`);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { signup, login, sendOtp, verifyOtp, changePassword, getMe };
