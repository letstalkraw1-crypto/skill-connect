const express = require('express');
const router = express.Router();
const { verifyToken } = require('../services/auth');
const { getProfile, updateProfile, addSkills, deleteSkill } = require('../services/profile');
const { User, SkillVerification, Skill, SkillEndorsement, Feedback } = require('../db/index');
const { v4: uuidv4 } = require('uuid');

// GET /profile/by-short-id/:shortId — public lookup by 8-digit ID
router.get('/by-short-id/:shortId', async (req, res) => {
  const user = await User.findOne({ shortId: req.params.shortId });
  if (!user) return res.status(404).json({ error: 'User not found' });
  try {
    const profile = await getProfile(user._id);
    res.status(200).json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /profile/:userId — public profile view
router.get('/:userId', async (req, res) => {
  try {
    const profile = await getProfile(req.params.userId);
    res.status(200).json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /profile/:userId — update own profile (auth required)
router.put('/:userId', verifyToken, async (req, res) => {
  if (req.user.userId !== req.params.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { bio, location, avatarUrl, name, stravaId, garminId, instagramId, allowTagging, theme, accountType } = req.body;
    const profile = await updateProfile(req.params.userId, { bio, location, avatarUrl, name, stravaId, garminId, instagramId, allowTagging, theme, accountType });
    res.status(200).json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /profile/skills — add skills to own profile (auth required)
router.post('/skills', verifyToken, async (req, res) => {
  try {
    const { skills } = req.body;
    const profile = await addSkills(req.user.userId, skills);
    res.status(200).json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /profile/skills/:skillId — remove own skill (auth required)
router.delete('/skills/:skillId', verifyToken, async (req, res) => {
  try {
    const result = await deleteSkill(req.user.userId, req.params.skillId);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /profile/verifications — submit skill verification (auth required)
router.post('/verifications', verifyToken, async (req, res) => {
  const { skillId, verificationType, url } = req.body;
  if (!skillId || !verificationType) return res.status(400).json({ error: 'skillId and verificationType required' });
  
  try {
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
});

// GET /profile/verifications — list user's verifications (auth required)
router.get('/verifications', verifyToken, async (req, res) => {
  try {
    const verifications = await SkillVerification.find({ userId: req.user.userId })
      .populate({ path: 'skillId', select: 'name' })
      .lean();
    
    const result = verifications.map(v => ({
      ...v,
      skillName: v.skillId?.name
    }));
    
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /profile/endorsements — endorse a user's skill (auth required)
router.post('/endorsements', verifyToken, async (req, res) => {
  const { endorseeId, skillId, comment } = req.body;
  if (!endorseeId || !skillId) return res.status(400).json({ error: 'endorseeId and skillId required' });
  
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
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Already endorsed this skill' });
    }
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /profile/:userId/endorsements — list endorsements for user (public)
router.get('/:userId/endorsements', async (req, res) => {
  try {
    const endorsements = await SkillEndorsement.find({ endorseeId: req.params.userId })
      .populate({ path: 'skillId', select: 'name' })
      .populate({ path: 'endorserId', select: 'name' })
      .lean();
    
    const result = endorsements.map(e => ({
      ...e,
      skillName: e.skillId?.name,
      endorserName: e.endorserId?.name
    }));
    
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /profile/feedback — leave feedback (auth required)
router.post('/feedback', verifyToken, async (req, res) => {
  const { toUserId, type, referenceId, rating, comment } = req.body;
  if (!toUserId || !type || !rating) return res.status(400).json({ error: 'toUserId, type, rating required' });
  
  try {
    const feedback = new Feedback({
      _id: uuidv4(),
      fromUserId: req.user.userId,
      toUserId,
      type,
      referenceId,
      rating,
      comment
    });
    await feedback.save();
    res.json({ id: feedback._id });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /profile/feedback — list feedback received (auth required)
router.get('/feedback', verifyToken, async (req, res) => {
  try {
    const feedback = await Feedback.find({ toUserId: req.user.userId })
      .populate({ path: 'fromUserId', select: 'name' })
      .lean();
    
    const result = feedback.map(f => ({
      ...f,
      fromName: f.fromUserId?.name
    }));
    
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;

