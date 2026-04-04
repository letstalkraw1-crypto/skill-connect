const { Notification } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Safely creates a notification without throwing errors to the main process.
 * @param {Object} data - Notification data
 * @param {string} data.recipientId - ID of the user receiving the notification
 * @param {string} data.senderId - ID of the user sending the notification
 * @param {string} data.type - Type of notification ('like', 'comment', 'connection_request', etc.)
 * @param {string} data.message - Notification message
 * @param {string} [data.relatedId] - Optional related ID (Post, Connection, etc.)
 */
const createNotification = async ({ recipientId, senderId, type, message, relatedId }) => {
  try {
    // Prevent self-notifications
    if (recipientId === senderId) return null;

    const notification = new Notification({
      _id: uuidv4(),
      recipientId,
      senderId,
      type,
      message,
      relatedId
    });

    await notification.save();
    return notification;
  } catch (err) {
    // We log the error but do not throw it to avoid 500 errors in the main flow
    console.error(`[Notification Error] Failed to create ${type} notification:`, err.message);
    return null;
  }
};

module.exports = { createNotification };
