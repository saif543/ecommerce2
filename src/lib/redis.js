import { createClient } from "redis";

let client = null;
let isConnecting = false;

/**
 * Returns a singleton Redis client.
 */
export async function getRedisClient() {
  if (client && client.isOpen) {
    return client;
  }

  if (isConnecting) {
    await waitForConnection();
    if (client && client.isOpen) return client;
    throw new Error("Redis connection failed during concurrent initialization");
  }

  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL environment variable is not defined");
  }

  isConnecting = true;

  try {
    client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.error("[Redis] Max reconnection attempts reached");
            return new Error("Max reconnection attempts reached");
          }
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000,
      },
    });

    client.on("error", (err) => console.error("[Redis] Client error:", err));
    client.on("reconnecting", () => console.warn("[Redis] Reconnecting..."));
    client.on("ready", () => console.log("[Redis] Client ready"));

    await client.connect();
    return client;
  } catch (err) {
    client = null;
    throw err;
  } finally {
    isConnecting = false;
  }
}

/**
 * SET data into Redis with an optional TTL.
 * @param {string} key
 * @param {any} value - Will be stringified if it's an object/array
 * @param {number} ttlSeconds - Time to live in seconds (optional)
 */
export async function setRedisData(key, value, ttlSeconds = null) {
  const redis = await getRedisClient();
  const data = typeof value === "string" ? value : JSON.stringify(value);

  if (ttlSeconds) {
    // 'EX' sets the expiry in seconds
    return await redis.set(key, data, { EX: ttlSeconds });
  }
  return await redis.set(key, data);
}

/**
 * GET data from Redis.
 * @param {string} key
 * @returns {any|null} - Automatically parses JSON strings back to objects
 */
export async function getRedisData(key) {
  const redis = await getRedisClient();
  const data = await redis.get(key);

  if (!data) return null;

  try {
    // Try to parse in case it's a stringified object
    return JSON.parse(data);
  } catch (e) {
    // If it's just a regular string, return as is
    return data;
  }
}

/**
 * DELETE a key from Redis.
 */
export async function deleteRedisData(key) {
  const redis = await getRedisClient();
  return await redis.del(key);
}

export async function disconnectRedis() {
  if (client && client.isOpen) {
    await client.quit();
    client = null;
    console.log("[Redis] Disconnected");
  }
}

function waitForConnection(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (!isConnecting) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error("Timed out waiting for Redis connection"));
      }
    }, 50);
  });
}

export const R_1HRS = 3600;
export const R_3HRS = R_1HRS * 3;
export const R_6HRS = R_1HRS * 6;
