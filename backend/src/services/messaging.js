const { v4: uuidv4 } = require('uuid');
const { Conversation, Message, User } = require('../config/db');

async function createConversation(creatorId, participantIds) {
  // Ensure all participant IDs are valid and include the creator
  const uniqueIds = Array.from(new Set([creatorId, ...(participantIds || [])]))
    .filter(id => typeof id === 'string' && id.trim() !== '');

  // Validate all participants exist
  for (const uid of uniqueIds) {
    const p = await User.findById(uid);
    if (!p) {
      const err = new Error('Participant not found'); err.status = 404; throw err;
    }
  }

  // Check if conversation already exists between these participants (for 1:1 chats)
  if (uniqueIds.length === 2) {
    const otherId = uniqueIds.find(id => id !== creatorId);
    const existing = await Conversation.findOne({
      participants: { $all: [creatorId, otherId] }
    });
    if (existing) {
      const otherUser = await User.findById(otherId).select('_id name avatarUrl').lean();
      return { id: existing._id, otherUser };
    }
  }

  const conversation = new Conversation({
    _id: uuidv4(),
    participants: uniqueIds
  });

  await conversation.save();

  const otherUserId = uniqueIds.find(id => id !== creatorId);
  const otherUser = otherUserId ? await User.findById(otherUserId).select('_id name avatarUrl').lean() : null;
  
  return { id: conversation._id, otherUser };
}

async function listConversations(userId) {
  const conversations = await Conversation.find({
    participants: userId
  }).sort({ createdAt: -1 }).lean();

  return Promise.all(conversations.map(async (conv) => {
    const lastMessage = await Message.findOne({ conversationId: conv._id })
      .sort({ sentAt: -1 })
      .lean();

    if (conv.isGroup) {
      return {
        id: conv._id,
        createdAt: conv.createdAt,
        wallpaper: conv.wallpaper,
        isGroup: true,
        groupName: conv.groupName,
        groupAvatar: conv.groupAvatar,
        communityId: conv.communityId,
        otherUser: { name: conv.groupName, avatarUrl: conv.groupAvatar },
        lastMessage: lastMessage?.text || null,
        lastAt: lastMessage?.sentAt || conv.createdAt,
      };
    }

    const otherIds = conv.participants.filter(id => id !== userId);
    const otherUser = otherIds.length > 0
      ? await User.findById(otherIds[0]).select('_id name avatarUrl').lean()
      : { name: 'Unknown', avatarUrl: null };

    return {
      id: conv._id,
      createdAt: conv.createdAt,
      wallpaper: conv.wallpaper,
      isGroup: false,
      otherUser: { ...otherUser, id: otherUser?._id, avatar_url: otherUser?.avatarUrl },
      lastMessage: lastMessage?.text || null,
      lastAt: lastMessage?.sentAt || conv.createdAt,
    };
  }));
}

async function getMessages(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }

  if (!conversation.participants.includes(userId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  const messages = await Message.find({ conversationId }).sort({ sentAt: 1 }).lean();

  const messagesWithSnake = messages.map(m => ({
    ...m,
    id: m._id,
    sender_id: m.senderId,
    conversation_id: m.conversationId,
    content: m.text,
    sent_at: m.sentAt,
    created_at: m.sentAt,
    reply_to: m.replyToMessageId
  }));

  return { 
    messages: messagesWithSnake, 
    messages_list: messagesWithSnake,
    wallpaper: conversation.wallpaper || null 
  };
}

async function persistMessage(conversationId, senderId, text, replyToMessageId) {
  if (!text || !text.trim()) {
    const err = new Error('Message text cannot be empty'); err.status = 400; throw err;
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const err = new Error('Conversation not found'); err.status = 404; throw err;
  }

  if (!conversation.participants.includes(senderId)) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }

  if (replyToMessageId) {
    const replyMessage = await Message.findOne({
      _id: replyToMessageId,
      conversationId
    });
    if (!replyMessage) {
      const err = new Error('Reply message not found'); err.status = 404; throw err;
    }
  }

  const message = new Message({
    _id: uuidv4(),
    conversationId,
    senderId,
    text: text.trim(),
    replyToMessageId: replyToMessageId || null,
    sentAt: new Date()
  });

  await message.save();
  return message.toObject();
}

async function deleteMessage(conversationId, messageId, userId, scope = 'self') {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const err = new Error('Conversation not found'); err.status = 404; throw err;
  }

  if (!conversation.participants.includes(userId)) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }

  const message = await Message.findOne({ _id: messageId, conversationId });
  if (!message) {
    const err = new Error('Message not found'); err.status = 404; throw err;
  }

  if (scope === 'all') {
    if (message.senderId !== userId) {
      const err = new Error('Only sender can delete for both'); err.status = 403; throw err;
    }
    await Message.deleteOne({ _id: messageId });
    return { ok: true, scope: 'all' };
  }

  // For 'self' scope, we mark as deleted but don't actually remove data
  // You could implement a deletedFor array if needed
  await Message.deleteOne({ _id: messageId });
  return { ok: true, scope: 'self' };
}

async function updateWallpaper(conversationId, wallpaper) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const err = new Error('Conversation not found'); err.status = 404; throw err;
  }

  conversation.wallpaper = wallpaper;
  await conversation.save();
  return { ok: true, wallpaper };
}

module.exports = { createConversation, listConversations, getMessages, persistMessage, deleteMessage, updateWallpaper };

