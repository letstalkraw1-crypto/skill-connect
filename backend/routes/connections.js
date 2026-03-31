const express = require('express');
const { verifyToken, optionalVerifyToken } = require('../services/auth');
const { User } = require('../db/index');
const {
  sendRequest,
  acceptConnection,
  declineConnection,
  deleteConnection,
  listConnections,
} = require('../services/connections');

const router = express.Router();

/**
 * POST /connections/request
 * Send a connection request to another user.
 */
router.post('/request', verifyToken, async (req, res) => {
  const { targetUserId } = req.body;
  try {
    const connection = await sendRequest(req.user.userId, targetUserId);
    return res.status(201).json(connection);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * PUT /connections/:id/accept
 * Accept a pending connection request (addressee only).
 */
router.put('/:id/accept', verifyToken, async (req, res) => {
  try {
    const connection = await acceptConnection(req.params.id, req.user.userId);
    return res.status(200).json(connection);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * PUT /connections/:id/decline
 * Decline a pending connection request (addressee only).
 */
router.put('/:id/decline', verifyToken, async (req, res) => {
  try {
    const connection = await declineConnection(req.params.id, req.user.userId);
    return res.status(200).json(connection);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * DELETE /connections/:id
 * Delete a connection (either party may delete).
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await deleteConnection(req.params.id, req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /connections/:userId
 * List all connections for a user.
 */
router.get('/:userId', optionalVerifyToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const reqUserId = req.user ? req.user.userId : null;
    
    // Check target user's privacy settings
    const targetUser = await User.findById(targetUserId).select('accountType').lean();
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    
    const connectionsData = await listConnections(targetUserId);
    
    if (targetUser.accountType === 'private') {
      // Allow if viewing own profile
      if (reqUserId === targetUserId) {
        return res.status(200).json(connectionsData);
      }
      
      // Allow if requester is an accepted connection
      const isConnected = connectionsData.connections.some(c => c.id === reqUserId);
      if (!isConnected) {
        return res.status(403).json({ error: 'Private account. Only connections can view this list.' });
      }
    }
    
    // Public account or connected user
    return res.status(200).json(connectionsData);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
