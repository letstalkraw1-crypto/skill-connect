const express = require('express');
const { createWebinar, getMeetingToken, deleteWebinar } = require('../controllers/webinarController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, createWebinar);
router.post('/:roomName/token', verifyToken, getMeetingToken);
router.delete('/:roomName', verifyToken, deleteWebinar);

module.exports = router;
