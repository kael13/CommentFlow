import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        return new Error("Redis reconnect attempts exhausted");
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("error", (err) => {
  console.error("Redis client error:", err);
});

redisClient.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
}

export async function redisGet(key) {
  const raw = await redisClient.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function redisSet(key, value, ttlSeconds) {
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await redisClient.set(key, serialized, { EX: ttlSeconds });
  } else {
    await redisClient.set(key, serialized);
  }
}

export async function redisDel(key) {
  await redisClient.del(key);
}

async function shutdown() {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  } catch (err) {
    console.error("Error closing Redis client:", err);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
