const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection Error:', err);
});

redisClient.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

// Create secondary client for sub/pub if needed for Socket.io
const subClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

module.exports = { redisClient, subClient };
