const express = require('express');
const jwt = require('jsonwebtoken');
const adminController = require('../controllers/adminController');

const router = express.Router();

const ADMIN_JWT_SECRET = process.env.JWT_SECRET + '_admin';

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded.role !== 'admin') throw new Error('Not admin');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

router.post('/login', adminController.login);
router.get('/users', adminAuth, adminController.getUsers);
router.get('/users/:id', adminAuth, adminController.getUser);
router.put('/users/:id', adminAuth, adminController.updateUser);
router.delete('/users/:id', adminAuth, adminController.deleteUser);
router.get('/stats', adminAuth, adminController.getStats);
router.get('/skills/:skillId/users', adminAuth, adminController.getSkillUsers);
router.post('/skills', adminAuth, adminController.addSkill);
router.delete('/skills/:id', adminAuth, adminController.deleteSkill);
router.get('/events', adminAuth, adminController.getEvents);
router.put('/events/:id', adminAuth, adminController.updateEvent);
router.delete('/events/:id', adminAuth, adminController.deleteEvent);
router.get('/verifications', adminAuth, adminController.getPendingVerifications);
router.put('/verifications/:id', adminAuth, adminController.reviewVerification);

module.exports = router;
