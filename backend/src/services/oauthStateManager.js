/**
 * OAuth State Manager
 * 
 * Manages OAuth state tokens in Redis for CSRF protection.
 * Generates cryptographically secure state tokens and PKCE verifiers,
 * stores them with expiration, and provides verification methods.
 */

const { v4: uuidv4 } = require('uuid');
const { redisClient } = require('../config/redis');

const STATE_EXPIRY_SECONDS = 600; // 10 minutes
const STATE_KEY_PREFIX = 'oauth:state:';

/**
 * Create and store OAuth state
 * @param {string} provider - Provider name (e.g., 'github')
 * @param {string} codeVerifier - PKCE code verifier
 * @param {string} [userId] - Optional user ID for account linking
 * @returns {Promise<import('../types/oauth').OAuthState>} Created state object
 */
async function createState(provider, codeVerifier, userId = null) {
  const token = uuidv4();
  const now = Date.now();
  
  /** @type {import('../types/oauth').OAuthState} */
  const state = {
    token,
    codeVerifier,
    provider,
    userId: userId || undefined,
    createdAt: now,
    expiresAt: now + (STATE_EXPIRY_SECONDS * 1000)
  };

  const key = STATE_KEY_PREFIX + token;
  await redisClient.set(key, JSON.stringify(state), 'EX', STATE_EXPIRY_SECONDS);
  
  return state;
}

/**
 * Verify and retrieve OAuth state
 * @param {string} stateToken - State token to verify
 * @returns {Promise<import('../types/oauth').OAuthState | null>} State object or null if invalid/expired
 */
async function verifyState(stateToken) {
  if (!stateToken) return null;
  
  const key = STATE_KEY_PREFIX + stateToken;
  const stateData = await redisClient.get(key);
  
  if (!stateData) return null;
  
  try {
    /** @type {import('../types/oauth').OAuthState} */
    const state = JSON.parse(stateData);
    
    // Check expiration
    if (Date.now() > state.expiresAt) {
      await deleteState(stateToken);
      return null;
    }
    
    return state;
  } catch (err) {
    console.error('[OAuth State] Failed to parse state:', err.message);
    return null;
  }
}

/**
 * Delete OAuth state (one-time use enforcement)
 * @param {string} stateToken - State token to delete
 * @returns {Promise<void>}
 */
async function deleteState(stateToken) {
  if (!stateToken) return;
  const key = STATE_KEY_PREFIX + stateToken;
  await redisClient.del(key);
}

/**
 * Clean up expired states (maintenance function)
 * Note: Redis TTL handles this automatically, but this can be used for manual cleanup
 * @returns {Promise<number>} Number of states deleted
 */
async function cleanupExpiredStates() {
  const pattern = STATE_KEY_PREFIX + '*';
  const keys = await redisClient.keys(pattern);
  
  let deleted = 0;
  for (const key of keys) {
    const stateData = await redisClient.get(key);
    if (!stateData) continue;
    
    try {
      const state = JSON.parse(stateData);
      if (Date.now() > state.expiresAt) {
        await redisClient.del(key);
        deleted++;
      }
    } catch (err) {
      // Invalid state data, delete it
      await redisClient.del(key);
      deleted++;
    }
  }
  
  return deleted;
}

module.exports = {
  createState,
  verifyState,
  deleteState,
  cleanupExpiredStates
};
