const { v4: uuidv4 } = require('uuid');
const { Connection, User } = require('../db/index');

async function sendRequest(requesterId, addresseeId) {
  if (!addresseeId || addresseeId === 'undefined') {
    const err = new Error('Invalid target user ID'); err.status = 400; throw err;
  }
  if (requesterId === addresseeId) {
    const err = new Error('Cannot connect with yourself');
    err.status = 400;
    throw err;
  }

  const existing = await Connection.findOne({
    $or: [
      { requesterId, addresseeId },
      { requesterId: addresseeId, addresseeId: requesterId }
    ]
  });

  if (existing) {
    if (existing.status === 'pending') {
      const err = new Error('Request already pending'); err.status = 409; throw err;
    }
    if (existing.status === 'accepted') {
      const err = new Error('Already connected'); err.status = 409; throw err;
    }
  }

  const connection = new Connection({
    _id: uuidv4(),
    requesterId,
    addresseeId,
    status: 'pending'
  });

  await connection.save();
  return connection.toObject();
}

async function acceptConnection(connectionId, userId) {
  const conn = await Connection.findById(connectionId);
  if (!conn) { const err = new Error('Connection not found'); err.status = 404; throw err; }
  if (conn.addresseeId !== userId) { const err = new Error('Forbidden'); err.status = 403; throw err; }
  
  conn.status = 'accepted';
  conn.updatedAt = new Date();
  await conn.save();
  
  return conn.toObject();
}

async function declineConnection(connectionId, userId) {
  const conn = await Connection.findById(connectionId);
  if (!conn) { const err = new Error('Connection not found'); err.status = 404; throw err; }
  if (conn.addresseeId !== userId) { const err = new Error('Forbidden'); err.status = 403; throw err; }
  
  conn.status = 'declined';
  conn.updatedAt = new Date();
  await conn.save();
  
  return conn.toObject();
}

async function deleteConnection(connectionId, userId) {
  const conn = await Connection.findById(connectionId);
  if (!conn) { const err = new Error('Connection not found'); err.status = 404; throw err; }
  if (conn.requesterId !== userId && conn.addresseeId !== userId) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }
  
  await Connection.findByIdAndDelete(connectionId);
  return { ok: true };
}

async function listConnections(userId) {
  const connections = await Connection.find({
    $or: [{ requesterId: userId }, { addresseeId: userId }]
  });

  // Pending requests where I am the addressee
  const requesterIds = connections
    .filter(c => c.status === 'pending' && c.addresseeId === userId)
    .map(c => c.requesterId);

  const acceptedConnIds = connections
    .filter(c => c.status === 'accepted')
    .map(c => c.requesterId === userId ? c.addresseeId : c.requesterId);

  const pendingUsers = await User.find({ _id: { $in: requesterIds } }).lean();
  const acceptedUsers = await User.find({ _id: { $in: acceptedConnIds } }).lean();

  const pending = connections
    .filter(c => c.status === 'pending' && c.addresseeId === userId)
    .map(c => {
      const user = pendingUsers.find(u => u._id === c.requesterId);
      return {
        connectionId: c._id,
        connection_id: c._id,
        id: c.requesterId,
        name: user?.name,
        avatarUrl: user?.avatarUrl,
        avatar_url: user?.avatarUrl,
        location: user?.location
      };
    });

  const accepted = connections
    .filter(c => c.status === 'accepted')
    .map(c => {
      const connectedUserId = c.requesterId === userId ? c.addresseeId : c.requesterId;
      const user = acceptedUsers.find(u => u._id === connectedUserId);
      return {
        connectionId: c._id,
        connection_id: c._id,
        id: connectedUserId,
        name: user?.name,
        avatarUrl: user?.avatarUrl,
        avatar_url: user?.avatarUrl,
        location: user?.location
      };
    });

  return { pending, connections: accepted };
}

module.exports = { sendRequest, acceptConnection, declineConnection, deleteConnection, listConnections };

