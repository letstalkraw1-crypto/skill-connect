const express = require('express');
const qaController = require('../controllers/qaController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', qaController.listRooms);
router.post('/', verifyToken, qaController.createRoom);
router.post('/:id/questions', verifyToken, qaController.askQuestion);
router.put('/questions/:id', verifyToken, qaController.answerQuestion);
router.get('/:id/questions', qaController.getQuestions);

module.exports = router;
