const { Post, PostLike, PostComment, PostInteraction, User, Connection, Notification } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { createNotification } = require('../utils/notification');
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary } = require('../config/cloudinary');

// Helper to get connected user IDs
async function getConnectedUserIds(userId) {
  const connections = await Connection.find({
    status: 'accepted',
    $or: [{ requesterId: userId }, { addresseeId: userId }]
  }).select('requesterId addresseeId');
  
  return connections.reduce((ids, conn) => {
    if (conn.requesterId.toString() === userId.toString()) ids.push(conn.addresseeId);
    else ids.push(conn.requesterId);
    return ids;
  }, []);
}

const getFeed = async (req, res) => {
  try {
    const userId = req.user.userId;
    const connectedIds = await getConnectedUserIds(userId);
    
    const hiddenInteractions = await PostInteraction.find({
      userId,
      interactionType: { $in: ['hide', 'not_interested'] }
    }).select('postId');
    const hiddenPostIds = hiddenInteractions.map(i => i.postId);
    
    const matchQuery = {
      $and: [
        { _id: { $nin: hiddenPostIds } },
        {
          $or: [
            { visibility: 'everyone' },
            { userId: userId },
            { visibility: 'connections', userId: { $in: connectedIds } }
          ]
        }
      ]
    };

    const posts = await Post.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' },
      {
        $lookup: {
          from: 'postlikes',
          localField: '_id',
          foreignField: 'postId',
          as: 'likes'
        }
      },
      {
        $lookup: {
          from: 'postcomments',
          localField: '_id',
          foreignField: 'postId',
          as: 'comments'
        }
      },
      {
        $addFields: {
          id: '$_id',
          likeCount: { $size: '$likes' },
          likes_count: { $size: '$likes' },
          commentCount: { $size: '$comments' },
          comments_count: { $size: '$comments' },
          isLiked: { $in: [userId, '$likes.userId'] },
          is_liked: { $in: [userId, '$likes.userId'] },
          authorName: '$author.name',
          author_name: '$author.name',
          authorAvatar: '$author.avatarUrl',
          author_avatar: '$author.avatarUrl',
          authorShortId: '$author.shortId',
          author_short_id: '$author.shortId',
          author_id: '$author._id',
          image_urls: { $ifNull: ['$imageUrls', []] }
        }
      },
      {
        $project: {
          likes: 0,
          comments: 0,
          author: 0
        }
      }
    ]);
    
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createPost = async (req, res) => {
  try {
    const { caption, visibility, verificationLink, note } = req.body;
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer);
        imageUrls.push(result.secure_url);
      }
    }
    const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;
    
    if (!caption && !imageUrl && !note) {
      return res.status(400).json({ error: 'Post needs a caption, note, or image' });
    }

    if (caption) {
      const mentionRegex = /@\[.*?\]\((\d{8})\)|@(\d{8})/g;
      const matches = [...caption.matchAll(mentionRegex)];
      const taggedShortIds = [...new Set(matches.map(m => m[1] || m[2]))];

      for (const shortId of taggedShortIds) {
        const targetUser = await User.findOne({ shortId }).select('name allowTagging');
        if (targetUser) {
          if (targetUser.allowTagging === 'none') {
            return res.status(403).json({ error: `${targetUser.name} does not allow tagging.` });
          } else if (targetUser.allowTagging === 'connections') {
            const isConnected = await Connection.findOne({
              status: 'accepted',
              $or: [{ requesterId: req.user.userId, addresseeId: targetUser._id }, { requesterId: targetUser._id, addresseeId: req.user.userId }]
            });
            if (!isConnected) {
              return res.status(403).json({ error: `${targetUser.name} only allows connections to tag them.` });
            }
          }
        }
      }
    }

    const newPost = new Post({
      _id: uuidv4(),
      userId: req.user.userId,
      caption: caption || null,
      note: note || null,
      imageUrl,
      imageUrls,
      visibility: visibility || 'everyone',
      verificationLink: verificationLink || null
    });
    
    await newPost.save();
    
    const post = await Post.findById(newPost._id).populate('userId', 'name avatarUrl shortId').lean();
    const postData = {
      ...post,
      id: post._id,
      authorName: post.userId.name,
      author_name: post.userId.name,
      authorAvatar: post.userId.avatarUrl,
      author_avatar: post.userId.avatarUrl,
      authorShortId: post.userId.shortId,
      author_short_id: post.userId.shortId,
      author_id: post.userId._id,
      likeCount: 0, likes_count: 0,
      commentCount: 0, comments_count: 0,
      isLiked: false, is_liked: false,
      image_urls: post.imageUrls || []
    };

    // Broadcast new post to all connected users in real-time
    try {
      const { emitToUser } = require('../socket/index');
      const { getIO } = require('../socket/index');
      const io = getIO();
      if (io) io.emit('new_post', postData); // broadcast to everyone
    } catch {}

    res.status(201).json(postData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.userId.toString() !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });
    
    const uploadBase = path.join(process.cwd(), '..', 'frontend');
    const deleteLocal = (url) => {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) return;
      const filePath = path.join(uploadBase, url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    };

    if (post.imageUrls && post.imageUrls.length > 0) {
      post.imageUrls.forEach(url => deleteLocal(url));
    } else if (post.imageUrl) {
      deleteLocal(post.imageUrl);
    }
    
    await Post.deleteOne({ _id: req.params.id });
    await PostLike.deleteMany({ postId: req.params.id });
    await PostComment.deleteMany({ postId: req.params.id });
    await PostInteraction.deleteMany({ postId: req.params.id });
    
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const interact = async (req, res) => {
  try {
    const { type } = req.body;
    if (!['interested', 'not_interested', 'hide'].includes(type)) {
      return res.status(400).json({ error: 'Invalid interaction type' });
    }
    await PostInteraction.findOneAndUpdate(
      { userId: req.user.userId, postId: req.params.id, interactionType: type },
      { _id: uuidv4(), userId: req.user.userId, postId: req.params.id, interactionType: type },
      { upsert: true, new: true }
    );
    res.json({ success: true, type });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const likePost = async (req, res) => {
  try {
    const existing = await PostLike.findOne({ postId: req.params.id, userId: req.user.userId });
    if (existing) {
      await PostLike.deleteOne({ _id: existing._id });
    } else {
      await new PostLike({ _id: uuidv4(), postId: req.params.id, userId: req.user.userId }).save();
      
      // Create notification for the post author
      try {
        const post = await Post.findById(req.params.id).select('userId');
        if (post) {
          const sender = await User.findById(req.user.userId).select('name');
          await createNotification({
            recipientId: post.userId,
            senderId: req.user.userId,
            type: 'like',
            message: `${sender.name} liked your post!`,
            relatedId: req.params.id
          });
        }
      } catch (err) {
        console.error('Failed to prepare like notification:', err);
      }
    }
    const likeCount = await PostLike.countDocuments({ postId: req.params.id });

    // Broadcast like update to all users
    try {
      const { getIO } = require('../socket/index');
      const io = getIO();
      if (io) io.emit('post_updated', { postId: req.params.id, likeCount, liked: !existing });
    } catch {}

    res.json({ liked: !existing, likeCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getComments = async (req, res) => {
  try {
    const comments = await PostComment.find({ postId: req.params.id })
      .populate('userId', 'name avatarUrl')
      .sort({ createdAt: 1 })
      .lean();
    res.json(comments.map(c => ({ ...c, authorName: c.userId.name, authorAvatar: c.userId.avatarUrl })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment text is required' });
    const newComment = new PostComment({ _id: uuidv4(), postId: req.params.id, userId: req.user.userId, text });
    await newComment.save();
    const comment = await PostComment.findById(newComment._id).populate('userId', 'name avatarUrl').lean();

    // Create notification for the post author
    try {
      const post = await Post.findById(req.params.id).select('userId');
      if (post) {
        const sender = await User.findById(req.user.userId).select('name');
        await createNotification({
          recipientId: post.userId,
          senderId: req.user.userId,
          type: 'comment',
          message: `${sender.name} commented on your post: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`,
          relatedId: req.params.id
        });
      }
    } catch (err) {
      console.error('Failed to prepare comment notification:', err);
    }

    res.status(201).json({ ...comment, authorName: comment.userId.name, authorAvatar: comment.userId.avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getFeed, createPost, deletePost, interact, likePost, getComments, addComment };
