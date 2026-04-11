const express = require('express');
const challengeController = require('../controllers/challengeController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', verifyToken, challengeController.listChallenges);
router.post('/', verifyToken, challengeController.createChallenge);
router.post('/:id/submit', verifyToken, challengeController.submitToChallenge);
router.get('/:id/submissions', verifyToken, challengeController.getSubmissions);

module.exports = router;
