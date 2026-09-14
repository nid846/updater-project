const { createClient } = require('redis');

const redisClient = createClient(
  process.env.REDIS_URL ? { url: process.env.REDIS_URL } : {}
);

redisClient.on('error', (err) => {
  // Log redis warning without crashing
  console.warn("Redis client warning:", err.message);
});

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