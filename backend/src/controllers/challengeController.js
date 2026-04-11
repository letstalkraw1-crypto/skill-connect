const { Challenge, ChallengeSubmission } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const listChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find()
      .populate('skillId', 'name')
      .populate('creatorId', 'name avatarUrl')
      .sort({ createdAt: -1 }).lean();
    res.json(challenges.map(c => ({
      ...c,
      creatorName: c.creatorId?.name,
      isCreator: c.creatorId?._id?.toString() === req.user?.userId
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createChallenge = async (req, res) => {
  try {
    const { title, description, skillId, difficulty, startDate, endDate, points } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const challenge = new Challenge({
      _id: uuidv4(),
      creatorId: req.user.userId,
      title, description, skillId,
      difficulty: difficulty || 'Medium',
      startDate, endDate,
      points: points || 10
    });
    await challenge.save();
    res.json({ id: challenge._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const submitToChallenge = async (req, res) => {
  try {
    const { submissionData, score } = req.body;
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    
    await new ChallengeSubmission({ _id: uuidv4(), challengeId: req.params.id, userId: req.user.userId, submissionData, score }).save();
    res.json({ id: req.params.id });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already submitted' });
    res.status(500).json({ error: err.message });
  }
};

const getSubmissions = async (req, res) => {
  try {
    const submissions = await ChallengeSubmission.find({ challengeId: req.params.id }).populate('userId', 'name').sort({ score: -1 }).lean();
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listChallenges, createChallenge, submitToChallenge, getSubmissions };
