const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/index');

const router = express.Router();

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /admin/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) return res.json({ token: process.env.ADMIN_PASSWORD });
  return res.status(401).json({ error: 'Invalid admin password' });
});

// GET /admin/users
router.get('/users', adminAuth, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.short_id, u.name, u.email, u.phone, u.location, u.bio,
           u.avatar_url, u.strava_id, u.garmin_id, u.instagram_id, u.created_at,
           COUNT(DISTINCT us.skill_id) as skill_count,
           COUNT(DISTINCT c.id) as connection_count
    FROM users u
    LEFT JOIN user_skills us ON us.user_id = u.id
    LEFT JOIN connections c ON (c.requester_id = u.id OR c.addressee_id = u.id) AND c.status = 'accepted'
    GROUP BY u.id ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

// GET /admin/users/:id
router.get('/users/:id', adminAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, short_id, name, email, phone, location, bio, avatar_url, strava_id, garmin_id, instagram_id, created_at FROM users WHERE id = ?'
  ).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const skills = db.prepare(
    `SELECT s.id, s.name, us.level, us.years_exp FROM user_skills us
     JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ?`
  ).all(req.params.id);

  const connections = db.prepare(
    `SELECT c.*, r.name as requester_name, a.name as addressee_name
     FROM connections c
     JOIN users r ON r.id = c.requester_id
     JOIN users a ON a.id = c.addressee_id
     WHERE c.requester_id = ? OR c.addressee_id = ?`
  ).all(req.params.id, req.params.id);

  res.json({ ...user, skills, connections });
});

// PUT /admin/users/:id
router.put('/users/:id', adminAuth, async (req, res) => {
  const { name, email, phone, location, bio, password, strava_id, garmin_id, instagram_id } = req.body;
  const updates = []; const values = [];

  if (name) { updates.push('name = ?'); values.push(name); }
  if (email) { updates.push('email = ?'); values.push(email); }
  if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
  if (location !== undefined) { updates.push('location = ?'); values.push(location); }
  if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
  if (strava_id !== undefined) { updates.push('strava_id = ?'); values.push(strava_id); }
  if (garmin_id !== undefined) { updates.push('garmin_id = ?'); values.push(garmin_id); }
  if (instagram_id !== undefined) { updates.push('instagram_id = ?'); values.push(instagram_id); }
  if (password) { updates.push('password = ?'); values.push(await bcrypt.hash(password, 10)); }

  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const updated = db.prepare('SELECT id, name, email, phone, location, bio, strava_id, garmin_id, instagram_id FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /admin/users/:id
router.delete('/users/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// GET /admin/stats
router.get('/stats', adminAuth, (req, res) => {
  res.json({
    totalUsers: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    totalConnections: db.prepare("SELECT COUNT(*) as c FROM connections WHERE status='accepted'").get().c,
    totalMessages: db.prepare('SELECT COUNT(*) as c FROM messages').get().c,
    totalConversations: db.prepare('SELECT COUNT(*) as c FROM conversations').get().c,
    skillBreakdown: db.prepare(
      `SELECT s.id, s.name, COUNT(us.user_id) as count FROM skills s
       LEFT JOIN user_skills us ON us.skill_id = s.id
       GROUP BY s.id ORDER BY count DESC`
    ).all(),
    recentUsers: db.prepare('SELECT id, name, email, avatar_url, created_at FROM users ORDER BY created_at DESC LIMIT 5').all(),
  });
});

// GET /admin/skills/:skillId/users — who chose this skill
router.get('/skills/:skillId/users', adminAuth, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_url, u.location, us.level, us.years_exp
    FROM user_skills us JOIN users u ON u.id = us.user_id
    WHERE us.skill_id = ?
  `).all(req.params.skillId);
  res.json(users);
});

// POST /admin/skills — add new skill
router.post('/skills', adminAuth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Skill name required' });
  try {
    db.prepare('INSERT INTO skills (name) VALUES (?)').run(name.toLowerCase().trim());
    res.json({ ok: true, name: name.toLowerCase().trim() });
  } catch (e) {
    res.status(409).json({ error: 'Skill already exists' });
  }
});

// DELETE /admin/skills/:id — remove skill
router.delete('/skills/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// GET /admin/events
router.get('/events', adminAuth, (req, res) => {
  const events = db.prepare(`
    SELECT e.*, c.name as community_name, u.name as creator_name
    FROM events e
    LEFT JOIN communities c ON c.id = e.community_id
    JOIN users u ON u.id = e.creator_id
    ORDER BY e.created_at DESC
  `).all();
  res.json(events);
});

// PUT /admin/events/:id
router.put('/events/:id', adminAuth, (req, res) => {
  const { title, datetime, guidelines, venue_name } = req.body;
  db.prepare(`
    UPDATE events 
    SET title = COALESCE(?, title),
        datetime = COALESCE(?, datetime),
        guidelines = COALESCE(?, guidelines),
        venue_name = COALESCE(?, venue_name)
    WHERE id = ?
  `).run(title, datetime, guidelines, venue_name, req.params.id);
  res.json({ success: true });
});

// DELETE /admin/events/:id
router.delete('/events/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
