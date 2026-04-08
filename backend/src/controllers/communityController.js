const { Community, CommunityMember, Conversation, User } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const listCommunities = async (req, res) => {
  try {
    const userId = req.user.userId;
    const communities = await Community.find().sort({ createdAt: -1 }).lean();

    const result = await Promise.all(communities.map(async (c) => {
      const members = await CommunityMember.find({ communityId: c._id }).lean();
      const creator = await User.findById(c.creatorId).select('name avatarUrl').lean();

      // Auto-create conversation if missing
      let conversationId = c.conversationId;
      if (!conversationId) {
        const allMemberIds = members.map(m => m.userId);
        const conv = new Conversation({
          _id: uuidv4(),
          participants: allMemberIds.length ? allMemberIds : [c.creatorId],
          isGroup: true,
          groupName: c.name,
          communityId: c._id,
        });
        await conv.save();
        await Community.findByIdAndUpdate(c._id, { conversationId: conv._id });
        conversationId = conv._id;
      }

      return {
        ...c,
        id: c._id,
        conversationId,
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

    if (!community.conversationId) {
      const conversation = new Conversation({
        _id: uuidv4(), participants: [community.creatorId],
        isGroup: true, groupName: community.name, communityId: community._id,
      });
      await conversation.save();
      community.conversationId = conversation._id;
      await community.save();
    }

    const existing = await CommunityMember.findOne({ communityId: req.params.id, userId });

    if (existing) {
      if (community.creatorId === userId) return res.status(403).json({ error: 'Creator cannot leave their own community' });
      await CommunityMember.deleteOne({ _id: existing._id });
      await Conversation.findByIdAndUpdate(community.conversationId, { $pull: { participants: userId } });
      return res.json({ joined: false });
    } else {
      const count = await CommunityMember.countDocuments({ communityId: req.params.id });
      if (count >= community.maxMembers) return res.status(400).json({ error: 'Community is full' });
      await new CommunityMember({ communityId: req.params.id, userId, role: 'member' }).save();
      await Conversation.findByIdAndUpdate(community.conversationId, { $addToSet: { participants: userId } });

      // Notify community admin/creator
      try {
        const { emitToUser } = require('../socket/index');
        const joiner = await User.findById(userId).select('name avatarUrl').lean();
        emitToUser(community.creatorId, 'notification', {
          type: 'community_join',
          message: `${joiner?.name} joined your community "${community.name}"`,
          senderId: { _id: userId, name: joiner?.name, avatarUrl: joiner?.avatarUrl },
          createdAt: new Date()
        });
      } catch {}

      return res.json({ joined: true, conversationId: community.conversationId });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: remove a member
const removeMember = async (req, res) => {
  try {
    const { communityId, userId: targetUserId } = req.params;
    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ error: 'Community not found' });
    if (community.creatorId !== req.user.userId) {
      const myMembership = await CommunityMember.findOne({ communityId, userId: req.user.userId });
      if (myMembership?.role !== 'admin') return res.status(403).json({ error: 'Only admins can remove members' });
    }
    if (targetUserId === community.creatorId) return res.status(403).json({ error: 'Cannot remove the creator' });
    await CommunityMember.deleteOne({ communityId, userId: targetUserId });
    if (community.conversationId) {
      await Conversation.findByIdAndUpdate(community.conversationId, { $pull: { participants: targetUserId } });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: make a member admin
const makeAdmin = async (req, res) => {
  try {
    const { communityId, userId: targetUserId } = req.params;
    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ error: 'Community not found' });
    if (community.creatorId !== req.user.userId) return res.status(403).json({ error: 'Only creator can assign admins' });
    await CommunityMember.findOneAndUpdate({ communityId, userId: targetUserId }, { role: 'admin' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: update privacy (who can send messages)
const updatePrivacy = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { messagingPolicy } = req.body; // 'everyone' | 'admins_only'
    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ error: 'Community not found' });
    if (community.creatorId !== req.user.userId) {
      const myMembership = await CommunityMember.findOne({ communityId, userId: req.user.userId });
      if (myMembership?.role !== 'admin') return res.status(403).json({ error: 'Only admins can change settings' });
    }
    await Community.findByIdAndUpdate(communityId, { messagingPolicy: messagingPolicy || 'everyone' });
    res.json({ ok: true, messagingPolicy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listCommunities, getCommunity, createCommunity, joinCommunity, removeMember, makeAdmin, updatePrivacy };
