const { Achievement, UserAchievement } = require('../models/Achievement');
const { User } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Default achievements
const DEFAULT_ACHIEVEMENTS = [
  {
    key: 'first_video',
    name: 'First Steps',
    description: 'Submit your first video challenge',
    badge: '🎬',
    points: 10,
    category: 'milestone',
    requirements: { type: 'count', target: 1, field: 'totalVideos' }
  },
  {
    key: 'week_streak',
    name: 'Consistent Creator',
    description: 'Maintain a 7-day streak',
    badge: '🔥',
    points: 50,
    category: 'streak',
    requirements: { type: 'streak', target: 7, field: 'streakCount' }
  },
  {
    key: 'month_streak',
    name: 'Dedication Master',
    description: 'Maintain a 30-day streak',
    badge: '💎',
    points: 200,
    category: 'streak',
    requirements: { type: 'streak', target: 30, field: 'streakCount' }
  },
  {
    key: 'peer_helper',
    name: 'Helpful Peer',
    description: 'Give feedback on 10 videos',
    badge: '🤝',
    points: 25,
    category: 'social',
    requirements: { type: 'custom', customCheck: 'feedback_count' }
  },
  {
    key: 'ai_perfectionist',
    name: 'AI Perfectionist',
    description: 'Get a perfect 10/10 AI score',
    badge: '🤖',
    points: 100,
    category: 'quality',
    requirements: { type: 'custom', customCheck: 'perfect_ai_score' }
  },
  {
    key: 'video_veteran',
    name: 'Video Veteran',
    description: 'Submit 50 video challenges',
    badge: '🎯',
    points: 150,
    category: 'milestone',
    requirements: { type: 'count', target: 50, field: 'totalVideos' }
  },
  {
    key: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Connect with 25 people',
    badge: '🦋',
    points: 75,
    category: 'social',
    requirements: { type: 'custom', customCheck: 'connection_count' }
  },
  {
    key: 'early_bird',
    name: 'Early Bird',
    description: 'Submit a video within 1 hour of challenge posting',
    badge: '🌅',
    points: 30,
    category: 'milestone',
    requirements: { type: 'custom', customCheck: 'early_submission' }
  }
];

/**
 * Initialize default achievements in the database
 */
async function initializeAchievements() {
  try {
    for (const achievementData of DEFAULT_ACHIEVEMENTS) {
      await Achievement.findOneAndUpdate(
        { key: achievementData.key },
        { ...achievementData, _id: uuidv4() },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Achievements initialized');
  } catch (error) {
    console.error('❌ Error initializing achievements:', error);
  }
}

/**
 * Check and unlock achievements for a user
 */
async function checkAchievements(userId, context = {}) {
  try {
    const user = await User.findById(userId).select('totalVideos streakCount activeDays').lean();
    if (!user) return [];

    const achievements = await Achievement.find({ isActive: true }).lean();
    const userAchievements = await UserAchievement.find({ userId }).lean();
    const completedKeys = new Set(userAchievements.filter(ua => ua.isCompleted).map(ua => ua.achievementKey));
    
    const newlyUnlocked = [];

    for (const achievement of achievements) {
      if (completedKeys.has(achievement.key)) continue;

      let isUnlocked = false;
      let progress = 0;

      // Check achievement requirements
      switch (achievement.requirements.type) {
        case 'count':
        case 'streak':
          const currentValue = user[achievement.requirements.field] || 0;
          progress = Math.min(currentValue, achievement.requirements.target);
          isUnlocked = currentValue >= achievement.requirements.target;
          break;

        case 'custom':
          const customResult = await checkCustomRequirement(userId, achievement.requirements.customCheck, context);
          isUnlocked = customResult.unlocked;
          progress = customResult.progress;
          break;
      }

      // Update or create user achievement
      const existingUA = userAchievements.find(ua => ua.achievementKey === achievement.key);
      
      if (isUnlocked && !existingUA?.isCompleted) {
        // Unlock achievement
        await UserAchievement.findOneAndUpdate(
          { userId, achievementKey: achievement.key },
          {
            userId,
            achievementKey: achievement.key,
            progress: achievement.requirements.target || progress,
            isCompleted: true,
            unlockedAt: new Date()
          },
          { upsert: true, new: true }
        );

        // Award points to user
        await User.findByIdAndUpdate(userId, { $inc: { points: achievement.points || 0 } });

        newlyUnlocked.push({
          ...achievement,
          pointsAwarded: achievement.points || 0
        });
      } else if (!isUnlocked && progress > (existingUA?.progress || 0)) {
        // Update progress
        await UserAchievement.findOneAndUpdate(
          { userId, achievementKey: achievement.key },
          {
            userId,
            achievementKey: achievement.key,
            progress,
            isCompleted: false
          },
          { upsert: true, new: true }
        );
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}

/**
 * Check custom achievement requirements
 */
async function checkCustomRequirement(userId, checkType, context) {
  try {
    switch (checkType) {
      case 'feedback_count':
        const { VideoFeedback } = require('../config/db');
        const feedbackCount = await VideoFeedback.countDocuments({ reviewerId: userId });
        return { unlocked: feedbackCount >= 10, progress: Math.min(feedbackCount, 10) };

      case 'perfect_ai_score':
        const { ChallengeVideo } = require('../config/db');
        const perfectScore = await ChallengeVideo.findOne({ 
          userId, 
          'aiAnalysis.scores.overall': 10 
        }).lean();
        return { unlocked: !!perfectScore, progress: perfectScore ? 10 : 0 };

      case 'connection_count':
        const { Connection } = require('../config/db');
        const connectionCount = await Connection.countDocuments({
          $or: [{ requesterId: userId }, { addresseeId: userId }],
          status: 'accepted'
        });
        return { unlocked: connectionCount >= 25, progress: Math.min(connectionCount, 25) };

      case 'early_submission':
        // Check if current submission (from context) was within 1 hour of challenge creation
        if (context.challengeCreatedAt && context.submissionTime) {
          const timeDiff = new Date(context.submissionTime) - new Date(context.challengeCreatedAt);
          const oneHour = 60 * 60 * 1000;
          return { unlocked: timeDiff <= oneHour, progress: timeDiff <= oneHour ? 1 : 0 };
        }
        return { unlocked: false, progress: 0 };

      default:
        return { unlocked: false, progress: 0 };
    }
  } catch (error) {
    console.error(`Error checking custom requirement ${checkType}:`, error);
    return { unlocked: false, progress: 0 };
  }
}

/**
 * Get user's achievements with progress
 */
async function getUserAchievements(userId) {
  try {
    const achievements = await Achievement.find({ isActive: true }).lean();
    const userAchievements = await UserAchievement.find({ userId }).lean();
    const userAchievementMap = Object.fromEntries(
      userAchievements.map(ua => [ua.achievementKey, ua])
    );

    const user = await User.findById(userId).select('totalVideos streakCount activeDays points').lean();

    const result = await Promise.all(achievements.map(async (achievement) => {
      const userAchievement = userAchievementMap[achievement.key];
      let progress = userAchievement?.progress || 0;
      let maxProgress = achievement.requirements.target || 1;

      // Calculate current progress for incomplete achievements
      if (!userAchievement?.isCompleted) {
        switch (achievement.requirements.type) {
          case 'count':
          case 'streak':
            progress = user[achievement.requirements.field] || 0;
            break;
          case 'custom':
            const customResult = await checkCustomRequirement(userId, achievement.requirements.customCheck);
            progress = customResult.progress;
            break;
        }
      }

      return {
        ...achievement,
        progress: Math.min(progress, maxProgress),
        maxProgress,
        isCompleted: userAchievement?.isCompleted || false,
        unlockedAt: userAchievement?.unlockedAt || null,
        progressPercentage: Math.round((progress / maxProgress) * 100)
      };
    }));

    return {
      achievements: result,
      totalPoints: user?.points || 0,
      completedCount: result.filter(a => a.isCompleted).length,
      totalCount: result.length
    };
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return { achievements: [], totalPoints: 0, completedCount: 0, totalCount: 0 };
  }
}

/**
 * Get leaderboard based on points
 */
async function getLeaderboard(limit = 10) {
  try {
    const topUsers = await User.find({ points: { $gt: 0 } })
      .select('name avatarUrl shortId points streakCount totalVideos')
      .sort({ points: -1, streakCount: -1 })
      .limit(limit)
      .lean();

    return topUsers.map((user, index) => ({
      ...user,
      rank: index + 1
    }));
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

module.exports = {
  initializeAchievements,
  checkAchievements,
  getUserAchievements,
  getLeaderboard,
  checkCustomRequirement
};