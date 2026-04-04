const express = require('express');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { body } = require('express-validator');

const router = express.Router();

router.post('/signup',
  body('name').notEmpty().withMessage('Name is required'),
  body('email').if(body('phone').not().exists()).isEmail().withMessage('Invalid email format'),
  body('password').if(body('phone').not().exists()).isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  authController.signup
);

router.post('/login',
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required'),
  authController.login
);

router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;
