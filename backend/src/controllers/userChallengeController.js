const { UserChallenge, User, ChallengeVideo } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const CHALLENGE_CONFIG = {
  starter: { targetVideos: 3, windowDays: 7 },
  builder: { targetVideos: 5, windowDays: 10 },
  pro:     { targetVideos: 7, windowDays: 14 },
};

// POST /api/user-challenges/start
const startChallenge = async (req, res) => {
  try {
    const { type } = req.body;
    if (!CHALLENGE_CONFIG[type]) return res.status(400).json({ error: 'Invalid challenge type' });

    // Expire any existing active challenge
    await UserChallenge.updateMany(
      { userId: req.user.userId, status: 'active' },
      { status: 'expired' }
    );

    const config = CHALLENGE_CONFIG[type];
    const expiresAt = new Date(Date.now() + config.windowDays * 86400000);

    const challenge = new UserChallenge({
      _id: uuidv4(),
      userId: req.user.userId,
      type,
      targetVideos: config.targetVideos,
      windowDays: config.windowDays,
      expiresAt,
    });
    await challenge.save();
    res.status(201).json(challenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/user-challenges/active
const getActiveChallenge = async (req, res) => {
  try {
    // Auto-expire overdue challenges
    await UserChallenge.updateMany(
      { userId: req.user.userId, status: 'active', expiresAt: { $lt: new Date() } },
      { status: 'expired' }
    );

    const challenge = await UserChallenge.findOne({
      userId: req.user.userId,
      status: 'active',
    }).lean();

    res.json(challenge || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/user-challenges/history
const getChallengeHistory = async (req, res) => {
  try {
    const history = await UserChallenge.find({ userId: req.user.userId })
      .sort({ startedAt: -1 })
      .limit(10)
      .lean();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/user-challenges/onboarding
const completeOnboardingChallenge = async (req, res) => {
  try {
    const { intent, comfortLevel, challengeType, notificationTime } = req.body;

    // Save onboarding data to user
    await User.findByIdAndUpdate(req.user.userId, {
      userIntent: intent,
      comfortLevel,
      onboardingDone: true,
    });

    // Start the selected challenge
    const type = challengeType || (comfortLevel === 'beginner' ? 'starter' : comfortLevel === 'intermediate' ? 'builder' : 'pro');
    const config = CHALLENGE_CONFIG[type] || CHALLENGE_CONFIG.starter;
    const expiresAt = new Date(Date.now() + config.windowDays * 86400000);

    await UserChallenge.updateMany({ userId: req.user.userId, status: 'active' }, { status: 'expired' });

    const challenge = new UserChallenge({
      _id: uuidv4(),
      userId: req.user.userId,
      type,
      targetVideos: config.targetVideos,
      windowDays: config.windowDays,
      expiresAt,
    });
    await challenge.save();

    res.json({ challenge, message: 'Onboarding complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/user-challenges/progress
const getUserProgress = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    const user = await User.findById(userId).select('name activeDays totalVideos userIntent comfortLevel streakCount').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const activeChallenge = await UserChallenge.findOne({ userId, status: 'active' }).lean();
    const completedChallenges = await UserChallenge.countDocuments({ userId, status: 'completed' });

    // Badge logic
    const badges = [];
    if (user.totalVideos >= 1) badges.push({ id: 'first_step', label: 'First Step', emoji: '🌱' });
    if (user.totalVideos >= 3) badges.push({ id: 'getting_warm', label: 'Getting Warm', emoji: '🔥' });
    if (user.totalVideos >= 5) badges.push({ id: 'momentum', label: 'Building Momentum', emoji: '⚡' });
    if (user.totalVideos >= 10) badges.push({ id: 'consistent', label: 'Consistent Speaker', emoji: '🏆' });
    if (user.totalVideos >= 20) badges.push({ id: 'pro', label: 'Communication Pro', emoji: '🎯' });
    if (user.totalVideos >= 30) badges.push({ id: 'champion', label: 'Collabro Champion', emoji: '🌟' });

    res.json({
      activeDays: user.activeDays || 0,
      totalVideos: user.totalVideos || 0,
      streakCount: user.streakCount || 0,
      completedChallenges,
      activeChallenge,
      badges,
      level: Math.floor((user.totalVideos || 0) / 5) + 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { startChallenge, getActiveChallenge, getChallengeHistory, completeOnboardingChallenge, getUserProgress };
