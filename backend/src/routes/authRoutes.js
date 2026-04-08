const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { body } = require('express-validator');

const router = express.Router();

// Login/signup — 20 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP send — 10 per 10 min (prevent spam)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  message: { error: 'Too many OTP requests. Please wait 10 minutes.' },
});

router.post('/signup',
  authLimiter,
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email').if(body('phone').not().exists()).isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('password').if(body('phone').not().exists()).isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  authController.signup
);

router.post('/login',
  authLimiter,
  body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required'),
  authController.login
);

router.post('/verify-email', authLimiter, authController.verifyEmail);
router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/send-otp', otpLimiter, authController.sendOtp);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/change-password', verifyToken, authController.changePassword);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
