const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Conversation, User } = require('../db/index');
const { persistMessage } = require('../services/messaging');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

const onlineUsers = new Map();

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
    onlineUsers.set(userId, socket.id);

    // --- send_message ---
    socket.on('send_message', async ({ conversationId, text, content, replyToMessageId }) => {
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

        for (const participantId of participants) {
          const recipientSocketId = onlineUsers.get(participantId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('receive_message', payload);
          }
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
          if (participantId !== socket.userId) {
            const recipientSocketId = onlineUsers.get(participantId);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit('typing', {
                conversationId,
                conversation_id: conversationId,
                userId: socket.userId,
                user_id: socket.userId
              });
            }
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
          if (participantId !== socket.userId) {
            const recipientSocketId = onlineUsers.get(participantId);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit('wallpaper_updated', {
                conversationId,
                conversation_id: conversationId,
                wallpaper
              });
            }
          }
        }
      } catch {
        // silently ignore
      }
    });

    // --- disconnect ---
    socket.on('disconnect', () => {
      onlineUsers.delete(socket.userId);
    });
  });

  return io;
}

module.exports = { initSocket, onlineUsers };
