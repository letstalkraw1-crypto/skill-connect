const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');
const db = require('../db/index');

const router = express.Router();

// GET /events - List all upcoming events
router.get('/', verifyToken, (req, res) => {
  const userId = req.user.userId;
  
  // We list all active events. We also check if the current user has a pending/accepted RSVP
  const events = db.prepare(`
    SELECT e.*, u.name as creator_name, u.avatar_url as creator_avatar,
      (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'accepted') as attendee_count,
      (SELECT status FROM event_rsvps WHERE event_id = e.id AND user_id = ?) as my_rsvp_status
    FROM events e
    JOIN users u ON u.id = e.creator_id
    WHERE e.status = 'active'
    ORDER BY e.datetime ASC
  `).all(userId);
  
  res.json(events);
});

// GET /events/:id - Get specific event details (and pending RSVPs if creator)
router.get('/:id', verifyToken, (req, res) => {
  const userId = req.user.userId;
  
  const event = db.prepare(`
    SELECT e.*, u.name as creator_name, u.avatar_url as creator_avatar, u.short_id as creator_short_id,
      (SELECT status FROM event_rsvps WHERE event_id = e.id AND user_id = ?) as my_rsvp_status
    FROM events e
    JOIN users u ON u.id = e.creator_id
    WHERE e.id = ?
  `).get(userId, req.params.id);
  
  if (!event) return res.status(404).json({ error: 'Event not found' });
  
  // Get accepted attendees
  event.attendees = db.prepare(`
    SELECT u.id, u.name, u.avatar_url, u.short_id
    FROM event_rsvps r JOIN users u ON u.id = r.user_id
    WHERE r.event_id = ? AND r.status = 'accepted'
  `).all(event.id);
  
  // If the requester is the EVENT CREATOR, also fetch pending requests
  if (event.creator_id === userId) {
    event.pending_requests = db.prepare(`
      SELECT r.id as rsvp_id, u.id as user_id, u.name, u.avatar_url, r.created_at
      FROM event_rsvps r JOIN users u ON u.id = r.user_id
      WHERE r.event_id = ? AND r.status = 'pending'
    `).all(event.id);
  }
  
  res.json(event);
});

// POST /events - Create a new event Form/Notice
router.post('/', verifyToken, (req, res) => {
  const { title, datetime, guidelines, route_points, venue_name, venue_coords, community_id } = req.body;
  if (!title || !datetime) return res.status(400).json({ error: 'Title and Datetime are required' });

  const id = uuidv4();
  const routePointsStr = Array.isArray(route_points) ? JSON.stringify(route_points) : (route_points || '[]');
  const venueCoordsStr = venue_coords ? JSON.stringify(venue_coords) : null;
  
  db.prepare('INSERT INTO events (id, community_id, creator_id, title, datetime, guidelines, route_points, venue_name, venue_coords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, community_id || null, req.user.userId, title, datetime, guidelines || null, routePointsStr, venue_name || null, venueCoordsStr);
    
  // Auto-accept the creator to their own event
  db.prepare('INSERT INTO event_rsvps (id, event_id, user_id, status) VALUES (?, ?, ?, ?)').run(uuidv4(), id, req.user.userId, 'accepted');

  const newEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  res.status(201).json(newEvent);
});

// POST /events/:id/rsvp - Request to join event
router.post('/:id/rsvp', verifyToken, (req, res) => {
  const eventId = req.params.id;
  const userId = req.user.userId;
  
  const event = db.prepare('SELECT id, creator_id FROM events WHERE id = ?').get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  
  // Check if RSVP exists
  const existing = db.prepare('SELECT id, status FROM event_rsvps WHERE event_id = ? AND user_id = ?').get(eventId, userId);
  
  if (existing) {
    if (existing.status === 'pending' || existing.status === 'accepted') {
      // User cancelling their RSVP request
      db.prepare('DELETE FROM event_rsvps WHERE id = ?').run(existing.id);
      return res.json({ rsvp_status: null });
    } else {
      // Re-requesting after rejection
      db.prepare('UPDATE event_rsvps SET status = ? WHERE id = ?').run('pending', existing.id);
      return res.json({ rsvp_status: 'pending' });
    }
  } else {
    db.prepare('INSERT INTO event_rsvps (id, event_id, user_id, status) VALUES (?, ?, ?, ?)').run(uuidv4(), eventId, userId, 'pending');
    return res.json({ rsvp_status: 'pending' });
  }
});

// PUT /events/:id/rsvp/:userId - Approve/Reject RSVP
router.put('/:id/rsvp/:targetUserId', verifyToken, (req, res) => {
  const { status } = req.body; // 'accepted' or 'rejected'
  if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const eventId = req.params.id;
  const event = db.prepare('SELECT creator_id FROM events WHERE id = ?').get(eventId);
  
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.creator_id !== req.user.userId) return res.status(403).json({ error: 'Only host can manage RSVPs' });
  
  const rsvp = db.prepare('SELECT id FROM event_rsvps WHERE event_id = ? AND user_id = ?').get(eventId, req.params.targetUserId);
  if (!rsvp) return res.status(404).json({ error: 'RSVP not found' });
  
  db.prepare('UPDATE event_rsvps SET status = ? WHERE id = ?').run(status, rsvp.id);
  res.json({ success: true, status });
});

module.exports = router;
