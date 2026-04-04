const express = require('express');
const connectionController = require('../controllers/connectionController');
const { verifyToken, optionalVerifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/request', verifyToken, connectionController.sendRequest);
router.put('/:id/accept', verifyToken, connectionController.acceptConnection);
router.put('/:id/decline', verifyToken, connectionController.declineConnection);
router.delete('/:id', verifyToken, connectionController.deleteConnection);
router.get('/:userId', optionalVerifyToken, connectionController.listConnections);

module.exports = router;
