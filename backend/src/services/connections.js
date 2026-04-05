const { v4: uuidv4 } = require('uuid');
const { Connection, User, Notification } = require('../config/db');
const { createNotification } = require('../utils/notification');

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
  
  // Create notification for the addressee
  try {
    const sender = await User.findById(requesterId).select('name');
    if (sender) {
      await createNotification({
        recipientId: addresseeId,
        senderId: requesterId,
        type: 'connection_request',
        message: `${sender.name} sent you a connection request!`,
        relatedId: connection._id
      });
    }
  } catch (err) {
    console.error('Failed to prepare notification:', err);
  }

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

async function listConnections(userId, limit = 10, page = 1) {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;

  const connections = await Connection.find({
    $or: [{ requesterId: userId }, { addresseeId: userId }]
  }).lean();

  const allRelatedUserIds = [...new Set(connections.flatMap(c => [c.requesterId, c.addresseeId]))];
  const relatedUsers = await User.find({ _id: { $in: allRelatedUserIds } }).select('_id name avatarUrl location shortId').lean();

  const getUserData = (id) => {
    const u = relatedUsers.find(user => user._id.toString() === id.toString());
    return u ? {
      id: u._id,
      name: u.name,
      avatarUrl: u.avatarUrl,
      avatar_url: u.avatarUrl,
      location: u.location,
      shortId: u.shortId,
      short_id: u.shortId
    } : { id };
  };

  const pending = connections
    .filter(c => c.status === 'pending' && c.addresseeId.toString() === userId.toString())
    .map(c => ({
      ...getUserData(c.requesterId),
      connectionId: c._id,
      connection_id: c._id
    }));

  const outgoing = connections
    .filter(c => c.status === 'pending' && c.requesterId.toString() === userId.toString())
    .map(c => ({
      ...getUserData(c.addresseeId),
      connectionId: c._id,
      connection_id: c._id
    }));

  const accepted = connections
    .filter(c => c.status === 'accepted')
    .map(c => {
      const otherId = c.requesterId.toString() === userId.toString() ? c.addresseeId : c.requesterId;
      return {
        ...getUserData(otherId),
        connectionId: c._id,
        connection_id: c._id
      };
    });

  const totalDocs = accepted.length;
  const skip = (pageNum - 1) * limitNum;
  const docs = accepted.slice(skip, skip + limitNum);

  return {
    pending,
    outgoing,
    connections: docs,
    totalConnections: totalDocs,
    limit: limitNum,
    page: pageNum,
    totalPages: Math.ceil(totalDocs / limitNum)
  };
}

module.exports = { sendRequest, acceptConnection, declineConnection, deleteConnection, listConnections };

