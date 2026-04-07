const discoveryService = require('../services/discovery');
const { User, UserSkill, Skill, Connection, Event } = require('../config/db');
const { getCache, setCache } = require('../utils/cache');

const search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = q.trim();

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
    
    const matchingSkills = await Skill.find({ name: { $regex: searchTerm, $options: 'i' } }).select('_id');
    const skillIds = matchingSkills.map(s => s._id);

    const matchingUserSkills = await UserSkill.find({
      $or: [
        { subSkill: { $regex: searchTerm, $options: 'i' } },
        { skillId: { $in: skillIds } }
      ]
    }).select('userId');
    const skillUserIds = matchingUserSkills.map(us => us.userId);

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.userId } },
        {
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { shortId: searchTerm },
            { _id: { $in: skillUserIds } }
          ]
        }
      ]
    })
    .select('_id name shortId avatarUrl bio location')
    .limit(30)
    .lean();

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

      const conn = myConns.find(c => (c.requesterId === u._id.toString() || c.addresseeId === u._id.toString()));
      u.connectionStatus = conn ? conn.status : 'none';
      u.connection_status = u.connectionStatus;
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getSuggestions = async (req, res) => {
  try {
    // No cache — always fresh so connection status is accurate
    const results = await discoveryService.getSuggestions(req.user.userId);
    return res.status(200).json(results);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

const discover = async (req, res) => {
  const { skill, lat, lng, radius, proficiency, subSkill, lookingFor } = req.query;
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusNum = parseFloat(radius) || 25;

  if (isNaN(latNum) || isNaN(lngNum)) {
    return getSuggestions(req, res);
  }

  try {
    const cacheKey = `discover:${req.user.userId}:${skill}:${latNum}:${lngNum}:${radiusNum}:${proficiency || 'any'}:${subSkill || 'any'}:${lookingFor || 'any'}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    const results = await discoveryService.discoverUsers(req.user.userId, skill, latNum, lngNum, radiusNum, proficiency, subSkill, lookingFor);
    await setCache(cacheKey, results, 300); // 5 mins
    return res.status(200).json(results);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

const getSkills = async (req, res) => {
  try {
    const skills = await Skill.find().select('id name').sort({ name: 1 }).lean();
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { search, getSuggestions, discover, getSkills };
