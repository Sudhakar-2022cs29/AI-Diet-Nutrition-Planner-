// Resilient Redis cache client with automatic in-memory fallback
const Redis = require('ioredis');

let redisClient = null;
const memoryCache = new Map();

const initRedis = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  try {
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Do not spam retries if Redis is offline
      connectTimeout: 2000
    });

    client.on('connect', () => {
      console.log('✅ Connected to Redis cache service');
      redisClient = client;
    });

    client.on('error', (err) => {
      // Gracefully fall back to in-memory cache without crashing
      redisClient = null;
    });

    client.connect().catch(() => {
      // Silent failover to in-memory cache
      redisClient = null;
    });
  } catch (e) {
    redisClient = null;
  }
};

initRedis();

const cacheService = {
  async get(key) {
    try {
      if (redisClient) {
        const val = await redisClient.get(key);
        return val ? JSON.parse(val) : null;
      }
    } catch (_) {}

    // In-memory fallback
    const item = memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key, value, ttlSeconds = 3600) {
    try {
      if (redisClient) {
        await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      }
    } catch (_) {}

    // In-memory fallback
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  },

  async del(key) {
    try {
      if (redisClient) await redisClient.del(key);
    } catch (_) {}
    memoryCache.delete(key);
  },

  isRedisConnected() {
    return !!redisClient;
  }
};

module.exports = cacheService;

