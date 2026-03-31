const mongoose = require('mongoose');

// Connect to MongoDB Atlas
async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not set. Please configure it before starting the server.');
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB Atlas');

    // Seed initial data if needed
    await seedInitialData();

  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    // Exit gracefully - Render will restart the service
    process.exit(1);
  }
}

// Seed initial data (skills and proficiency levels)
async function seedInitialData() {
  const Skill = require('../models/Skill');
  const ProficiencyLevel = require('../models/ProficiencyLevel');

  try {
    // Seed skills if empty
    const skillCount = await Skill.countDocuments();
    if (skillCount === 0) {
      const skills = ['running', 'cycling', 'swimming', 'gym', 'yoga', 'hiking'];
      await Skill.insertMany(skills.map(name => ({ name })));
      console.log('✅ Skills seeded');
    }

    // Seed proficiency levels if empty
    const profCount = await ProficiencyLevel.countDocuments();
    if (profCount === 0) {
      const levels = ['Beginner', 'Intermediate', 'Expert'];
      await ProficiencyLevel.insertMany(levels.map(name => ({ name })));
      console.log('✅ Proficiency levels seeded');
    }
  } catch (err) {
    console.error('⚠ Error seeding data:', err.message);
  }
}

// Initialize DB connection on app start
console.log('📡 Attempting to connect to MongoDB...');
connectDB().catch(err => {
  console.error('❌ Failed to initialize database:', err.message);
  process.exit(1);
});

// Export models and database utilities
module.exports = {
  User: require('../models/User'),
  Post: require('../models/Post'),
  Skill: require('../models/Skill'),
  UserSkill: require('../models/UserSkill'),
  Connection: require('../models/Connection'),
  Conversation: require('../models/Conversation'),
  ConversationParticipant: require('../models/ConversationParticipant'),
  Message: require('../models/Message'),
  OTP: require('../models/OTP'),
  ProficiencyLevel: require('../models/ProficiencyLevel'),
  SkillVerification: require('../models/SkillVerification'),
  SkillEndorsement: require('../models/SkillEndorsement'),
  Resource: require('../models/Resource'),
  ResourceFavorite: require('../models/ResourceFavorite'),
  Document: require('../models/Document'),
  Challenge: require('../models/Challenge'),
  ChallengeSubmission: require('../models/ChallengeSubmission'),
  QARoom: require('../models/QARoom'),
  QAQuestion: require('../models/QAQuestion'),
  Feedback: require('../models/Feedback'),
  PostLike: require('../models/PostLike'),
  PostComment: require('../models/PostComment'),
  PostInteraction: require('../models/PostInteraction'),
  Community: require('../models/Community'),
  CommunityMember: require('../models/CommunityMember'),
  Event: require('../models/Event'),
  EventRsvp: require('../models/EventRsvp'),
  mongoose,
  connectDB
};
