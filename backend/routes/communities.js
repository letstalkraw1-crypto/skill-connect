const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');

const router = express.Router();

// GET /communities - List all communities the user is a part of, plus public discovery
router.get('/', verifyToken, async (req, res) => {
  try {
    const { Community, CommunityMember, User } = require('../db/index');
    const userId = req.user.userId;

    const communities = await Community.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'creatorId',
          foreignField: '_id',
          as: 'creator'
        }
      },
      {
        $lookup: {
          from: 'communitymembers',
          localField: '_id',
          foreignField: 'communityId',
          as: 'members'
        }
      },
      {
        $addFields: {
          memberCount: { $size: '$members' },
          isMember: {
            $cond: [
              { $in: [userId, '$members.userId'] },
              true,
              false
            ]
          }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json(communities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /communities/:id - Get specific community details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { Community, CommunityMember, User } = require('../db/index');
    const userId = req.user.userId;

    const community = await Community.findById(req.params.id)
      .populate('creatorId', 'name')
      .lean();

    if (!community) return res.status(404).json({ error: 'Community not found' });

    const members = await CommunityMember.find({ communityId: req.params.id })
      .populate('userId', 'id name avatarUrl shortId')
      .lean();

    community.memberCount = members.length;
    community.isMember = members.some(m => m.userId._id.toString() === userId);
    community.members = members.map(m => ({ ...m.userId, role: m.role }));

    res.json(community);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /communities - Create a new community
router.post('/', verifyToken, async (req, res) => {
  try {
    const { Community, CommunityMember } = require('../db/index');
    const { name, description, type, maxMembers } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Community name required' });

    const community = new Community({
      _id: uuidv4(),
      creatorId: req.user.userId,
      name: name.trim(),
      description: description || null,
      type: type || 'community',
      maxMembers: maxMembers || 100
    });
    await community.save();

    // Add creator as admin member
    const member = new CommunityMember({
      communityId: community._id,
      userId: req.user.userId,
      role: 'admin'
    });
    await member.save();

    res.status(201).json(community);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /communities/:id/join - Join a community
router.post('/:id/join', verifyToken, async (req, res) => {
  try {
    const { Community, CommunityMember } = require('../db/index');
    const communityId = req.params.id;
    const userId = req.user.userId;

    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ error: 'Community not found' });

    const isMember = await CommunityMember.findOne({ communityId, userId });
    if (isMember) {
      await CommunityMember.deleteOne({ _id: isMember._id });
      return res.json({ joined: false });
    } else {
      const member = new CommunityMember({
        communityId,
        userId,
        role: 'member'
      });
      await member.save();
      return res.json({ joined: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
