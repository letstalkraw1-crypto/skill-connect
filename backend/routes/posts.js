const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');
const db = require('../db/index');

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

// GET /posts — feed (all posts from connections + self)
router.get('/', verifyToken, (req, res) => {
  const cId = req.user.userId;
  const posts = db.prepare(`
    SELECT p.*, u.name as author_name, u.avatar_url as author_avatar, u.short_id as author_short_id,
           (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
           (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count,
           EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE (p.visibility = 'everyone'
       OR p.user_id = ?
       OR (p.visibility = 'connections' AND p.user_id IN (
           SELECT addressee_id FROM connections WHERE requester_id = ? AND status = 'accepted'
           UNION
           SELECT requester_id FROM connections WHERE addressee_id = ? AND status = 'accepted'
       )))
       AND p.id NOT IN (
           SELECT post_id FROM post_interactions 
           WHERE user_id = ? AND interaction_type IN ('hide', 'not_interested')
       )
    ORDER BY p.created_at DESC LIMIT 50
  `).all(cId, cId, cId, cId, cId);
  res.json(posts);
});

// POST /posts — create post
router.post('/', verifyToken, upload.array('images', 10), (req, res) => {
  const { caption, visibility, verification_link, note } = req.body;
  const imageUrl = (req.files && req.files.length > 0) ? `/uploads/${req.files[0].filename}` : null;
  const imageUrls = req.files ? JSON.stringify(req.files.map(f => `/uploads/${f.filename}`)) : '[]';
  if (!caption && !imageUrl && !note) return res.status(400).json({ error: 'Post needs a caption, note, or image' });

  if (caption) {
    const mentionRegex = /@\[.*?\]\((\d{8})\)|@(\d{8})/g;
    const matches = [...caption.matchAll(mentionRegex)];
    const taggedShortIds = [...new Set(matches.map(m => m[1] || m[2]))];

    for (const shortId of taggedShortIds) {
      const targetUser = db.prepare('SELECT id, name, allow_tagging FROM users WHERE short_id = ?').get(shortId);
      if (targetUser) {
        if (targetUser.allow_tagging === 'none') {
          return res.status(403).json({ error: `${targetUser.name} does not allow tagging.` });
        } else if (targetUser.allow_tagging === 'connections') {
          const isConnected = db.prepare(`SELECT 1 FROM connections WHERE status = 'accepted' AND 
            ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`).get(
            req.user.userId, targetUser.id, targetUser.id, req.user.userId
          );
          if (!isConnected) {
            return res.status(403).json({ error: `${targetUser.name} only allows connections to tag them.` });
          }
        }
      }
    }
  }

  const id = uuidv4();
  db.prepare('INSERT INTO posts (id, user_id, caption, note, image_url, visibility, image_urls, verification_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, req.user.userId, caption || null, note || null, imageUrl, visibility || 'everyone', imageUrls, verification_link || null);
  const post = db.prepare('SELECT p.*, u.name as author_name, u.avatar_url as author_avatar FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?').get(id);
  res.status(201).json(post);
});

// DELETE /posts/:id
router.delete('/:id', verifyToken, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });
  
  if (post.image_urls && post.image_urls !== '[]') {
    try {
      const urls = JSON.parse(post.image_urls);
      urls.forEach(url => {
        const filePath = path.join(__dirname, '..', '..', 'frontend', url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    } catch(e) {}
  } else if (post.image_url) {
    const filePath = path.join(__dirname, '..', '..', 'frontend', post.image_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// POST /posts/:id/interact
router.post('/:id/interact', verifyToken, (req, res) => {
  const { type } = req.body;
  if (!['interested', 'not_interested', 'hide'].includes(type)) return res.status(400).json({ error: 'Invalid interaction type' });
  
  const postId = req.params.id;
  const userId = req.user.userId;
  
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  
  db.prepare('INSERT OR IGNORE INTO post_interactions (id, user_id, post_id, interaction_type) VALUES (?, ?, ?, ?)').run(uuidv4(), userId, postId, type);
  res.json({ success: true, type });
});

module.exports = router;

// POST /posts/:id/like
router.post('/:id/like', verifyToken, (req, res) => {
  const postId = req.params.id;
  const userId = req.user.userId;
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existing = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?').get(postId, userId);
  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO post_likes (id, post_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), postId, userId);
  }
  const likeCount = db.prepare('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?').get(postId).count;
  res.json({ liked: !existing, like_count: likeCount });
});

// GET /posts/:id/comments
router.get('/:id/comments', verifyToken, (req, res) => {
  const postId = req.params.id;
  const comments = db.prepare(`
    SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
    FROM post_comments c JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).all(postId);
  res.json(comments);
});

// POST /posts/:id/comments
router.post('/:id/comments', verifyToken, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });
  
  const postId = req.params.id;
  const userId = req.user.userId;
  const id = uuidv4();
  db.prepare('INSERT INTO post_comments (id, post_id, user_id, text) VALUES (?, ?, ?, ?)').run(id, postId, userId, text);
  
  const comment = db.prepare(`
    SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
    FROM post_comments c JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(id);
  
  res.status(201).json(comment);
});
