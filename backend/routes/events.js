const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/auth');
const { Event, EventRsvp, User } = require('../db/index');

const router = express.Router();

// GET /events/venues/search?q=venueName — MUST be before /:id
router.get('/venues/search', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);

    const searchTerm = q.trim();
    const distinctVenueNames = await Event.distinct('venueName', {
      venueName: { $regex: searchTerm, $options: 'i' },
      status: 'active'
    });

    const venues = await Event.find({ venueName: { $in: distinctVenueNames } })
      .select('venueName venueCoords')
      .limit(20)
      .lean();

    const uniqueVenues = [];
    const seen = new Set();
    venues.forEach(v => {
      if (v.venueName && !seen.has(v.venueName)) {
        seen.add(v.venueName);
        uniqueVenues.push({ name: v.venueName, coords: v.venueCoords });
      }
    });

    res.json(uniqueVenues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /events - List all upcoming events
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const events = await Event.find({ status: 'active' })
      .populate({
        path: 'creatorId',
        select: 'name avatarUrl',
        model: User
      })
      .sort({ datetime: 1 })
      .lean();
    
    const eventsWithRsvp = await Promise.all(
      events.map(async (event) => {
        const attendeeCount = await EventRsvp.countDocuments({ 
          eventId: event._id, 
          status: 'accepted' 
        });
        const myRsvp = await EventRsvp.findOne({ 
          eventId: event._id, 
          userId 
        }).select('status');
        
        return {
          ...event,
          creatorName: event.creatorId.name,
          creator_name: event.creatorId.name,
          creatorAvatar: event.creatorId.avatarUrl,
          creator_avatar: event.creatorId.avatarUrl,
          isCreator: event.creatorId._id.toString() === userId,
          is_creator: event.creatorId._id.toString() === userId,
          venue_name: event.venueName,
          venue_coords: event.venueCoords,
          attendeeCount,
          attendee_count: attendeeCount,
          myRsvpStatus: myRsvp?.status || null,
          my_rsvp_status: myRsvp?.status || null
        };
      })
    );
    
    res.json(eventsWithRsvp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /events/:id - Get specific event details (and pending RSVPs if creator)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const event = await Event.findById(req.params.id)
      .populate({
        path: 'creatorId',
        select: 'name avatarUrl shortId',
        model: User
      })
      .lean();
    
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    // Get event's RSVP status for current user
    const myRsvp = await EventRsvp.findOne({ 
      eventId: event._id, 
      userId 
    }).select('status');
    
    // Get accepted attendees
    const attendeeRsvps = await EventRsvp.find({
      eventId: event._id,
      status: 'accepted'
    }).populate({
      path: 'userId',
      select: 'id name avatarUrl shortId',
      model: User
    });
    
    const attendees = attendeeRsvps.map(r => ({
      id: r.userId._id,
      name: r.userId.name,
      avatarUrl: r.userId.avatarUrl,
      shortId: r.userId.shortId
    }));
    
    const eventData = {
      ...event,
      creatorName: event.creatorId.name,
      creator_name: event.creatorId.name,
      creatorAvatar: event.creatorId.avatarUrl,
      creator_avatar: event.creatorId.avatarUrl,
      creatorShortId: event.creatorId.shortId,
      creator_short_id: event.creatorId.shortId,
      isCreator: event.creatorId._id.toString() === userId,
      is_creator: event.creatorId._id.toString() === userId,
      venue_name: event.venueName,
      venue_coords: event.venueCoords,
      myRsvpStatus: myRsvp?.status || null,
      my_rsvp_status: myRsvp?.status || null,
      attendees,
      attendees_list: attendees
    };
    
    // If the requester is the EVENT CREATOR, also fetch pending requests
    if (event.creatorId._id.toString() === userId) {
      const pendingRsvps = await EventRsvp.find({
        eventId: event._id,
        status: 'pending'
      }).populate({
        path: 'userId',
        select: 'id name avatarUrl',
        model: User
      });
      
      eventData.pendingRequests = pendingRsvps.map(r => ({
        rsvpId: r._id,
        userId: r.userId._id,
        name: r.userId.name,
        avatarUrl: r.userId.avatarUrl,
        createdAt: r.createdAt
      }));
    }
    
    res.json(eventData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /events - Create a new event Form/Notice
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, datetime, guidelines, routePoints, venueName, venueCoords, communityId } = req.body;
    if (!title || !datetime) {
      return res.status(400).json({ error: 'Title and Datetime are required' });
    }

    const eventId = uuidv4();
    
    const newEvent = new Event({
      _id: eventId,
      communityId: communityId || null,
      creatorId: req.user.userId,
      title,
      datetime,
      guidelines: guidelines || null,
      routePoints: Array.isArray(routePoints) ? routePoints : (routePoints ? [routePoints] : []),
      venueName: venueName || null,
      venueCoords: venueCoords || null
    });
    
    await newEvent.save();
    
    // Auto-accept the creator to their own event
    const creatorRsvp = new EventRsvp({
      _id: uuidv4(),
      eventId: eventId,
      userId: req.user.userId,
      status: 'accepted'
    });
    
    await creatorRsvp.save();

    const savedEvent = await Event.findById(eventId).lean();
    res.status(201).json(savedEvent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /events/:id/rsvp - Request to join event
router.post('/:id/rsvp', verifyToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;
    
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    // Creator cannot cancel their own event RSVP
    if (event.creatorId === userId) {
      return res.status(403).json({ error: 'Event creator cannot cancel their RSVP' });
    }
    
    // Check if RSVP exists
    const existing = await EventRsvp.findOne({ eventId, userId });
    
    if (existing) {
      if (existing.status === 'pending' || existing.status === 'accepted') {
        // User cancelling their RSVP request
        await EventRsvp.deleteOne({ _id: existing._id });
        return res.json({ rsvpStatus: null });
      } else {
        // Re-requesting after rejection
        await EventRsvp.findByIdAndUpdate(existing._id, { status: 'pending' });
        return res.json({ rsvpStatus: 'pending' });
      }
    } else {
      const newRsvp = new EventRsvp({
        _id: uuidv4(),
        eventId,
        userId,
        status: 'pending'
      });
      await newRsvp.save();
      return res.json({ rsvpStatus: 'pending' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /events/:id/rsvp/:targetUserId - Approve/Reject RSVP
router.put('/:id/rsvp/:targetUserId', verifyToken, async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.creatorId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only host can manage RSVPs' });
    }
    
    const rsvp = await EventRsvp.findOne({ 
      eventId, 
      userId: req.params.targetUserId 
    });
    if (!rsvp) return res.status(404).json({ error: 'RSVP not found' });
    
    await EventRsvp.findByIdAndUpdate(rsvp._id, { status });
    res.json({ success: true, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
