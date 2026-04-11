/**
 * OAuth Service
 * 
 * Business logic for OAuth operations including URL generation,
 * token exchange, profile fetching, user linking, and skill verification.
 */

const axios = require('axios');
const { URLSearchParams } = require('url');
const { User } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { getCallbackUrl } = require('./oauthProviderRegistry');

/**
 * Generate OAuth authorization URL
 * @param {import('../types/oauth').OAuthProvider} provider - Provider configuration
 * @param {string} stateToken - CSRF state token
 * @param {string} codeChallenge - PKCE code challenge
 * @returns {string} Authorization URL
 */
function generateAuthUrl(provider, stateToken, codeChallenge) {
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: getCallbackUrl(provider.name),
    response_type: 'code',
    scope: provider.scope.join(' '),
    state: stateToken,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  return `${provider.authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param {import('../types/oauth').OAuthProvider} provider - Provider configuration
 * @param {string} code - Authorization code
 * @param {string} codeVerifier - PKCE code verifier
 * @returns {Promise<import('../types/oauth').OAuthTokenResponse>} Token response
 */
async function exchangeCodeForToken(provider, code, codeVerifier) {
  try {
    const params = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: getCallbackUrl(provider.name),
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code_verifier: codeVerifier
    };

    const response = await axios.post(provider.tokenUrl, params, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    if (response.data.error) {
      throw new Error(`Token exchange failed: ${response.data.error_description || response.data.error}`);
    }

    return response.data;
  } catch (err) {
    console.error('[OAuth] Token exchange error:', err.message);
    throw new Error(`Failed to exchange authorization code for token: ${err.message}`, { cause: err });
  }
}

/**
 * Fetch user profile from OAuth provider
 * @param {import('../types/oauth').OAuthProvider} provider - Provider configuration
 * @param {string} accessToken - Access token
 * @returns {Promise<import('../types/oauth').OAuthUserProfile>} Normalized user profile
 */
async function fetchUserProfile(provider, accessToken) {
  try {
    const response = await axios.get(provider.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    // Normalize profile based on provider
    return normalizeProfile(response.data, provider.name);
  } catch (err) {
    console.error('[OAuth] Profile fetch error:', err.message);
    throw new Error(`Failed to fetch user profile: ${err.message}`, { cause: err });
  }
}

/**
 * Normalize user profile from different providers
 * @param {any} rawProfile - Raw profile data from provider
 * @param {string} providerName - Provider name
 * @returns {import('../types/oauth').OAuthUserProfile} Normalized profile
 */
function normalizeProfile(rawProfile, providerName) {
  switch (providerName) {
    case 'github':
      return {
        providerId: rawProfile.id.toString(),
        email: rawProfile.email,
        name: rawProfile.name || rawProfile.login,
        username: rawProfile.login,
        avatarUrl: rawProfile.avatar_url,
        emailVerified: true // GitHub emails are verified
      };
    
    case 'google':
      return {
        providerId: rawProfile.id,
        email: rawProfile.email,
        name: rawProfile.name,
        avatarUrl: rawProfile.picture,
        emailVerified: rawProfile.verified_email || false
      };
    
    case 'microsoft':
      return {
        providerId: rawProfile.id,
        email: rawProfile.mail || rawProfile.userPrincipalName,
        name: rawProfile.displayName,
        avatarUrl: null, // Microsoft Graph doesn't provide avatar in basic profile
        emailVerified: true // Microsoft emails are verified
      };
    
    case 'strava':
      return {
        providerId: rawProfile.id.toString(),
        email: rawProfile.email || `${rawProfile.id}@strava.local`,
        name: `${rawProfile.firstname} ${rawProfile.lastname}`.trim(),
        username: rawProfile.username,
        avatarUrl: rawProfile.profile,
        emailVerified: false // Strava doesn't always provide email
      };
    
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

/**
 * Find or create user based on OAuth profile
 * @param {import('../types/oauth').OAuthUserProfile} profile - Normalized user profile
 * @param {string} providerName - Provider name
 * @param {string} [linkToUserId] - Optional user ID to link account to
 * @returns {Promise<any>} User object
 */
async function findOrCreateUser(profile, providerName, linkToUserId = null) {
  const providerField = `${providerName}Id`;
  
  // Step 1: If linking to existing user
  if (linkToUserId) {
    const user = await User.findById(linkToUserId);
    if (!user) {
      throw new Error('User not found for account linking');
    }
    
    // Check if provider already linked
    if (user[providerField]) {
      throw new Error(`${providerName} account already linked to this user`);
    }
    
    // Link provider
    user[providerField] = profile.providerId;
    if (!user.avatarUrl && profile.avatarUrl) {
      user.avatarUrl = profile.avatarUrl;
    }
    user.isEmailVerified = true;
    
    await user.save();
    return user;
  }
  
  // Step 2: Check if user exists with this provider ID
  const query = { [providerField]: profile.providerId };
  let user = await User.findOne(query);
  
  if (user) {
    return user;
  }
  
  // Step 3: Check if user exists with this email
  if (profile.email) {
    user = await User.findOne({ email: profile.email.toLowerCase() });
    
    if (user) {
      // Link OAuth account to existing user
      user[providerField] = profile.providerId;
      if (!user.avatarUrl && profile.avatarUrl) {
        user.avatarUrl = profile.avatarUrl;
      }
      user.isEmailVerified = true;
      
      await user.save();
      return user;
    }
  }
  
  // Step 4: Create new user
  const userId = uuidv4();
  const shortId = await generateShortId();
  
  const newUser = new User({
    _id: userId,
    shortId,
    name: profile.name,
    email: profile.email ? profile.email.toLowerCase() : undefined,
    avatarUrl: profile.avatarUrl,
    [providerField]: profile.providerId,
    isEmailVerified: profile.emailVerified,
    onboardingComplete: false,
    createdAt: new Date()
  });
  
  await newUser.save();
  return newUser;
}

/**
 * Generate unique 8-digit short ID
 * @returns {Promise<string>} Unique short ID
 */
async function generateShortId() {
  let id;
  let exists = true;
  while (exists) {
    id = Math.floor(10000000 + Math.random() * 90000000).toString();
    const user = await User.findOne({ shortId: id });
    exists = !!user;
  }
  return id;
}

/**
 * Verify GitHub skills based on profile data
 * @param {string} userId - User ID
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<void>}
 */
async function verifyGitHubSkills(userId, accessToken) {
  try {
    // Fetch GitHub user data
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    const { public_repos, followers, login } = response.data;

    // Update user with GitHub username
    await User.findByIdAndUpdate(userId, { githubId: login });

    // Verify "Coding" skill if user has > 5 public repos
    if (public_repos > 5) {
      const { SkillVerification } = require('../config/db');
      
      await SkillVerification.findOneAndUpdate(
        { userId, skillName: 'Coding' },
        {
          userId,
          skillName: 'Coding',
          verificationType: 'github',
          status: 'verified',
          verifiedAt: new Date(),
          metadata: {
            publicRepos: public_repos,
            followers,
            username: login
          }
        },
        { upsert: true, new: true }
      );

      console.log(`[OAuth] Verified Coding skill for user ${userId} (${public_repos} repos)`);
    }
  } catch (err) {
    console.error('[OAuth] GitHub skill verification error:', err.message);
    // Don't throw - skill verification is optional
  }
}

/**
 * Verify Strava skills based on athlete data
 * @param {string} userId - User ID
 * @param {string} accessToken - Strava access token
 * @returns {Promise<void>}
 */
async function verifyStravaSkills(userId, accessToken) {
  try {
    // Fetch Strava athlete stats
    const response = await axios.get('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    const athlete = response.data;

    // Verify "Running" skill based on activity
    // This is a simplified example - you might want more sophisticated logic
    const { SkillVerification } = require('../config/db');
    
    await SkillVerification.findOneAndUpdate(
      { userId, skillName: 'Running' },
      {
        userId,
        skillName: 'Running',
        verificationType: 'strava',
        status: 'verified',
        verifiedAt: new Date(),
        metadata: {
          athleteId: athlete.id,
          username: athlete.username
        }
      },
      { upsert: true, new: true }
    );

    console.log(`[OAuth] Verified Running skill for user ${userId}`);
  } catch (err) {
    console.error('[OAuth] Strava skill verification error:', err.message);
    // Don't throw - skill verification is optional
  }
}

/**
 * Unlink OAuth provider from user account
 * @param {string} userId - User ID
 * @param {string} providerName - Provider name
 * @returns {Promise<Object>} Result object
 */
async function unlinkOAuthAccount(userId, providerName) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const providerField = `${providerName}Id`;
  
  // Check if provider is linked
  if (!user[providerField]) {
    const err = new Error(`${providerName} account is not linked`);
    err.status = 400;
    throw err;
  }

  // Check if user has at least one other authentication method
  const hasPassword = !!user.password;
  const hasPhone = !!user.phone;
  const hasOtherOAuth = ['googleId', 'githubId', 'microsoftId', 'stravaId']
    .filter(field => field !== providerField)
    .some(field => !!user[field]);

  if (!hasPassword && !hasPhone && !hasOtherOAuth) {
    const err = new Error('Cannot unlink last authentication method');
    err.status = 400;
    throw err;
  }

  // Unlink provider
  user[providerField] = undefined;
  await user.save();

  return {
    message: `${providerName} account unlinked successfully`,
    user: user.toObject()
  };
}

/**
 * Verify a specific skill based on OAuth provider data
 * @param {string} userId - User ID
 * @param {string} skillId - Skill ID to verify (UserSkill ID)
 * @param {string} skillName - Skill name
 * @param {string} providerName - Provider name (github, strava, etc.)
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<{verified: boolean, message?: string}>} Verification result
 */
async function verifySkill(userId, skillId, skillName, providerName, accessToken) {
  try {
    const { SkillVerification, UserSkill, Skill } = require('../config/db');
    
    let verified = false;
    let message = '';
    let metadata = {};

    // Provider-specific verification logic
    if (providerName === 'github') {
      // Fetch GitHub user data
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      const { public_repos, followers, login } = response.data;
      metadata = { publicRepos: public_repos, followers, username: login };

      // Verify based on skill name
      if (skillName.toLowerCase().includes('coding') || skillName.toLowerCase().includes('programming')) {
        if (public_repos > 5) {
          verified = true;
        } else {
          message = `Verification criteria not met: Need more than 5 public repositories (found ${public_repos})`;
        }
      } else {
        message = `Skill "${skillName}" cannot be verified via GitHub`;
      }
    } else if (providerName === 'strava') {
      // Fetch Strava athlete data
      const response = await axios.get('https://www.strava.com/api/v3/athlete', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      const athlete = response.data;
      metadata = { athleteId: athlete.id, username: athlete.username };

      // Verify based on skill name
      if (skillName.toLowerCase().includes('running') || skillName.toLowerCase().includes('cycling') || skillName.toLowerCase().includes('fitness')) {
        verified = true;
      } else {
        message = `Skill "${skillName}" cannot be verified via Strava`;
      }
    } else {
      message = `Provider "${providerName}" is not supported for skill verification`;
    }

    // Update skill verification status
    if (verified) {
      // Find the skill by name
      const skill = await Skill.findOne({ name: skillName });
      if (!skill) {
        return { verified: false, message: `Skill "${skillName}" not found in database` };
      }

      // Create/update SkillVerification record
      const skillVerification = await SkillVerification.findOneAndUpdate(
        { userId, skillId: skill._id },
        {
          userId,
          skillId: skill._id,
          skillName,
          verificationType: providerName,
          status: 'verified',
          verifiedAt: new Date(),
          metadata
        },
        { upsert: true, new: true }
      );

      // Update UserSkill verification status
      // Find UserSkill by userId and skillId (not the userSkillId passed in)
      await UserSkill.updateMany(
        { userId, skillId: skill._id },
        {
          verificationStatus: 'verified',
          verificationId: skillVerification._id
        }
      );

      console.log(`[OAuth] Verified skill "${skillName}" for user ${userId} via ${providerName}`);
    }

    return { verified, message };
  } catch (err) {
    console.error('[OAuth] Skill verification error:', err.message);
    return { verified: false, message: `Verification failed: ${err.message}` };
  }
}

module.exports = {
  generateAuthUrl,
  exchangeCodeForToken,
  fetchUserProfile,
  normalizeProfile,
  findOrCreateUser,
  verifyGitHubSkills,
  verifyStravaSkills,
  verifySkill,
  unlinkOAuthAccount
};
