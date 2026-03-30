const { User, UserSkill, Skill, ProficiencyLevel, Connection } = require('../db/index');

const EARTH_RADIUS_KM = 6371;

function haversine(lat1, lng1, lat2, lng2) {
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function discoverUsers(requestingUserId, skillName, lat, lng, radiusKm, proficiencyName) {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const err = new Error('Invalid coordinates');
    err.status = 400;
    throw err;
  }
  if (radiusKm <= 0) {
    const err = new Error('Invalid radius');
    err.status = 400;
    throw err;
  }

  const skill = await Skill.findOne({ name: skillName });
  if (!skill) {
    const err = new Error('Unknown skill category');
    err.status = 400;
    throw err;
  }

  let skillFilter = { skillId: skill._id };
  if (proficiencyName) {
    const prof = await ProficiencyLevel.findOne({ name: proficiencyName });
    if (prof) {
      skillFilter.proficiencyId = prof._id;
    }
  }

  const userSkills = await UserSkill.find(skillFilter).lean();
  const userIds = userSkills.map(us => us.userId);

  const candidates = await User.find({
    _id: { $in: userIds, $ne: requestingUserId },
    lat: { $exists: true, $ne: null },
    lng: { $exists: true, $ne: null }
  }).lean();

  const connections = await Connection.find({
    $or: [
      { requesterId: requestingUserId },
      { addresseeId: requestingUserId }
    ]
  }).lean();

  const results = await Promise.all(candidates.map(async (candidate) => {
    const theirSkills = await UserSkill.find({ userId: candidate._id })
      .populate({ path: 'skillId', select: 'name' })
      .populate({ path: 'proficiencyId', select: 'name' })
      .lean();

    const connection = connections.find(c =>
      (c.requesterId === candidate._id && c.addresseeId === requestingUserId) ||
      (c.requesterId === requestingUserId && c.addresseeId === candidate._id)
    );

    return {
      id: candidate._id,
      name: candidate.name,
      avatarUrl: candidate.avatarUrl,
      shortId: candidate.shortId,
      location: candidate.location,
      lat: candidate.lat,
      lng: candidate.lng,
      skills: theirSkills.map(s => ({
        id: s.skillId._id,
        name: s.skillId.name,
        level: s.level,
        yearsExp: s.yearsExp,
        proficiency: s.proficiencyId?.name
      })),
      connectionStatus: connection?.status,
      distanceKm: haversine(lat, lng, candidate.lat, candidate.lng)
    };
  }));

  return results
    .filter(c => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

async function getSuggestions(userId, limit = 20) {
  // Get connected users
  const connections = await Connection.find({
    $or: [{ requesterId: userId }, { addresseeId: userId }]
  }).lean();

  const connectedIds = connections.map(c =>
    c.requesterId === userId ? c.addresseeId : c.requesterId
  );

  const excluded = [userId, ...connectedIds];

  // Get all other users
  const candidates = await User.find({
    _id: { $nin: excluded }
  }).select('_id name avatarUrl shortId location').lean();

  if (!candidates.length) return [];

  // Get current user's accepted connections
  const myConnections = await Connection.find({
    $or: [{ requesterId: userId }, { addresseeId: userId }],
    status: 'accepted'
  }).lean();

  const myConnectionIds = myConnections.map(c =>
    c.requesterId === userId ? c.addresseeId : c.requesterId
  );

  // Get current user's skills
  const myUserSkills = await UserSkill.find({ userId: userId }).lean();
  const mySkillIds = myUserSkills.map(us => us.skillId.toString());

  const results = await Promise.all(candidates.map(async (candidate) => {
    // Get their accepted connections
    const theirConnections = await Connection.find({
      $or: [{ requesterId: candidate._id }, { addresseeId: candidate._id }],
      status: 'accepted'
    }).lean();

    const theirConnectionIds = theirConnections.map(c =>
      c.requesterId === candidate._id ? c.addresseeId : c.requesterId
    );

    const mutualIds = myConnectionIds.filter(id =>
      theirConnectionIds.includes(id)
    );

    const mutualCount = mutualIds.length;

    // Get their skills
    const theirUserSkills = await UserSkill.find({ userId: candidate._id }).lean();
    const theirSkillIds = theirUserSkills.map(us => us.skillId.toString());

    const sharedSkillCount = theirSkillIds.filter(id =>
      mySkillIds.includes(id)
    ).length;

    const allTheirSkills = await UserSkill.find({ userId: candidate._id })
      .populate({ path: 'skillId', select: 'name' }).lean();

    // Get mutual connection names
    const mutualNames = [];
    for (const mutualId of mutualIds.slice(0, 3)) {
      const mutualUser = await User.findById(mutualId).select('name').lean();
      if (mutualUser) mutualNames.push(mutualUser.name);
    }

    return {
      id: candidate._id,
      userId: candidate._id,
      shortId: candidate.shortId,
      name: candidate.name,
      avatarUrl: candidate.avatarUrl,
      location: candidate.location,
      skills: allTheirSkills.map(s => ({
        id: s.skillId._id,
        name: s.skillId.name,
        level: s.level
      })),
      mutualCount,
      mutualNames,
      sharedSkillCount,
      score: mutualCount * 3 + sharedSkillCount
    };
  }));

  return results
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

module.exports = { discoverUsers, getSuggestions };
