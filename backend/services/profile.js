const { User, UserSkill, Skill, ProficiencyLevel, SkillEndorsement, SkillVerification, Connection } = require('../db/index');

async function getProfile(userId) {
  const user = await User.findById(userId).lean();

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const userSkills = await UserSkill.find({ userId }).lean();
  
  const skills = await Promise.all(
    userSkills.map(async (us) => {
      const skill = await Skill.findById(us.skillId).lean();
      const proficiency = us.proficiencyId ? await ProficiencyLevel.findById(us.proficiencyId).lean() : null;
      const endorsementCount = await SkillEndorsement.countDocuments({ endorseeId: userId, skillId: us.skillId });
      const verifiedCount = await SkillVerification.countDocuments({ userId, skillId: us.skillId, status: 'verified' });

      return {
        skillId: skill?._id,
        name: skill?.name,
        subSkill: us.subSkill || null,
        level: us.level,
        yearsExp: us.yearsExp,
        proficiency: proficiency?.name,
        endorsementCount,
        verifiedCount
      };
    })
  );

  const connectionCount = await Connection.countDocuments({
    $or: [{ requesterId: userId }, { addresseeId: userId }],
    status: 'accepted'
  });

  return { 
    ...user, 
    skills, 
    connectionCount 
  };
}

async function updateProfile(userId, { bio, location, avatarUrl, name, stravaId, garminId, instagramId, githubId, portfolioUrl, allowTagging, theme, accountType, lookingFor } = {}) {
  const updateData = {};

  if (name !== undefined && name.trim()) updateData.name = name.trim();
  if (bio !== undefined) updateData.bio = bio;
  if (location !== undefined) updateData.location = location;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
  if (stravaId !== undefined) updateData.stravaId = stravaId;
  if (garminId !== undefined) updateData.garminId = garminId;
  if (instagramId !== undefined) updateData.instagramId = instagramId;
  if (githubId !== undefined) updateData.githubId = githubId;
  if (portfolioUrl !== undefined) updateData.portfolioUrl = portfolioUrl;
  if (allowTagging !== undefined) updateData.allowTagging = allowTagging;
  if (theme !== undefined) updateData.theme = theme;
  if (accountType !== undefined) updateData.accountType = accountType;
  if (lookingFor !== undefined) updateData.lookingFor = lookingFor;

  if (Object.keys(updateData).length === 0) {
    return getProfile(userId);
  }

  await User.findByIdAndUpdate(userId, updateData, { new: true });
  return getProfile(userId);
}

async function addSkills(userId, skills) {
  for (const skill of skills) {
    const skillDoc = await Skill.findOne({ name: skill.name });
    if (!skillDoc) {
      const err = new Error(`Unknown skill: ${skill.name}`);
      err.status = 400;
      throw err;
    }

    let proficiencyId = null;
    if (skill.proficiency) {
      const profDoc = await ProficiencyLevel.findOne({ name: skill.proficiency });
      if (profDoc) proficiencyId = profDoc._id;
    }

    try {
      const userSkill = new UserSkill({
        userId,
        skillId: skillDoc._id,
        level: skill.level || null,
        yearsExp: skill.yearsExp || null,
        proficiencyId
      });
      await userSkill.save();
    } catch (e) {
      if (e.code === 11000) {
        const err = new Error(`Skill already added: ${skill.name}`);
        err.status = 409;
        throw err;
      }
      throw e;
    }
  }
  return getProfile(userId);
}

async function deleteSkill(userId, skillId) {
  await UserSkill.deleteOne({ userId, skillId });
  return { ok: true };
}

module.exports = { getProfile, updateProfile, addSkills, deleteSkill };

