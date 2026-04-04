const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');
const { Community, CommunityMember, User } = require('../config/db');

const router = express.Router();

// GET /communities - List all communities the user is a part of, plus public discovery
router.get('/', verifyToken, async (req, res) => {
  try {
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
          member_count: { $size: '$members' },
          isMember: {
            $cond: [
              { $in: [userId, '$members.userId'] },
              true,
              false
            ]
          },
          is_member: {
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

    const formattedCommunities = communities.map(c => ({
      ...c,
      id: c._id,
      creator_id: c.creatorId,
      creator_name: c.creator?.[0]?.name || 'Unknown',
      creator_avatar: c.creator?.[0]?.avatarUrl || null
    }));

    res.json(formattedCommunities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /communities/:id - Get specific community details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const community = await Community.findById(req.params.id)
      .populate('creatorId', 'name')
      .lean();

    if (!community) return res.status(404).json({ error: 'Community not found' });

    const members = await CommunityMember.find({ communityId: req.params.id })
      .populate('userId', 'id name avatarUrl shortId')
      .lean();

    community.memberCount = members.length;
    community.member_count = members.length;
    community.isMember = members.some(m => m.userId._id.toString() === userId);
    community.is_member = members.some(m => m.userId._id.toString() === userId);
    community.members = members.map(m => ({ ...m.userId, id: m.userId._id, avatar_url: m.userId.avatarUrl, role: m.role }));
    community.id = community._id;
    community.creator_id = community.creatorId._id;
    community.creator_name = community.creatorId.name;
    community.creator_avatar = community.creatorId.avatarUrl;

    res.json(community);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /communities - Create a new community
router.post('/', verifyToken, async (req, res) => {
  try {
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

    const com = await Community.findById(community._id)
      .populate('creatorId', 'name avatarUrl')
      .lean();
    
    res.status(201).json({
      ...com,
      id: com._id,
      creator_id: com.creatorId._id,
      creator_name: com.creatorId.name,
      creator_avatar: com.creatorId.avatarUrl,
      member_count: 1,
      is_member: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /communities/:id/join - Join a community
router.post('/:id/join', verifyToken, async (req, res) => {
  try {
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
