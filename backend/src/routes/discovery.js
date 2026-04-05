const { paginate } = require('../utils/pagination');
const { discoverUsers, getSuggestions } = require('../services/discovery');
const { User, UserSkill, Skill, Connection, Event } = require('../config/db');

const router = express.Router();

/**
 * GET /discover/search?q=name&page=1&limit=10
 * Search users by name or short ID
 */
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = q.trim();

    // Check if query is a 5-digit alphanumeric code (Event search)
    if (searchTerm.length === 5 && /^[A-Z0-9]+$/i.test(searchTerm)) {
      const event = await Event.findOne({ shortCode: searchTerm.toUpperCase(), status: 'active' })
        .populate('creatorId', 'name avatarUrl shortId')
        .lean();
      
      if (event) {
        return res.json({
          type: 'event',
          event: {
            ...event,
            creator_name: event.creatorId?.name,
            creator_avatar: event.creatorId?.avatarUrl,
            short_code: event.shortCode
          }
        });
      }
    }
    
    // Find matching Skill IDs first
    const matchingSkills = await Skill.find({ 
      name: { $regex: searchTerm, $options: 'i' } 
    }).select('_id');
    const skillIds = matchingSkills.map(s => s._id);

    // Find User IDs from UserSkill matching subSkill or skillId
    const matchingUserSkills = await UserSkill.find({
      $or: [
        { subSkill: { $regex: searchTerm, $options: 'i' } },
        { skillId: { $in: skillIds } }
      ]
    }).select('userId');
    const skillUserIds = matchingUserSkills.map(us => us.userId);

    // Final Search Query on Users
    const query = {
      $and: [
        { _id: { $ne: req.user.userId } }, // Exclude self
        {
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { shortId: searchTerm },
            { _id: { $in: skillUserIds } }
          ]
        }
      ]
    };

    const result = await paginate(User, query, {
      page,
      limit,
      select: '_id name shortId avatarUrl bio location'
    });

    const users = result.docs;

    // Attach skills and connection status to the results
    const myConns = await Connection.find({
      $or: [{ requesterId: req.user.userId }, { addresseeId: req.user.userId }]
    }).lean();

    for (let u of users) {
      const userSkills = await UserSkill.find({ userId: u._id })
        .populate('skillId', 'name')
        .limit(5)
        .lean();
      
      u.skills = userSkills.map(us => ({
        skillName: us.skillId ? us.skillId.name : 'Unknown',
        subSkill: us.subSkill
      }));

      const conn = myConns.find(c => 
        (c.requesterId.toString() === u._id.toString() || c.addresseeId.toString() === u._id.toString())
      );
      u.connectionStatus = conn ? conn.status : 'none';
      u.connection_status = u.connectionStatus;
    }

    res.json({
      ...result,
      docs: users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /discover/suggestions?page=1&limit=20
 */
router.get('/suggestions', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const results = await getSuggestions(req.user.userId, limit, page);
    return res.status(200).json(results);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /discover?skill=running&lat=40.7&lng=-74.0&radius=10&proficiency=Beginner
 */
router.get('/', verifyToken, async (req, res) => {
  const { skill, lat, lng, radius, proficiency, subSkill, lookingFor, page = 1, limit = 10 } = req.query;
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusNum = parseFloat(radius) || 25;

  if (isNaN(latNum) || isNaN(lngNum)) {
    try {
      const results = await getSuggestions(req.user.userId, limit, page);
      return res.status(200).json(results);
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
  }

  try {
    const results = await discoverUsers(req.user.userId, skill, latNum, lngNum, radiusNum, proficiency, subSkill, lookingFor, limit, page);
    return res.status(200).json(results);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /discover/skills - list all available skill terms (including new admin skills)
router.get('/skills', verifyToken, async (req, res) => {
  try {
    const skills = await Skill.find().select('id name').sort({ name: 1 }).lean();
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
