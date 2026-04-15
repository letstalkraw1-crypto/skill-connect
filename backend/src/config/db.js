const mongoose = require('mongoose');

// Connect to MongoDB Atlas
async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.warn('⚠ MONGO_URI missing, running in degraded mode');
      return;
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4
    });

    console.log('✅ Connected to MongoDB Atlas');

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠ MongoDB disconnected. Attempting to reconnect...');
      setTimeout(() => connectDB(), 5000);
    });

    await seedInitialData();

  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.warn('⚠ App will continue running without Database');
  }
}

async function seedInitialData() {
  const Skill = require('../models/Skill');
  try {
    const skillCount = await Skill.countDocuments();
    if (skillCount === 0) {
      const skills = [
        'Professional Communication', 'Public Speaking', 'Presentation Skills',
        'Interview Preparation', 'Storytelling', 'Debate', 'Leadership Communication'
      ];
      await Skill.insertMany(skills.map(name => ({ name })));
      console.log('✅ Skills seeded');
    }
  } catch (err) {
    console.error('⚠ Error seeding data:', err.message);
  }
}

console.log('📡 Attempting to connect to MongoDB...');
connectDB().catch(err => {
  console.error('❌ Failed to initialize database:', err.message);
});

module.exports = {
  User: require('../models/User'),
  Post: require('../models/Post'),
  Skill: require('../models/Skill'),
  UserSkill: require('../models/UserSkill'),
  Connection: require('../models/Connection'),
  Conversation: require('../models/Conversation'),
  Message: require('../models/Message'),
  OTP: require('../models/OTP'),
  SkillVerification: require('../models/SkillVerification'),
  Community: require('../models/Community'),
  CommunityMember: require('../models/CommunityMember'),
  Event: require('../models/Event'),
  Notification: require('../models/Notification'),
  DailyChallenge: require('../models/DailyChallenge'),
  ChallengeVideo: require('../models/ChallengeVideo'),
  VideoFeedback: require('../models/VideoFeedback'),
  Follow: require('../models/Follow'),
  mongoose,
  connectDB
};
