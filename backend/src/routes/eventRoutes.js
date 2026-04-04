const express = require('express');
const eventController = require('../controllers/eventController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/venues/search', verifyToken, eventController.getVenues);
router.get('/', verifyToken, eventController.listEvents);
router.get('/:id', verifyToken, eventController.getEvent);
router.post('/', verifyToken, eventController.createEvent);
router.post('/:id/rsvp', verifyToken, eventController.rsvpEvent);
router.put('/:id/rsvp/:targetUserId', verifyToken, eventController.manageRsvp);

module.exports = router;
