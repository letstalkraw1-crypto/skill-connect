const { Community, CommunityMember, User } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const listCommunities = async (req, res) => {
  try {
    const userId = req.user.userId;
    const communities = await Community.aggregate([
      { $lookup: { from: 'users', localField: 'creatorId', foreignField: '_id', as: 'creator' } },
      { $lookup: { from: 'communitymembers', localField: '_id', foreignField: 'communityId', as: 'members' } },
      {
        $addFields: {
          memberCount: { $size: '$members' },
          member_count: { $size: '$members' },
          isMember: { $cond: [{ $in: [userId, '$members.userId'] }, true, false] },
          is_member: { $cond: [{ $in: [userId, '$members.userId'] }, true, false] }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json(communities.map(c => ({
      ...c,
      id: c._id,
      creator_id: c.creatorId,
      creator_name: c.creator?.[0]?.name || 'Unknown',
      creator_avatar: c.creator?.[0]?.avatarUrl || null
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCommunity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const community = await Community.findById(req.params.id).populate('creatorId', 'name avatarUrl').lean();
    if (!community) return res.status(404).json({ error: 'Community not found' });

    const members = await CommunityMember.find({ communityId: req.params.id }).populate('userId', 'id name avatarUrl shortId').lean();
    
    res.json({
      ...community,
      id: community._id,
      memberCount: members.length,
      member_count: members.length,
      isMember: members.some(m => m.userId._id.toString() === userId),
      is_member: members.some(m => m.userId._id.toString() === userId),
      members: members.map(m => ({ ...m.userId, id: m.userId._id, avatar_url: m.userId.avatarUrl, role: m.role })),
      creator_id: community.creatorId._id,
      creator_name: community.creatorId.name,
      creator_avatar: community.creatorId.avatarUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCommunity = async (req, res) => {
  try {
    const { name, description, type, maxMembers } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Community name required' });

    const community = new Community({
      _id: uuidv4(),
      creatorId: req.user.userId,
      name: name.trim(),
      description,
      type: type || 'community',
      maxMembers: maxMembers || 100
    });
    await community.save();

    await new CommunityMember({ communityId: community._id, userId: req.user.userId, role: 'admin' }).save();

    const com = await Community.findById(community._id).populate('creatorId', 'name avatarUrl').lean();
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
};

const joinCommunity = async (req, res) => {
  try {
    const isMember = await CommunityMember.findOne({ communityId: req.params.id, userId: req.user.userId });
    if (isMember) {
      await CommunityMember.deleteOne({ _id: isMember._id });
      return res.json({ joined: false });
    } else {
      await new CommunityMember({ communityId: req.params.id, userId: req.user.userId, role: 'member' }).save();
      return res.json({ joined: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listCommunities, getCommunity, createCommunity, joinCommunity };
