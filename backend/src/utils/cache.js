const { redisClient } = require('../config/redis');

/**
 * Get data from Redis cache
 * @param {string} key 
 */
async function getCache(key) {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`[Redis] Cache Get Error (${key}):`, err);
    return null;
  }
}

/**
 * Set data to Redis cache with TTL
 * @param {string} key 
 * @param {any} data 
 * @param {number} ttl - Time to live in seconds (default 1 hour)
 */
async function setCache(key, data, ttl = 3600) {
  try {
    await redisClient.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (err) {
    console.error(`[Redis] Cache Set Error (${key}):`, err);
  }
}

/**
 * Delete data from Redis cache
 * @param {string} key 
 */
async function delCache(key) {
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error(`[Redis] Cache Del Error (${key}):`, err);
  }
}

/**
 * Clear all cache entries matching a pattern
 * @param {string} pattern 
 */
async function clearCachePattern(pattern) {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.error(`[Redis] Cache Clear Pattern Error (${pattern}):`, err);
  }
}

module.exports = { getCache, setCache, delCache, clearCachePattern };
