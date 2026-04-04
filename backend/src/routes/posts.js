const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');
const { Post, PostLike, PostComment, PostInteraction, User, Connection } = require('../config/db');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'frontend', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `post-${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.gif','.webp','.mp4','.mov'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// Helper function to get user's connected user IDs
async function getConnectedUserIds(userId) {
  const connections = await Connection.find({
    status: 'accepted',
    $or: [
      { requesterId: userId },
      { addresseeId: userId }
    ]
  }).select('requesterId addresseeId');
  
  return connections.reduce((ids, conn) => {
    if (conn.requesterId === userId) ids.push(conn.addresseeId);
    if (conn.addresseeId === userId) ids.push(conn.requesterId);
    return ids;
  }, []);
}

// GET /posts — feed (all posts from connections + self)
router.get('/', verifyToken, async (req, res) => {
  try {
    const cId = req.user.userId;
    
    // Get connected user IDs
    const connectedIds = await getConnectedUserIds(cId);
    
    // Get hidden/not interested post IDs
    const hiddenInteractions = await PostInteraction.find({
      userId: cId,
      interactionType: { $in: ['hide', 'not_interested'] }
    }).select('postId');
    const hiddenPostIds = hiddenInteractions.map(i => i.postId);
    
    // Query posts with visibility rules
    const posts = await Post.find({
      $and: [
        { _id: { $nin: hiddenPostIds } },
        {
          $or: [
            { visibility: 'everyone' },
            { userId: cId },
            { visibility: 'connections', userId: { $in: connectedIds } }
          ]
        }
      ]
    })
      .populate({
        path: 'userId',
        select: 'name avatarUrl shortId',
        model: User
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    // Add like counts and comment counts
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const likeCount = await PostLike.countDocuments({ postId: post._id });
        const commentCount = await PostComment.countDocuments({ postId: post._id });
        const isLiked = await PostLike.findOne({ postId: post._id, userId: cId });
        
        return {
          ...post,
          id: post._id,
          authorName: post.userId.name,
          author_name: post.userId.name,
          authorAvatar: post.userId.avatarUrl,
          author_avatar: post.userId.avatarUrl,
          authorShortId: post.userId.shortId,
          author_short_id: post.userId.shortId,
          author_id: post.userId._id,
          likeCount,
          likes_count: likeCount,
          commentCount,
          comments_count: commentCount,
          isLiked: !!isLiked,
          is_liked: !!isLiked,
          image_urls: post.imageUrls || []
        };
      })
    );
    
    res.json(postsWithCounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /posts — create post
router.post('/', verifyToken, upload.array('images', 10), async (req, res) => {
  try {
    const { caption, visibility, verificationLink, note } = req.body;
    const imageUrl = (req.files && req.files.length > 0) ? `/uploads/${req.files[0].filename}` : null;
    const imageUrls = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    
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
              $or: [
                { requesterId: req.user.userId, addresseeId: targetUser._id },
                { requesterId: targetUser._id, addresseeId: req.user.userId }
              ]
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
    
    const post = await Post.findById(newPost._id)
      .populate({
        path: 'userId',
        select: 'name avatarUrl shortId',
        model: User
      })
      .lean();
    
    res.status(201).json({
      ...post,
      id: post._id,
      authorName: post.userId.name,
      author_name: post.userId.name,
      authorAvatar: post.userId.avatarUrl,
      author_avatar: post.userId.avatarUrl,
      authorShortId: post.userId.shortId,
      author_short_id: post.userId.shortId,
      author_id: post.userId._id,
      likeCount: 0,
      likes_count: 0,
      commentCount: 0,
      comments_count: 0,
      isLiked: false,
      is_liked: false,
      image_urls: post.imageUrls || []
    });
  } catch (err) {
    console.error('Post creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create post' });
  }
});

// DELETE /posts/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.userId.toString() !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });
    
    // Delete image files
    if (post.imageUrls && post.imageUrls.length > 0) {
      post.imageUrls.forEach(url => {
        const filePath = path.join(__dirname, '..', '..', 'frontend', url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    } else if (post.imageUrl) {
      const filePath = path.join(__dirname, '..', '..', 'frontend', post.imageUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    
    // Delete post and related data
    await Post.deleteOne({ _id: req.params.id });
    await PostLike.deleteMany({ postId: req.params.id });
    await PostComment.deleteMany({ postId: req.params.id });
    await PostInteraction.deleteMany({ postId: req.params.id });
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /posts/:id/interact
router.post('/:id/interact', verifyToken, async (req, res) => {
  try {
    const { type } = req.body;
    if (!['interested', 'not_interested', 'hide'].includes(type)) {
      return res.status(400).json({ error: 'Invalid interaction type' });
    }
    
    const postId = req.params.id;
    const userId = req.user.userId;
    
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    // Use upsert to handle duplicate attempts gracefully
    await PostInteraction.findOneAndUpdate(
      { userId, postId, interactionType: type },
      { _id: uuidv4(), userId, postId, interactionType: type },
      { upsert: true, new: true }
    );
    
    res.json({ success: true, type });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /posts/:id/like
router.post('/:id/like', verifyToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;
    
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existing = await PostLike.findOne({ postId, userId });
    
    if (existing) {
      await PostLike.deleteOne({ _id: existing._id });
    } else {
      const newLike = new PostLike({
        _id: uuidv4(),
        postId,
        userId
      });
      await newLike.save();
    }
    
    const likeCount = await PostLike.countDocuments({ postId });
    res.json({ liked: !existing, likeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /posts/:id/comments
router.get('/:id/comments', verifyToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const comments = await PostComment.find({ postId })
      .populate({
        path: 'userId',
        select: 'name avatarUrl',
        model: User
      })
      .sort({ createdAt: 1 })
      .lean();
    
    const formattedComments = comments.map(c => ({
      ...c,
      authorName: c.userId.name,
      authorAvatar: c.userId.avatarUrl
    }));
    
    res.json(formattedComments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /posts/:id/comments
router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    
    const postId = req.params.id;
    const userId = req.user.userId;
    
    const newComment = new PostComment({
      _id: uuidv4(),
      postId,
      userId,
      text
    });
    
    await newComment.save();
    
    const comment = await PostComment.findById(newComment._id)
      .populate({
        path: 'userId',
        select: 'name avatarUrl',
        model: User
      })
      .lean();
    
    res.status(201).json({
      ...comment,
      authorName: comment.userId.name,
      authorAvatar: comment.userId.avatarUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
