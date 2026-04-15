const { User, UserSkill, Connection, Message, Conversation, Skill, Event, SkillVerification, ChallengeVideo, DailyChallenge } = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ADMIN_JWT_SECRET = process.env.JWT_SECRET + '_admin';

const login = (req, res) => {
  const { password } = req.body;
  if (!password || !process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid admin password' });

  // Timing-safe comparison to prevent timing attacks
  const provided = Buffer.from(password);
  const expected = Buffer.from(process.env.ADMIN_PASSWORD);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }

  // Return a short-lived JWT instead of the password itself
  const token = jwt.sign({ role: 'admin' }, ADMIN_JWT_SECRET, { expiresIn: '8h' });
  return res.json({ token });
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('_id shortId name email phone location bio avatarUrl stravaId garminId instagramId createdAt').lean();
    const enriched = await Promise.all(users.map(async (u) => {
      const skillCount = await UserSkill.countDocuments({ userId: u._id });
      const connectionCount = await Connection.countDocuments({ $or: [{ requesterId: u._id }, { addresseeId: u._id }], status: 'accepted' });
      return { ...u, skillCount, connectionCount };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const skills = await UserSkill.find({ userId: req.params.id }).populate('skillId', 'name').lean();
    const connections = await Connection.find({ $or: [{ requesterId: req.params.id }, { addresseeId: req.params.id }] }).populate('requesterId addresseeId', 'name').lean();

    // Challenge videos with challenge info
    const videos = await ChallengeVideo.find({ userId: req.params.id }).sort({ createdAt: -1 }).lean();
    const challengeIds = [...new Set(videos.map(v => v.challengeId))];
    const challenges = await DailyChallenge.find({ _id: { $in: challengeIds } }).lean();
    const challengeMap = Object.fromEntries(challenges.map(c => [c._id, c]));
    const enrichedVideos = videos.map(v => ({
      ...v,
      challenge: challengeMap[v.challengeId] || null,
      // Estimate storage: Cloudinary bytes field or estimate from duration
      storageMB: v.bytes ? (v.bytes / 1024 / 1024).toFixed(2) : null,
    }));

    res.json({ ...user, skills, connections, challengeVideos: enrichedVideos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, phone, location, bio, password, stravaId, garminId, instagramId } = req.body;
    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (location !== undefined) update.location = location;
    if (bio !== undefined) update.bio = bio;
    if (stravaId !== undefined) update.stravaId = stravaId;
    if (garminId !== undefined) update.garminId = garminId;
    if (instagramId !== undefined) update.instagramId = instagramId;
    if (password) update.password = await bcrypt.hash(password, 10);

    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const updated = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('id name email phone location bio stravaId garminId instagramId').lean();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalConnections = await Connection.countDocuments({ status: 'accepted' });
    const totalMessages = await Message.countDocuments();
    const totalConversations = await Conversation.countDocuments();
    
    const skillBreakdownRaw = await UserSkill.aggregate([{ $group: { _id: '$skillId', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const skillBreakdown = await Promise.all(skillBreakdownRaw.map(async (item) => {
      const skill = await Skill.findById(item._id).select('name').lean();
      return { id: item._id, name: skill?.name || 'Unknown', count: item.count };
    }));
    const recentUsers = await User.find().select('id name email avatarUrl createdAt').sort({ createdAt: -1 }).limit(5).lean();

    res.json({ totalUsers, totalConnections, totalMessages, totalConversations, skillBreakdown, recentUsers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getSkillUsers = async (req, res) => {
  try {
    const users = await UserSkill.find({ skillId: req.params.skillId }).populate('userId', 'id name email avatarUrl location').select('userId level yearsExp').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addSkill = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Skill name required' });
    const skill = new Skill({ name: name.toLowerCase().trim() });
    await skill.save();
    res.json({ ok: true, name: name.toLowerCase().trim() });
  } catch {
    res.status(409).json({ error: 'Skill already exists' });
  }
};

const deleteSkill = async (req, res) => {
  try {
    await Skill.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEvents = async (req, res) => {
  try {
    const events = await Event.find().populate('communityId', 'name').populate('creatorId', 'name').sort({ createdAt: -1 }).lean();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { title, datetime, guidelines, venueName } = req.body;
    const update = {};
    if (title) update.title = title;
    if (datetime) update.datetime = datetime;
    if (guidelines) update.guidelines = guidelines;
    if (venueName) update.venueName = venueName;
    await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin/verifications — list all pending skill verifications
const getPendingVerifications = async (req, res) => {
  try {
    const verifications = await SkillVerification.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();
    const enriched = await Promise.all(verifications.map(async (v) => {
      const user = await User.findById(v.userId).select('name email avatarUrl shortId').lean();
      return { ...v, user };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /admin/verifications/:id — approve or reject
const reviewVerification = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['verified', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const verification = await SkillVerification.findById(req.params.id);
    if (!verification) return res.status(404).json({ error: 'Verification not found' });

    verification.status = status;
    verification.adminNote = adminNote || null;
    if (status === 'verified') verification.verifiedAt = new Date();
    await verification.save();

    // Update the UserSkill verification status
    await UserSkill.findOneAndUpdate(
      { userId: verification.userId, skillId: verification.skillId },
      { verificationStatus: status }
    );

    // Send notification to user
    try {
      const { Notification } = require('../config/db');
      const { v4: uuidv4 } = require('uuid');
      const skillName = verification.skillName || 'your skill';
      const message = status === 'verified'
        ? `✅ Your "${skillName}" skill has been verified!`
        : `❌ Your "${skillName}" skill verification was rejected.${adminNote ? ` Reason: ${adminNote}` : ' Please resubmit with correct proof.'}`;

      await new Notification({
        _id: uuidv4(),
        userId: verification.userId,
        type: 'skill_verification',
        message,
        isRead: false,
      }).save();

      // Real-time notification
      try {
        const { emitToUser } = require('../socket/index');
        emitToUser(verification.userId.toString(), 'notification', {
          type: 'skill_verification',
          message,
          createdAt: new Date(),
        });
      } catch (emitErr) {
        console.error('Failed to emit notification:', emitErr.message);
      }
    } catch (notifErr) {
      console.error('Failed to send verification notification:', notifErr.message);
    }

    res.json({ ok: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin/cohort-retention — signup week cohort analysis
const getCohortRetention = async (req, res) => {
  try {
    // Get all users grouped by signup week
    const users = await User.find().select('_id createdAt lastActiveDate').lean();

    // Group users by ISO week of signup
    const cohorts = {};
    for (const user of users) {
      const d = new Date(user.createdAt);
      // Get Monday of the week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const weekKey = monday.toISOString().slice(0, 10);

      if (!cohorts[weekKey]) cohorts[weekKey] = { week: weekKey, users: [], submittedVideo: 0, returnedDay2: 0 };
      cohorts[weekKey].users.push(user._id);
    }

    // For each cohort, count who submitted a video and who returned on day 2+
    const result = await Promise.all(
      Object.values(cohorts).map(async cohort => {
        const total = cohort.users.length;

        // Count users who submitted at least one video
        const videoSubmitters = await ChallengeVideo.distinct('userId', { userId: { $in: cohort.users } });
        const submittedPct = total > 0 ? Math.round((videoSubmitters.length / total) * 100) : 0;

        // Count users who were active on day 2+ (lastActiveDate set and > createdAt + 1 day)
        const weekStart = new Date(cohort.week);
        const day2Users = await User.countDocuments({
          _id: { $in: cohort.users },
          lastActiveDate: { $gt: new Date(weekStart.getTime() + 86400000).toISOString().slice(0, 10) }
        });
        const returnedPct = total > 0 ? Math.round((day2Users / total) * 100) : 0;

        return {
          week: cohort.week,
          total,
          submittedVideo: videoSubmitters.length,
          submittedPct,
          returnedDay2: day2Users,
          returnedPct,
        };
      })
    );

    // Sort by week descending
    result.sort((a, b) => b.week.localeCompare(a.week));
    res.json(result.slice(0, 12)); // Last 12 weeks
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { login, getUsers, getUser, updateUser, deleteUser, getStats, getSkillUsers, addSkill, deleteSkill, getEvents, updateEvent, deleteEvent, getPendingVerifications, reviewVerification, getCohortRetention };
