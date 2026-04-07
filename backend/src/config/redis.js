const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

let redisUrl = process.env.REDIS_URL;

// Smart fallback logic
if (redisUrl && process.env.NODE_ENV !== 'production' && redisUrl.includes('red-')) {
  console.warn('⚠️ [Redis] Detected Render internal URL in non-production mode. Falling back to localhost.');
  redisUrl = 'redis://localhost:6379';
}

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('[Redis] Max retries exhausted. Disabling Redis retry loop.');
      return null;
    }
    return Math.min(times * 2000, 10000);
  }
};

// Fallback "Null Object" pattern for local dev without Redis
let redisClient = { get: async()=>null, set: async()=>null, del: async()=>null, keys: async()=>[], on:()=>null, status: 'end' };
let subClient = { on:()=>null, subscribe: async()=>null, psubscribe: async()=>null, status: 'end' };

if (redisUrl) {
  redisClient = new Redis(redisUrl, redisOptions);
  redisClient.on('error', err => console.error('[Redis] Connection Error:', err.message));
  redisClient.on('connect', () => console.log('[Redis] Connected successfully'));

  subClient = new Redis(redisUrl, redisOptions);
  subClient.on('error', err => console.error('[Redis SubClient] Connection Error:', err.message));
} else {
  console.log('[Redis] REDIS_URL not provided. Running with caching disabled.');
}

module.exports = { redisClient, subClient };
