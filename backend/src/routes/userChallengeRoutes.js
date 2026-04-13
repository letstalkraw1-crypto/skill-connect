const express = require('express');
const { startChallenge, getActiveChallenge, getChallengeHistory, completeOnboardingChallenge, getUserProgress } = require('../controllers/userChallengeController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/onboarding', verifyToken, completeOnboardingChallenge);
router.post('/start', verifyToken, startChallenge);
router.get('/active', verifyToken, getActiveChallenge);
router.get('/history', verifyToken, getChallengeHistory);
router.get('/progress', verifyToken, getUserProgress);
router.get('/progress/:userId', verifyToken, getUserProgress);

module.exports = router;
