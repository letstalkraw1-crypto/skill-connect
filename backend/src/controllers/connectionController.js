const connectionService = require('../services/connections');
const { User } = require('../config/db');

const sendRequest = async (req, res) => {
  const { targetUserId } = req.body;
  try {
    const connection = await connectionService.sendRequest(req.user.userId, targetUserId);
    res.status(201).json(connection);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const acceptConnection = async (req, res) => {
  try {
    const connection = await connectionService.acceptConnection(req.params.id, req.user.userId);
    res.status(200).json(connection);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const declineConnection = async (req, res) => {
  try {
    const connection = await connectionService.declineConnection(req.params.id, req.user.userId);
    res.status(200).json(connection);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const deleteConnection = async (req, res) => {
  try {
    const result = await connectionService.deleteConnection(req.params.id, req.user.userId);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const listConnections = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const reqUserId = req.user ? req.user.userId : null;
    
    const targetUser = await User.findById(targetUserId).select('accountType').lean();
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    
    const connectionsData = await connectionService.listConnections(targetUserId);
    
    if (targetUser.accountType === 'private') {
      if (reqUserId === targetUserId) {
        return res.status(200).json(connectionsData);
      }
      const isConnected = connectionsData.connections.some(c => c.id === reqUserId);
      if (!isConnected) {
        return res.status(403).json({ error: 'Private account. Only connections can view this list.' });
      }
    }
    
    res.status(200).json(connectionsData);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getConnectionStatus = async (req, res) => {
  try {
    const { Connection } = require('../config/db');
    const conn = await Connection.findById(req.params.connectionId).lean();
    if (!conn) return res.json({ status: 'not_found' });
    res.json({ status: conn.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { sendRequest, acceptConnection, declineConnection, deleteConnection, listConnections, getConnectionStatus };
