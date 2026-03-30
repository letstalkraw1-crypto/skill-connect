const express = require('express');
const { signup, login, signupPhone, generateOtp, verifyOtp } = require('../services/auth');
const db = require('../db/index');

const router = express.Router();

// POST /auth/signup — email + password OR phone-only
router.post('/signup', async (req, res) => {
  const { name, email, password, location, phone } = req.body;
  try {
    // Phone-only signup (no email/password)
    if (phone && !email) {
      const { signupPhone } = require('../services/auth');
      const result = signupPhone(name, phone, location);
      return res.status(201).json(result);
    }
    const result = await signup(name, email, password, location);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /auth/login — email + password
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await login(email, password);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /auth/send-otp — send OTP to phone number
router.post('/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  try {
    const code = generateOtp(phone);

    // If Twilio is configured, send SMS — otherwise log to console (dev mode)
    if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM) {
      const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      twilio.messages.create({
        body: `Your Collabro OTP is: ${code}. Valid for 10 minutes.`,
        from: process.env.TWILIO_FROM,
        to: phone,
      }).catch(e => console.error('SMS error:', e.message));
    } else {
      // Dev mode — print OTP to server console
      console.log(`\n📱 OTP for ${phone}: ${code}\n`);
    }

    return res.status(200).json({ message: 'OTP sent', devMode: !process.env.TWILIO_SID });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /auth/verify-otp — verify OTP and get JWT
router.post('/verify-otp', (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Phone and OTP code required' });

  try {
    const result = verifyOtp(phone, code);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /auth/signup-phone — register with phone + name
router.post('/signup-phone', (req, res) => {
  const { name, phone, location } = req.body;
  try {
    const result = signupPhone(name, phone, location);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /auth/change-password
router.post('/change-password', require('../services/auth').verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  try {
    const bcrypt = require('bcrypt');
    const db = require('../db/index');
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.password) {
      const match = await bcrypt.compare(currentPassword || '', user.password);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.userId);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
