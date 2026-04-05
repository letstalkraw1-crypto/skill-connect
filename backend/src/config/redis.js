const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  enableOfflineQueue: false,
  retryStrategy: (times) => {
    // Reconnect after 2, 4, 8 seconds max wait
    return Math.min(times * 2000, 10000);
  }
};

const redisClient = new Redis(redisUrl, redisOptions);

redisClient.on('error', (err) => {
  console.error('[Redis] Connection Error:', err.message);
});

redisClient.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

const subClient = new Redis(redisUrl, redisOptions);

subClient.on('error', (err) => {
  console.error('[Redis SubClient] Connection Error:', err.message);
});

module.exports = { redisClient, subClient };
