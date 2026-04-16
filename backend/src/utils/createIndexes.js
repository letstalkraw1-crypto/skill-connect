const mongoose = require('mongoose');

/**
 * Create database indexes for performance optimization
 * Run this script after database setup to ensure optimal query performance
 */
async function createIndexes() {
  try {
    const db = mongoose.connection.db;
    
    console.log('🔍 Creating database indexes for performance optimization...');

    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ phone: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ shortId: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ "location_geo": "2dsphere" }); // Geo search
    await db.collection('users').createIndex({ name: "text", bio: "text" }); // Text search
    await db.collection('users').createIndex({ lastActiveDate: -1 }); // Streak queries
    await db.collection('users').createIndex({ createdAt: -1 }); // Recent users
    
    // OAuth provider indexes
    await db.collection('users').createIndex({ googleId: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ microsoftId: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ facebookId: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ appleId: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ githubId: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ stravaId: 1 }, { unique: true, sparse: true });

    // Challenge video indexes
    await db.collection('challengevideos').createIndex({ challengeId: 1, createdAt: -1 }); // Feed sorting
    await db.collection('challengevideos').createIndex({ userId: 1, createdAt: -1 }); // User videos
    await db.collection('challengevideos').createIndex({ challengeId: 1, userId: 1 }, { unique: true }); // One submission per challenge

    // Daily challenge indexes
    await db.collection('dailychallenges').createIndex({ date: 1 }, { unique: true }); // Unique per date
    await db.collection('dailychallenges').createIndex({ createdAt: -1 }); // Recent challenges

    // Video feedback indexes
    await db.collection('videofeedbacks').createIndex({ videoId: 1, reviewerId: 1 }, { unique: true }); // One feedback per reviewer per video
    await db.collection('videofeedbacks').createIndex({ videoId: 1, createdAt: -1 }); // Video feedback list
    await db.collection('videofeedbacks').createIndex({ reviewerId: 1, createdAt: -1 }); // User's feedback history

    // Connection indexes
    await db.collection('connections').createIndex({ requesterId: 1, addresseeId: 1 }, { unique: true });
    await db.collection('connections').createIndex({ addresseeId: 1, status: 1 }); // Pending requests
    await db.collection('connections').createIndex({ requesterId: 1, status: 1 }); // Sent requests

    // Message indexes
    await db.collection('messages').createIndex({ conversationId: 1, sentAt: -1 }); // Chat history
    await db.collection('messages').createIndex({ senderId: 1, sentAt: -1 }); // User's messages
    await db.collection('messages').createIndex({ conversationId: 1, sentAt: 1 }); // Ascending for pagination

    // Conversation indexes
    await db.collection('conversations').createIndex({ participants: 1 }); // Find conversations by participant
    await db.collection('conversations').createIndex({ lastAt: -1 }); // Recent conversations
    await db.collection('conversations').createIndex({ isGroup: 1, lastAt: -1 }); // Group conversations

    // Notification indexes
    await db.collection('notifications').createIndex({ recipientId: 1, createdAt: -1 }); // User notifications
    await db.collection('notifications').createIndex({ recipientId: 1, isRead: 1 }); // Unread notifications
    await db.collection('notifications').createIndex({ createdAt: -1 }); // Cleanup old notifications

    // Skill verification indexes
    await db.collection('skillverifications').createIndex({ userId: 1, skillId: 1 }); // User skill verifications
    await db.collection('skillverifications').createIndex({ status: 1, createdAt: -1 }); // Admin review queue

    // User skill indexes
    await db.collection('userskills').createIndex({ userId: 1 }); // User's skills
    await db.collection('userskills').createIndex({ skillId: 1 }); // Users with specific skill
    await db.collection('userskills').createIndex({ userId: 1, skillId: 1 }, { unique: true }); // One skill per user

    // Community indexes
    await db.collection('communities').createIndex({ shortCode: 1 }, { unique: true });
    await db.collection('communities').createIndex({ creatorId: 1 });
    await db.collection('communities').createIndex({ type: 1, createdAt: -1 });

    // Community member indexes
    await db.collection('communitymembers').createIndex({ communityId: 1, userId: 1 }, { unique: true });
    await db.collection('communitymembers').createIndex({ userId: 1 }); // User's communities

    // Event indexes
    await db.collection('events').createIndex({ creatorId: 1, startTime: -1 });
    await db.collection('events').createIndex({ startTime: 1 }); // Upcoming events
    await db.collection('events').createIndex({ location: 1, startTime: 1 }); // Location-based events

    // Post indexes
    await db.collection('posts').createIndex({ authorId: 1, createdAt: -1 }); // User posts
    await db.collection('posts').createIndex({ createdAt: -1 }); // Feed posts
    await db.collection('posts').createIndex({ content: "text" }); // Text search in posts

    // OTP indexes
    await db.collection('otps').createIndex({ email: 1 });
    await db.collection('otps').createIndex({ phone: 1 });
    await db.collection('otps').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

    console.log('✅ Database indexes created successfully!');
    console.log('📊 Performance optimization complete.');
    
    // Show index statistics
    const collections = ['users', 'challengevideos', 'videofeedbacks', 'connections', 'messages'];
    for (const collectionName of collections) {
      const indexes = await db.collection(collectionName).indexes();
      console.log(`📋 ${collectionName}: ${indexes.length} indexes`);
    }

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

module.exports = { createIndexes };

// Run directly if called from command line
if (require.main === module) {
  require('dotenv').config();
  const { connectDB } = require('../config/db');
  
  connectDB().then(async () => {
    await createIndexes();
    process.exit(0);
  }).catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });
}