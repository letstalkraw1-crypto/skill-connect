const { Community, CommunityMember, Conversation, User } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const listCommunities = async (req, res) => {
  try {
    const userId = req.user.userId;
    const communities = await Community.find().sort({ createdAt: -1 }).lean();

    const result = await Promise.all(communities.map(async (c) => {
      const members = await CommunityMember.find({ communityId: c._id }).lean();
      const creator = await User.findById(c.creatorId).select('name avatarUrl').lean();
      return {
        ...c,
        id: c._id,
        memberCount: members.length,
        member_count: members.length,
        isMember: members.some(m => m.userId === userId),
        is_member: members.some(m => m.userId === userId),
        isCreator: c.creatorId === userId,
        creator_name: creator?.name || 'Unknown',
        creator_avatar: creator?.avatarUrl || null,
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCommunity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const community = await Community.findById(req.params.id).lean();
    if (!community) return res.status(404).json({ error: 'Community not found' });

    const members = await CommunityMember.find({ communityId: req.params.id })
      .populate('userId', 'id name avatarUrl shortId')
      .lean();
    const creator = await User.findById(community.creatorId).select('name avatarUrl').lean();

    res.json({
      ...community,
      id: community._id,
      memberCount: members.length,
      member_count: members.length,
      isMember: members.some(m => m.userId?._id?.toString() === userId),
      is_member: members.some(m => m.userId?._id?.toString() === userId),
      isCreator: community.creatorId === userId,
      members: members.map(m => ({
        ...m.userId,
        id: m.userId?._id,
        role: m.role,
        joinedAt: m.joinedAt
      })),
      creator_name: creator?.name || 'Unknown',
      creator_avatar: creator?.avatarUrl || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCommunity = async (req, res) => {
  try {
    const { name, description, type, maxMembers } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Community name required' });

    // Create group conversation for this community
    const conversation = new Conversation({
      _id: uuidv4(),
      participants: [req.user.userId],
      isGroup: true,
      groupName: name.trim(),
    });
    await conversation.save();

    const community = new Community({
      _id: uuidv4(),
      creatorId: req.user.userId,
      name: name.trim(),
      description,
      type: type || 'community',
      maxMembers: maxMembers || 100,
      conversationId: conversation._id,
    });
    await community.save(); // shortCode auto-generated in pre-save hook

    // Update conversation with communityId
    conversation.communityId = community._id;
    await conversation.save();

    // Add creator as admin member
    await new CommunityMember({
      communityId: community._id,
      userId: req.user.userId,
      role: 'admin'
    }).save();

    const creator = await User.findById(req.user.userId).select('name avatarUrl').lean();
    res.status(201).json({
      ...community.toObject(),
      id: community._id,
      shortCode: community.shortCode,
      creator_name: creator?.name,
      creator_avatar: creator?.avatarUrl,
      member_count: 1,
      is_member: true,
      isCreator: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const joinCommunity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ error: 'Community not found' });

    const existing = await CommunityMember.findOne({ communityId: req.params.id, userId });

    if (existing) {
      // Leave — but creator cannot leave
      if (community.creatorId === userId) {
        return res.status(403).json({ error: 'Creator cannot leave their own community' });
      }
      await CommunityMember.deleteOne({ _id: existing._id });

      // Remove from group conversation
      if (community.conversationId) {
        await Conversation.findByIdAndUpdate(community.conversationId, {
          $pull: { participants: userId }
        });
      }
      return res.json({ joined: false });
    } else {
      // Check max members
      const count = await CommunityMember.countDocuments({ communityId: req.params.id });
      if (count >= community.maxMembers) {
        return res.status(400).json({ error: 'Community is full' });
      }

      await new CommunityMember({
        communityId: req.params.id,
        userId,
        role: 'member'
      }).save();

      // Add to group conversation
      if (community.conversationId) {
        await Conversation.findByIdAndUpdate(community.conversationId, {
          $addToSet: { participants: userId }
        });
      }
      return res.json({ joined: true, conversationId: community.conversationId });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listCommunities, getCommunity, createCommunity, joinCommunity };
