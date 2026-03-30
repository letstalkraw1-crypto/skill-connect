const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');
const db = require('../db/index');

const router = express.Router();

// GET /communities - List all communities the user is a part of, plus public discovery
router.get('/', verifyToken, (req, res) => {
  const userId = req.user.userId;
  // Get all communities, with an indicator if the user is a member
  const communities = db.prepare(`
    SELECT c.*, 
      u.name as admin_name,
      (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as member_count,
      EXISTS(SELECT 1 FROM community_members WHERE community_id = c.id AND user_id = ?) as is_member
    FROM communities c
    JOIN users u ON u.id = c.creator_id
    ORDER BY created_at DESC
  `).all(userId);
  res.json(communities);
});

// GET /communities/:id - Get specific community details
router.get('/:id', verifyToken, (req, res) => {
  const userId = req.user.userId;
  const community = db.prepare(`
    SELECT c.*, 
      u.name as admin_name,
      (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as member_count,
      EXISTS(SELECT 1 FROM community_members WHERE community_id = c.id AND user_id = ?) as is_member
    FROM communities c 
    JOIN users u ON u.id = c.creator_id
    WHERE c.id = ?
  `).get(userId, req.params.id);
  
  if (!community) return res.status(404).json({ error: 'Community not found' });
  
  // Also get members
  community.members = db.prepare(`
    SELECT u.id, u.name, u.avatar_url, u.short_id, cm.role 
    FROM community_members cm JOIN users u ON u.id = cm.user_id 
    WHERE cm.community_id = ?
  `).all(community.id);
  
  res.json(community);
});

// POST /communities - Create a new community
router.post('/', verifyToken, (req, res) => {
  const { name, description, type, maxMembers } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Community name required' });

  const id = uuidv4();
  db.prepare('INSERT INTO communities (id, creator_id, name, description, type, max_members) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.user.userId, name.trim(), description || null, type || 'community', maxMembers || 100);
  
  // Add creator as admin member
  db.prepare('INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, ?)').run(id, req.user.userId, 'admin');

  const newlyCreated = db.prepare('SELECT * FROM communities WHERE id = ?').get(id);
  res.status(201).json(newlyCreated);
});

// POST /communities/:id/join - Join a community
router.post('/:id/join', verifyToken, (req, res) => {
  const communityId = req.params.id;
  const userId = req.user.userId;
  
  const community = db.prepare('SELECT id FROM communities WHERE id = ?').get(communityId);
  if (!community) return res.status(404).json({ error: 'Community not found' });

  const isMember = db.prepare('SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?').get(communityId, userId);
  if (isMember) {
    db.prepare('DELETE FROM community_members WHERE community_id = ? AND user_id = ?').run(communityId, userId);
    return res.json({ joined: false });
  } else {
    db.prepare('INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, ?)').run(communityId, userId, 'member');
    return res.json({ joined: true });
  }
});

module.exports = router;
