const { DailyChallenge, ChallengeVideo, VideoFeedback, User, Notification } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { uploadToCloudinary } = require('../config/cloudinary');
const { analyzeVideo } = require('../services/aiAnalysis');

const todayStr = () => new Date().toISOString().slice(0, 10);

// GET /api/daily-challenge/today
const getTodayChallenge = async (req, res) => {
  try {
    const today = todayStr();
    let challenge = await DailyChallenge.findOne({ date: today }).lean();

    // If no challenge today, return the most recent one
    if (!challenge) {
      challenge = await DailyChallenge.findOne().sort({ date: -1 }).lean();
    }

    if (!challenge) return res.status(404).json({ error: 'No challenge available yet' });

    // Check if current user already submitted
    const mySubmission = await ChallengeVideo.findOne({
      challengeId: challenge._id,
      userId: req.user.userId,
    }).lean();

    res.json({ ...challenge, hasSubmitted: !!mySubmission, mySubmission: mySubmission || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/daily-challenge (admin only — create challenge for a date)
const createChallenge = async (req, res) => {
  try {
    const { date, topic, description, tips, dueTime } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    const challengeDate = date || todayStr();
    const existing = await DailyChallenge.findOne({ date: challengeDate });
    if (existing) return res.status(409).json({ error: `Challenge for ${challengeDate} already exists` });

    const challenge = new DailyChallenge({
      _id: uuidv4(),
      date: challengeDate,
      topic,
      description: description || '',
      tips: tips || [],
      dueTime: dueTime || '23:59',
      createdBy: req.user.userId,
    });
    await challenge.save();
    res.status(201).json(challenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/daily-challenge/:id/submit — upload video
const submitVideo = async (req, res) => {
  try {
    const { id: challengeId } = req.params;
    const { caption } = req.body;

    const challenge = await DailyChallenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    // Check duplicate
    const existing = await ChallengeVideo.findOne({ challengeId, userId: req.user.userId });
    if (existing) return res.status(409).json({ error: 'You already submitted for this challenge' });

    if (!req.file) return res.status(400).json({ error: 'Video file is required' });

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'challenge-videos',
      resource_type: 'video',
    });

    const video = new ChallengeVideo({
      _id: uuidv4(),
      challengeId,
      userId: req.user.userId,
      videoUrl: result.secure_url,
      caption: caption || '',
      duration: result.duration || null,
      bytes: result.bytes || null,
    });
    await video.save();

    // Update user streak
    await updateStreak(req.user.userId);

    // Trigger AI analysis asynchronously (non-blocking)
    analyzeVideo(video._id, result.secure_url, challenge.topic).catch(err =>
      console.error('[AI] Background analysis error:', err.message)
    );

    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/daily-challenge/:id/feed — get all submissions for a challenge
const getChallengeFeed = async (req, res) => {
  try {
    const { id: challengeId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const sort = req.query.sort || 'recent'; // recent | top_feedback | top_ai

    let sortQuery = { createdAt: -1 };
    if (sort === 'top_feedback') sortQuery = { feedbackCount: -1, createdAt: -1 };
    if (sort === 'top_ai') sortQuery = { 'aiAnalysis.scores.overall': -1, createdAt: -1 };

    const videos = await ChallengeVideo.find({ challengeId })
      .sort(sortQuery)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const userIds = [...new Set(videos.map(v => v.userId))];
    const users = await User.find({ _id: { $in: userIds } }).select('name avatarUrl shortId').lean();
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const enriched = videos.map(v => ({
      ...v,
      user: userMap[v.userId] || null,
      isOwn: v.userId === req.user.userId,
    }));

    const total = await ChallengeVideo.countDocuments({ challengeId });

    res.json({ videos: enriched, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/daily-challenge/feedback/:videoId — give feedback
const giveFeedback = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { positive, improvement, ratings } = req.body;

    if (!positive?.trim() || !improvement?.trim()) {
      return res.status(400).json({ error: 'Both positive point and improvement suggestion are required' });
    }

    const video = await ChallengeVideo.findById(videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.userId === req.user.userId) return res.status(403).json({ error: 'Cannot give feedback on your own video' });

    const existing = await VideoFeedback.findOne({ videoId, reviewerId: req.user.userId });
    if (existing) return res.status(409).json({ error: 'You already gave feedback on this video' });

    const feedback = new VideoFeedback({
      _id: uuidv4(),
      videoId,
      reviewerId: req.user.userId,
      positive: positive.trim(),
      improvement: improvement.trim(),
      ratings: ratings || {},
    });
    await feedback.save();

    // Increment feedback count on video
    await ChallengeVideo.findByIdAndUpdate(videoId, { $inc: { feedbackCount: 1 } });

    // Notify video owner
    try {
      const reviewer = await User.findById(req.user.userId).select('name').lean();
      const notif = new Notification({
        _id: uuidv4(),
        recipientId: video.userId,
        senderId: req.user.userId,
        type: 'video_feedback',
        message: `${reviewer?.name} gave feedback on your video`,
        relatedId: videoId,
        isRead: false,
      });
      await notif.save();

      const { emitToUser } = require('../socket/index');
      emitToUser(video.userId, 'notification', {
        type: 'video_feedback',
        message: notif.message,
        senderId: { _id: req.user.userId, name: reviewer?.name },
        createdAt: new Date(),
      });
    } catch (emitErr) {
      console.error('Failed to emit feedback notification:', emitErr.message);
    }

    res.status(201).json(feedback);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already gave feedback' });
    res.status(500).json({ error: err.message });
  }
};

// GET /api/daily-challenge/feedback/:videoId — get feedback for a video
const getVideoFeedback = async (req, res) => {
  try {
    const { videoId } = req.params;
    const feedbacks = await VideoFeedback.find({ videoId }).sort({ createdAt: -1 }).lean();

    const reviewerIds = feedbacks.map(f => f.reviewerId);
    const reviewers = await User.find({ _id: { $in: reviewerIds } }).select('name avatarUrl').lean();
    const reviewerMap = Object.fromEntries(reviewers.map(u => [u._id.toString(), u]));

    const enriched = feedbacks.map(f => ({
      ...f,
      reviewer: reviewerMap[f.reviewerId] || null,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/daily-challenge/:id/submit — delete own submission (within 2 hours)
const deleteSubmission = async (req, res) => {
  try {
    const { id: challengeId } = req.params;
    const video = await ChallengeVideo.findOne({ challengeId, userId: req.user.userId });
    if (!video) return res.status(404).json({ error: 'No submission found' });

    // 2-hour window check
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    if (video.createdAt < twoHoursAgo) {
      return res.status(403).json({ error: 'Deletion window has passed (2 hours after submission)' });
    }

    // Delete all feedback on this video too
    await VideoFeedback.deleteMany({ videoId: video._id });
    await ChallengeVideo.deleteOne({ _id: video._id });

    // Decrement user stats
    await User.findByIdAndUpdate(req.user.userId, { $inc: { totalVideos: -1 } });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getMySubmissions = async (req, res) => {
  try {
    const videos = await ChallengeVideo.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const challengeIds = videos.map(v => v.challengeId);
    const challenges = await DailyChallenge.find({ _id: { $in: challengeIds } }).lean();
    const challengeMap = Object.fromEntries(challenges.map(c => [c._id, c]));

    const enriched = videos.map(v => ({
      ...v,
      challenge: challengeMap[v.challengeId] || null,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper: update streak and progress
async function updateStreak(userId) {
  try {
    const user = await User.findById(userId).select('lastActiveDate streakCount activeDays totalVideos').lean();
    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    let newStreak = 1;
    if (user.lastActiveDate === yesterday) {
      newStreak = (user.streakCount || 0) + 1;
    } else if (user.lastActiveDate === today) {
      // Already counted today — just increment totalVideos
      await User.findByIdAndUpdate(userId, { $inc: { totalVideos: 1 } });
      return;
    }

    const isNewDay = user.lastActiveDate !== today;

    await User.findByIdAndUpdate(userId, {
      streakCount: newStreak,
      lastActiveDate: today,
      $inc: {
        totalVideos: 1,
        activeDays: isNewDay ? 1 : 0,
      },
    });

    // Update active challenge progress
    const { UserChallenge } = require('../config/db');
    const activeChallenge = await UserChallenge.findOne({ userId, status: 'active' });
    if (activeChallenge) {
      activeChallenge.videosCompleted += 1;
      if (activeChallenge.videosCompleted >= activeChallenge.targetVideos) {
        activeChallenge.status = 'completed';
        activeChallenge.completedAt = new Date();
      }
      await activeChallenge.save();
    }
  } catch (err) {
    console.error('Streak update failed:', err.message);
  }
}

// POST /api/daily-challenge/ai/:videoId/retry — re-trigger AI analysis
const retryAIAnalysis = async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await ChallengeVideo.findById(videoId).lean();
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.userId !== req.user.userId) return res.status(403).json({ error: 'Only the video owner can retry' });

    const challenge = await DailyChallenge.findById(video.challengeId).lean();
    analyzeVideo(video._id, video.videoUrl, challenge?.topic || 'Communication challenge').catch(() => {});
    res.json({ ok: true, status: 'processing' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getAIAnalysis = async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await ChallengeVideo.findById(videoId).lean();
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.userId !== req.user.userId) return res.status(403).json({ error: 'Only the video owner can view AI analysis' });
    res.json(video.aiAnalysis || { status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const replyToFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { reply } = req.body;
    if (!reply?.trim()) return res.status(400).json({ error: 'Reply text is required' });

    const feedback = await VideoFeedback.findById(feedbackId);
    if (!feedback) return res.status(404).json({ error: 'Feedback not found' });

    // Only the video owner can reply
    const video = await ChallengeVideo.findById(feedback.videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.userId !== req.user.userId) return res.status(403).json({ error: 'Only the video owner can reply' });

    feedback.ownerReply = reply.trim();
    feedback.ownerRepliedAt = new Date();
    await feedback.save();

    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/daily-challenge/feedback/:feedbackId — reviewer or video owner can delete
const deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const feedback = await VideoFeedback.findById(feedbackId);
    if (!feedback) return res.status(404).json({ error: 'Feedback not found' });

    const video = await ChallengeVideo.findById(feedback.videoId);
    const isReviewer = feedback.reviewerId === req.user.userId;
    const isOwner = video?.userId === req.user.userId;

    if (!isReviewer && !isOwner) return res.status(403).json({ error: 'Not allowed' });

    await VideoFeedback.deleteOne({ _id: feedbackId });
    await ChallengeVideo.findByIdAndUpdate(feedback.videoId, { $inc: { feedbackCount: -1 } });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getTodayChallenge, createChallenge, submitVideo, getChallengeFeed,
  giveFeedback, getVideoFeedback, getMySubmissions,
  replyToFeedback, deleteFeedback, getAIAnalysis, retryAIAnalysis, deleteSubmission,
};
