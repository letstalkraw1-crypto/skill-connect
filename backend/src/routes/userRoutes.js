const express = require('express');
const multer = require('multer');
const userController = require('../controllers/userController');
const { verifyToken, optionalVerifyToken } = require('../middleware/authMiddleware');

const router = express.Router();
const certUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/onboarding', verifyToken, userController.completeOnboarding);
router.get('/skills-list', userController.getSkillsList);
router.get('/by-short-id/:shortId', userController.getProfileByShortId);
router.post('/skills', verifyToken, userController.addSkills);
router.delete('/skills/:skillId', verifyToken, userController.deleteSkill);
router.post('/verifications', verifyToken, certUpload.single('certificate'), userController.submitVerification);
router.get('/verifications', verifyToken, userController.getVerifications);
router.post('/endorsements', verifyToken, userController.addEndorsement);
router.get('/:userId/endorsements', userController.getEndorsements);
router.post('/feedback', verifyToken, userController.addFeedback);
router.get('/feedback', verifyToken, userController.getFeedback);
router.get('/:userId/share', userController.getShareData);
router.get('/:userId', optionalVerifyToken, userController.getProfile);
router.put('/', verifyToken, userController.updateMyProfile);
router.put('/:userId', verifyToken, userController.updateProfile);

module.exports = router;
