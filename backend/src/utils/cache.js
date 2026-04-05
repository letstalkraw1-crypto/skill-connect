const { redisClient } = require('../config/redis');

// Helper for timing out Redis calls
const timeout = (ms, promise) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Redis Timeout')), ms);
    promise
      .then(value => { clearTimeout(timer); resolve(value); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
};

/**
 * Get data from Redis cache
 * @param {string} key 
 */
async function getCache(key) {
  try {
    const data = await timeout(1500, redisClient.get(key));
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`[Redis] Cache Get Error/Timeout (${key}):`, err.message);
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
    await timeout(1500, redisClient.set(key, JSON.stringify(data), 'EX', ttl));
  } catch (err) {
    console.error(`[Redis] Cache Set Error/Timeout (${key}):`, err.message);
  }
}

/**
 * Delete data from Redis cache
 * @param {string} key 
 */
async function delCache(key) {
  try {
    await timeout(1500, redisClient.del(key));
  } catch (err) {
    console.error(`[Redis] Cache Del Error/Timeout (${key}):`, err.message);
  }
}

/**
 * Clear all cache entries matching a pattern
 * @param {string} pattern 
 */
async function clearCachePattern(pattern) {
  try {
    const keys = await timeout(1500, redisClient.keys(pattern));
    if (keys && keys.length > 0) {
      await timeout(1500, redisClient.del(keys));
    }
  } catch (err) {
    console.error(`[Redis] Cache Clear Pattern Error/Timeout (${pattern}):`, err.message);
  }
}

module.exports = { getCache, setCache, delCache, clearCachePattern };
