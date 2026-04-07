const { Event, EventRsvp, User } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const getVenues = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q?.trim()) return res.json([]);
    const searchTerm = q.trim();
    const distinctVenueNames = await Event.distinct('venueName', { venueName: { $regex: searchTerm, $options: 'i' }, status: 'active' });
    const venues = await Event.find({ venueName: { $in: distinctVenueNames } }).select('venueName venueCoords').limit(20).lean();
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
    res.status(500).json({ error: err.message });
  }
};

const listEvents = async (req, res) => {
  try {
    const userId = req.user.userId;
    const events = await Event.find({ status: 'active' }).populate('creatorId', 'name avatarUrl').sort({ datetime: 1 }).lean();
    const eventsWithRsvp = await Promise.all(events.map(async (event) => {
      const attendeeCount = await EventRsvp.countDocuments({ eventId: event._id, status: 'accepted' });
      const myRsvp = await EventRsvp.findOne({ eventId: event._id, userId }).select('status');
      return {
        ...event,
        creatorName: event.creatorId.name,
        creator_name: event.creatorId.name,
        creatorAvatar: event.creatorId.avatarUrl,
        creator_avatar: event.creatorId.avatarUrl,
        creator_id: event.creatorId._id,
        isCreator: event.creatorId._id.toString() === userId,
        is_creator: event.creatorId._id.toString() === userId,
        venue_name: event.venueName,
        venue_coords: event.venueCoords,
        attendeeCount,
        attendee_count: attendeeCount,
        myRsvpStatus: myRsvp?.status || null,
        my_rsvp_status: myRsvp?.status || null
      };
    }));
    res.json(eventsWithRsvp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const event = await Event.findById(req.params.id).populate('creatorId', 'name avatarUrl shortId').lean();
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    const myRsvp = await EventRsvp.findOne({ eventId: event._id, userId }).select('status');
    const attendeeRsvps = await EventRsvp.find({ eventId: event._id, status: 'accepted' }).populate('userId', 'id name avatarUrl shortId');
    const attendees = attendeeRsvps.map(r => ({ id: r.userId._id, name: r.userId.name, avatarUrl: r.userId.avatarUrl, shortId: r.userId.shortId }));
    
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
    
    if (event.creatorId._id.toString() === userId) {
      const pendingRsvps = await EventRsvp.find({ eventId: event._id, status: 'pending' }).populate('userId', 'id name avatarUrl');
      eventData.pendingRequests = pendingRsvps.map(r => ({ rsvpId: r._id, userId: r.userId._id, name: r.userId.name, avatarUrl: r.userId.avatarUrl, createdAt: r.createdAt }));
    }
    res.json(eventData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createEvent = async (req, res) => {
  try {
    const { title, datetime, guidelines, routePoints, venueName, venueCoords, communityId } = req.body;
    if (!title || !datetime) return res.status(400).json({ error: 'Title and Datetime are required' });
    const eventId = uuidv4();
    const newEvent = new Event({ _id: eventId, communityId: communityId || null, creatorId: req.user.userId, title, datetime, guidelines, routePoints, venueName, venueCoords });
    await newEvent.save();
    const event = await Event.findById(newEvent._id).populate('creatorId', 'name avatarUrl').lean();
    res.status(201).json({ ...event, creator_name: event.creatorId.name, creator_avatar: event.creatorId.avatarUrl, creator_id: event.creatorId._id, is_creator: true, attendee_count: 0, my_rsvp_status: 'accepted' });
    await new EventRsvp({ _id: uuidv4(), eventId, userId: req.user.userId, status: 'accepted' }).save();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const rsvpEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;
    const { rsvpName, rsvpPhone } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.creatorId.toString() === userId.toString()) {
      return res.status(403).json({ error: 'You are the organiser of this event' });
    }

    const existing = await EventRsvp.findOne({ eventId, userId });
    if (existing) {
      // Cancel RSVP
      await EventRsvp.deleteOne({ _id: existing._id });
      return res.json({ rsvpStatus: null });
    } else {
      if (!rsvpName?.trim() || !rsvpPhone?.trim()) {
        return res.status(400).json({ error: 'Name and mobile number are required to join' });
      }
      await new EventRsvp({ _id: uuidv4(), eventId, userId, status: 'pending', rsvpName: rsvpName.trim(), rsvpPhone: rsvpPhone.trim() }).save();
      return res.json({ rsvpStatus: 'pending' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const manageRsvp = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.creatorId.toString() !== req.user.userId) return res.status(403).json({ error: 'Only host can manage RSVPs' });
    const rsvp = await EventRsvp.findOne({ eventId: req.params.id, userId: req.params.targetUserId });
    if (!rsvp) return res.status(404).json({ error: 'RSVP not found' });
    await EventRsvp.findByIdAndUpdate(rsvp._id, { status });
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getVenues, listEvents, getEvent, createEvent, rsvpEvent, manageRsvp };
