const express = require('express');
const { createWebinar, getWebinarInfo, getMeetingToken, createPaymentOrder, verifyPayment, deleteWebinar } = require('../controllers/webinarController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, createWebinar);
router.get('/:roomName', verifyToken, getWebinarInfo);
router.post('/:roomName/token', verifyToken, getMeetingToken);
router.post('/:roomName/payment/order', verifyToken, createPaymentOrder);
router.post('/:roomName/payment/verify', verifyToken, verifyPayment);
router.delete('/:roomName', verifyToken, deleteWebinar);

module.exports = router;
