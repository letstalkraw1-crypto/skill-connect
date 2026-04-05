const { User, UserSkill, Skill, ProficiencyLevel, Connection } = require('../config/db');

const EARTH_RADIUS_KM = 6371;

function haversine(lat1, lng1, lat2, lng2) {
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function discoverUsers(requestingUserId, skillName, lat, lng, radiusKm, proficiencyName, subSkill, lookingFor, limit = 10, page = 1) {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  // ... coordinates validation ...
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const err = new Error('Invalid coordinates'); err.status = 400; throw err;
  }
  
  // ... skill lookup ...
  const skill = await Skill.findOne({ name: skillName });
  if (!skill) {
    const err = new Error('Unknown skill category'); err.status = 400; throw err;
  }

  let skillFilter = { skillId: skill._id };
  if (proficiencyName) {
    const prof = await ProficiencyLevel.findOne({ name: proficiencyName });
    if (prof) skillFilter.proficiencyId = prof._id;
  }
  if (subSkill) skillFilter.subSkill = subSkill;

  const userSkills = await UserSkill.find(skillFilter).lean();
  const userIds = userSkills.map(us => us.userId);

  const candidates = await User.find({
    _id: { $in: userIds, $ne: requestingUserId },
    lat: { $exists: true, $ne: null },
    lng: { $exists: true, $ne: null },
    ...(lookingFor ? { lookingFor } : {})
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
      (c.requesterId === candidate._id.toString() && c.addresseeId === requestingUserId.toString()) ||
      (c.requesterId === requestingUserId.toString() && c.addresseeId === candidate._id.toString())
    );

    const status = connection?.status || 'none';

    return {
      id: candidate._id,
      name: candidate.name,
      avatarUrl: candidate.avatarUrl,
      avatar_url: candidate.avatarUrl,
      shortId: candidate.shortId,
      short_id: candidate.shortId,
      location: candidate.location,
      lat: candidate.lat,
      lng: candidate.lng,
      lookingFor: candidate.lookingFor,
      skills: theirSkills.map(s => ({
        id: s.skillId._id,
        name: s.skillId.name,
        subSkill: s.subSkill,
        sub_skill: s.subSkill,
        level: s.level,
        yearsExp: s.yearsExp,
        years_exp: s.yearsExp,
        proficiency: s.proficiencyId?.name
      })),
      connectionStatus: status,
      connection_status: status,
      distanceKm: haversine(lat, lng, candidate.lat, candidate.lng),
      distance_km: haversine(lat, lng, candidate.lat, candidate.lng)
    };
  }));

  const filtered = results.filter(c => c.distanceKm <= radiusKm).sort((a, b) => a.distanceKm - b.distanceKm);
  const totalDocs = filtered.length;
  const skip = (pageNum - 1) * limitNum;
  const docs = filtered.slice(skip, skip + limitNum);

  return {
    docs,
    totalDocs,
    limit: limitNum,
    page: pageNum,
    totalPages: Math.ceil(totalDocs / limitNum)
  };
}

async function getSuggestions(userId, limit = 20, page = 1) {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;

  const connections = await Connection.find({
    $or: [{ requesterId: userId }, { addresseeId: userId }]
  }).lean();

  const connectedIds = connections
    .filter(c => c.status === 'accepted' || c.status === 'blocked')
    .map(c => c.requesterId === userId ? c.addresseeId : c.requesterId);

  const excluded = [userId, ...connectedIds];

  const candidates = await User.find({
    _id: { $nin: excluded }
  }).select('_id name avatarUrl shortId location').limit(100).lean(); // Increase window for ranking

  if (!candidates.length) return { docs: [], totalDocs: 0, limit: limitNum, page: pageNum, totalPages: 0 };

  const myAcceptedConns = connections.filter(c => c.status === 'accepted');
  const myConnectionIds = myAcceptedConns.map(c =>
    c.requesterId === userId ? c.addresseeId : c.requesterId
  );

  const myUserSkills = await UserSkill.find({ userId }).lean();
  const mySkillIds = myUserSkills.map(us => us.skillId.toString());

  const candidateIds = candidates.map(c => c._id);

  const [allTheirConns, allTheirSkills] = await Promise.all([
    Connection.find({
      $or: [{ requesterId: { $in: candidateIds } }, { addresseeId: { $in: candidateIds } }],
      status: 'accepted'
    }).lean(),
    UserSkill.find({ userId: { $in: candidateIds } })
      .populate({ path: 'skillId', select: 'name' }).lean()
  ]);

  const results = candidates.map(candidate => {
    const theirConns = allTheirConns.filter(c =>
      c.requesterId.toString() === candidate._id.toString() || c.addresseeId.toString() === candidate._id.toString()
    );
    const theirConnIds = theirConns.map(c =>
      c.requesterId.toString() === candidate._id.toString() ? c.addresseeId : c.requesterId
    );

    const mutualIds = myConnectionIds.filter(id => theirConnIds.includes(id));
    const mutualCount = mutualIds.length;

    const theirSkills = allTheirSkills.filter(s => s.userId.toString() === candidate._id.toString());
    const sharedSkillCount = theirSkills.filter(s =>
      mySkillIds.includes(s.skillId?._id?.toString() || s.skillId?.toString())
    ).length;

    const connection = connections.find(c => 
      c.requesterId.toString() === candidate._id.toString() || c.addresseeId.toString() === candidate._id.toString()
    );

    return {
      id: candidate._id,
      userId: candidate._id,
      shortId: candidate.shortId,
      short_id: candidate.shortId,
      name: candidate.name,
      avatarUrl: candidate.avatarUrl,
      avatar_url: candidate.avatarUrl,
      location: candidate.location,
      lookingFor: candidate.lookingFor,
      skills: theirSkills.map(s => ({
        id: s.skillId?._id,
        name: s.skillId?.name,
        subSkill: s.subSkill,
        sub_skill: s.subSkill,
        level: s.level
      })),
      mutualCount,
      mutual_connections: mutualCount,
      sharedSkillCount,
      shared_skill_count: sharedSkillCount,
      connectionStatus: connection?.status || 'none',
      connection_status: connection?.status || 'none',
      score: mutualCount * 3 + sharedSkillCount
    };
  });

  const sorted = results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const totalDocs = sorted.length;
  const skip = (pageNum - 1) * limitNum;
  const docs = sorted.slice(skip, skip + limitNum);

  return {
    docs,
    totalDocs,
    limit: limitNum,
    page: pageNum,
    totalPages: Math.ceil(totalDocs / limitNum)
  };
}

module.exports = { discoverUsers, getSuggestions };
