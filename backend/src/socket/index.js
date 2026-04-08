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

/**
 * Attach Socket.io to an existing HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  // Redis Adapter for scalability (Optional for local dev)
  if (process.env.REDIS_URL) {
    io.adapter(createAdapter(redisClient, subClient));
  }

  io.on('connection', async (socket) => {
    // --- Authentication ---
    const token = socket.handshake.auth?.token;

    if (!token) {
      socket.emit('error', 'Unauthorized');
      socket.disconnect(true);
      return;
    }

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

    // Simple in-memory rate limit: max 30 messages per minute per socket
    let msgCount = 0;
    const msgReset = setInterval(() => { msgCount = 0; }, 60000);
    socket.on('disconnect', () => clearInterval(msgReset));

    // --- send_message ---
    socket.on('send_message', async ({ conversationId, text, content, replyToMessageId }) => {
      msgCount++;
      if (msgCount > 30) {
        socket.emit('error', 'Rate limit exceeded. Slow down.');
        return;
      }
      const messageText = text || content;
      try {
        const message = await persistMessage(conversationId, socket.userId, messageText, replyToMessageId);
        const participants = await getParticipants(conversationId);

        const payload = {
          conversationId,
          conversation_id: conversationId,
          text: messageText,
          content: messageText,
          senderId: socket.userId,
          sender_id: socket.userId,
          timestamp: message.sentAt,
          sent_at: message.sentAt,
          messageId: message._id,
          message_id: message._id,
          replyToMessageId: message.replyToMessageId,
          reply_to: message.replyToMessageId
        };

        // Emit to the room of each participant
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
            io.to(participantId.toString()).emit('typing', {
              conversationId,
              conversation_id: conversationId,
              userId: socket.userId,
              user_id: socket.userId
            });
          }
        }
      } catch {
        // silently ignore
      }
    });

    // --- wallpaper update ---
    socket.on('update_wallpaper', async ({ conversationId, wallpaper }) => {
      try {
        const participants = await getParticipants(conversationId);
        for (const participantId of participants) {
          if (participantId.toString() !== socket.userId.toString()) {
            io.to(participantId.toString()).emit('wallpaper_updated', {
              conversationId,
              conversation_id: conversationId,
              wallpaper
            });
          }
        }
      } catch {
        // silently ignore
      }
    });

    // --- disconnect ---
    socket.on('disconnect', () => {
      // Socket.io automatically leaves rooms on disconnect
    });
  });

  return io;
}

module.exports = { initSocket };
