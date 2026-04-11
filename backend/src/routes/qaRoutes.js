const express = require('express');
const qaController = require('../controllers/qaController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', verifyToken, qaController.listRooms);
router.post('/', verifyToken, qaController.createRoom);
router.post('/:id/questions', verifyToken, qaController.askQuestion);
router.put('/questions/:id', verifyToken, qaController.answerQuestion);
router.get('/:id/questions', verifyToken, qaController.getQuestions);
router.post('/:id/payment/order', verifyToken, qaController.createPaymentOrder);
router.post('/:id/payment/verify', verifyToken, qaController.verifyPayment);

module.exports = router;
