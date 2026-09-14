const { createClient } = require('redis');

let rawRedisUrl = process.env.REDIS_URL ? process.env.REDIS_URL.trim() : '';
// Clean up accidental 'REDIS_URL=' prefix or surrounding quotes if pasted into Render UI
if (rawRedisUrl.startsWith('REDIS_URL=')) {
  rawRedisUrl = rawRedisUrl.replace(/^REDIS_URL=/, '').trim();
}
if ((rawRedisUrl.startsWith('"') && rawRedisUrl.endsWith('"')) || (rawRedisUrl.startsWith("'") && rawRedisUrl.endsWith("'"))) {
  rawRedisUrl = rawRedisUrl.slice(1, -1).trim();
}

let redisClient;
try {
  redisClient = createClient(rawRedisUrl ? { url: rawRedisUrl } : {});
  redisClient.on('error', (err) => {
    console.warn("Redis client warning:", err.message);
  });
} catch (err) {
  console.error("Redis client initialization error:", err.message);
  redisClient = {
    isOpen: false,
    connect: async () => {},
    get: async () => null,
    set: async () => {},
    del: async () => {}
  };
}

async function connectRedis() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log("Redis connected successfully");
    } catch (err) {
      console.error("Redis connection failed:", err.message);
    }
  }
}

async function getCache(key) {
  try {
    if (!redisClient.isOpen) return null;
    const value = await redisClient.get(key);
    if (!value) return null;
    return JSON.parse(value);
  } catch (err) {
    console.warn(`Redis getCache error for key "${key}":`, err.message);
    return null;
  }
}

async function setCache(key, value, ttl = 300) {
  try {
    if (!redisClient.isOpen) return;
    await redisClient.set(key, JSON.stringify(value), {
      EX: ttl
    });
  } catch (err) {
    console.warn(`Redis setCache error for key "${key}":`, err.message);
  }
}

async function delCache(key) {
  try {
    if (!redisClient.isOpen) return;
    await redisClient.del(key);
  } catch (err) {
    console.warn(`Redis delCache error for key "${key}":`, err.message);
  }
}

module.exports = { connectRedis, getCache, setCache, delCache, redisClient };