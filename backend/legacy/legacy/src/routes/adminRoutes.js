const express = require('express');
const adminController = require('../controllers/adminController');

const router = express.Router();

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
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

module.exports = router;
