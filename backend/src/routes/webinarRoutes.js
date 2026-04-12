const express = require('express');
const { createWebinar, getWebinarByCode, getWebinarInfo, createPaymentOrder, verifyPayment } = require('../controllers/webinarController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, createWebinar);
router.get('/by-code/:code', verifyToken, getWebinarByCode);
router.get('/:roomName', verifyToken, getWebinarInfo);
router.post('/:roomName/payment/order', verifyToken, createPaymentOrder);
router.post('/:roomName/payment/verify', verifyToken, verifyPayment);

module.exports = router;
