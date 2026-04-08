const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const { Conversation, User } = require('../config/db');
const { persistMessage } = require('../services/messaging');
const { redisClient, subClient } = require('../config/redis');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET not set in environment');

async function getParticipants(conversationId) {
  const conv = await Conversation.findById(conversationId).select('participants').lean();
  return conv ? conv.participants : [];
}

// Global io instance so other services can emit events
let _io = null;
function getIO() { return _io; }

/**
 * Emit a real-time event to a specific user by userId
 */
function emitToUser(userId, event, data) {
  if (_io && userId) {
    _io.to(userId.toString()).emit(event, data);
  }
}

function initSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });
  _io = io;

  if (process.env.REDIS_URL) {
    io.adapter(createAdapter(redisClient, subClient));
  }

  io.on('connection', async (socket) => {
    const token = socket.handshake.auth?.token;
    if (!token) { socket.emit('error', 'Unauthorized'); socket.disconnect(true); return; }

    let userId;
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(payload.userId);
      if (!user) throw new Error('User not found');
      userId = payload.userId;
    } catch {
      socket.emit('error', 'Unauthorized');
      socket.disconnect(true);
      return;
    }

    socket.userId = userId;
    socket.join(userId);

    // Rate limit: max 30 messages per minute
    let msgCount = 0;
    const msgReset = setInterval(() => { msgCount = 0; }, 60000);
    socket.on('disconnect', () => clearInterval(msgReset));

    // --- send_message ---
    socket.on('send_message', async ({ conversationId, text, content, replyToMessageId }) => {
      msgCount++;
      if (msgCount > 30) { socket.emit('error', 'Rate limit exceeded. Slow down.'); return; }
      const messageText = text || content;
      try {
        const message = await persistMessage(conversationId, socket.userId, messageText, replyToMessageId);
        const participants = await getParticipants(conversationId);
        const payload = {
          conversationId, text: messageText, content: messageText,
          senderId: socket.userId, sender_id: socket.userId,
          timestamp: message.sentAt, sentAt: message.sentAt,
          messageId: message._id, message_id: message._id,
        };
        for (const participantId of participants) {
          io.to(participantId.toString()).emit('receive_message', payload);
        }
      } catch (err) {
        socket.emit('error', err.message || 'Failed to send message');
      }
    });

    // --- typing ---
    socket.on('typing', async ({ conversationId }) => {
      try {
        const participants = await getParticipants(conversationId);
        for (const participantId of participants) {
          if (participantId.toString() !== socket.userId.toString()) {
            io.to(participantId.toString()).emit('typing', { conversationId, userId: socket.userId });
          }
        }
      } catch {}
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

module.exports = { initSocket, getIO, emitToUser };
