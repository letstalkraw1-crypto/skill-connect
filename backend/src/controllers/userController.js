const profileService = require('../services/profile');
const { User, SkillVerification, Skill, SkillEndorsement, Feedback, Connection, UserSkill } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const getProfile = async (req, res) => {
  try {
    const profile = await profileService.getProfile(req.params.userId);
    
    let connectionStatus = 'none';
    if (req.user && req.user.userId !== req.params.userId) {
      const conn = await Connection.findOne({
        $or: [
          { requesterId: req.user.userId, addresseeId: req.params.userId },
          { requesterId: req.params.userId, addresseeId: req.user.userId }
        ]
      });
      if (conn) {
        if (conn.status === 'accepted') connectionStatus = 'connected';
        else if (conn.status === 'pending') {
          connectionStatus = conn.requesterId.toString() === req.user.userId.toString() ? 'requested' : 'pending';
        }
      }
    }

    res.status(200).json({
      ...profile,
      connectionStatus,
      connection_status: connectionStatus
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getProfileByShortId = async (req, res) => {
  try {
    const user = await User.findOne({ shortId: req.params.shortId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const profile = await profileService.getProfile(user._id);
    res.status(200).json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const updateProfile = async (req, res) => {
  if (req.user.userId !== req.params.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const profile = await profileService.updateProfile(req.params.userId, req.body);
    res.status(200).json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const profile = await profileService.updateProfile(req.user.userId, req.body);
    res.status(200).json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const completeOnboarding = async (req, res) => {
  try {
    const { skills, lookingFor, verificationLinks } = req.body;
    const userId = req.user.userId;

    if (skills && skills.length) {
      for (const s of skills) {
        const skillDoc = await Skill.findOne({ name: { $regex: new RegExp('^' + s.skillName + '$', 'i') } });
        if (!skillDoc) continue;
        try {
          await UserSkill.findOneAndUpdate(
            { userId, skillId: skillDoc._id, subSkill: s.subSkill || null },
            { userId, skillId: skillDoc._id, subSkill: s.subSkill || null, level: s.level || 'Beginner' },
            { upsert: true, new: true }
          );
        } catch (e) { /* skip duplicates */ }
      }
    }

    const update = { onboardingComplete: true };
    if (lookingFor) update.lookingFor = lookingFor;
    if (verificationLinks) {
      if (verificationLinks.strava || verificationLinks.strava_id) update.stravaId = verificationLinks.strava || verificationLinks.strava_id;
      if (verificationLinks.github || verificationLinks.github_id) update.githubId = verificationLinks.github || verificationLinks.github_id;
      if (verificationLinks.portfolio || verificationLinks.portfolio_url) update.portfolioUrl = verificationLinks.portfolio || verificationLinks.portfolio_url;
    }

    await User.findByIdAndUpdate(userId, update);
    const profile = await profileService.getProfile(userId);
    res.json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getSkillsList = (req, res) => {
  const SKILLS_DATA = {
    'Running': ['Fitness Running', 'Marathon / Endurance', 'Sprinting'],
    'Cycling': ['Road Cycling', 'Mountain Biking', 'Fitness Cycling'],
    'Swimming': ['Fitness Swimming', 'Competitive Swimming', 'Coaching'],
    'Gym / Fitness': ['Weight Training', 'Calisthenics', 'Personal Training'],
    'Content Creation': ['Short-form (Reels)', 'Long-form (YouTube)', 'Personal Branding'],
    'Coding': ['Web Development', 'App Development', 'DSA / Competitive Programming'],
    'Professional Communication': ['Public Speaking', 'Debate / Discussion', 'Hosting (Webinar / Seminar)'],
    'Photography / Videography': ['Photography', 'Videography', 'Editing'],
    'Research': ['Academic Research', 'Technical Research', 'Market Research'],
    'Design': ['UI/UX Design', 'Graphic Design', 'Thumbnail Design'],
    'Business / Entrepreneurship': ['Marketing', 'Sales', 'Startup Building'],
    'Personal Development': ['Leadership', 'Time Management', 'Problem Solving'],
    'Yoga': ['Hatha Yoga', 'Power Yoga', 'Meditation'],
    'Hiking': ['Trail Hiking', 'Mountain Trekking', 'Backpacking']
  };
  res.json(SKILLS_DATA);
};

const addSkills = async (req, res) => {
  try {
    const profile = await profileService.addSkills(req.user.userId, req.body.skills);
    res.status(200).json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const deleteSkill = async (req, res) => {
  try {
    const result = await profileService.deleteSkill(req.user.userId, req.params.skillId);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const submitVerification = async (req, res) => {
  let { skillId, skillName, verificationType, url } = req.body;
  if (!skillId && !skillName) return res.status(400).json({ error: 'skillId or skillName required' });
  
  try {
    if (!skillId && skillName) {
      const skill = await Skill.findOne({ name: { $regex: new RegExp('^' + skillName + '$', 'i') } });
      if (skill) skillId = skill._id;
      else return res.status(404).json({ error: 'Skill not found' });
    }

    const verification = new SkillVerification({
      _id: uuidv4(),
      userId: req.user.userId,
      skillId,
      verificationType,
      url,
      status: 'pending'
    });
    await verification.save();
    res.json({ id: verification._id, status: 'pending' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getVerifications = async (req, res) => {
  try {
    const verifications = await SkillVerification.find({ userId: req.user.userId })
      .populate({ path: 'skillId', select: 'name' })
      .lean();
    res.json(verifications.map(v => ({ ...v, skillName: v.skillId?.name })));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const addEndorsement = async (req, res) => {
  const { endorseeId, skillId, comment } = req.body;
  try {
    const endorsement = new SkillEndorsement({
      _id: uuidv4(),
      endorserId: req.user.userId,
      endorseeId,
      skillId,
      comment
    });
    await endorsement.save();
    res.json({ id: endorsement._id });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already endorsed' });
    res.status(500).json({ error: err.message });
  }
};

const getEndorsements = async (req, res) => {
  try {
    const endorsements = await SkillEndorsement.find({ endorseeId: req.params.userId })
      .populate('skillId', 'name')
      .populate('endorserId', 'name')
      .lean();
    res.json(endorsements.map(e => ({ ...e, skillName: e.skillId?.name, endorserName: e.endorserId?.name })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addFeedback = async (req, res) => {
  try {
    const feedback = new Feedback({
      _id: uuidv4(),
      fromUserId: req.user.userId,
      ...req.body
    });
    await feedback.save();
    res.json({ id: feedback._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({ toUserId: req.user.userId })
      .populate('fromUserId', 'name')
      .lean();
    res.json(feedback.map(f => ({ ...f, fromName: f.fromUserId?.name })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getShareData = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('shortId name avatarUrl');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.json({
      userId: user._id,
      shortId: user.shortId,
      name: user.name,
      avatarUrl: user.avatarUrl,
      shareLink: `${baseUrl}/profile?id=${user.shortId}`,
      qrCode: { type: 'profile', value: `${baseUrl}/profile?id=${user.shortId}` }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getProfile, getProfileByShortId, updateProfile, updateMyProfile, completeOnboarding, 
  getSkillsList, addSkills, deleteSkill, submitVerification, getVerifications,
  addEndorsement, getEndorsements, addFeedback, getFeedback, getShareData
};
