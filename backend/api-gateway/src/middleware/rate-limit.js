import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redisClient, logger } from "@commentflow/shared";

let redisAvailable = false;

async function checkRedis() {
  try {
    await redisClient.ping();
    redisAvailable = true;
    logger.info("Rate limiter using Redis store");
  } catch {
    redisAvailable = false;
    logger.warn("Redis unavailable — rate limiters falling back to memory store");
  }
}

checkRedis();

function createLimiter(windowMs, max, name) {
  const config = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: "rate-limit/exceeded",
        message: `Rate limit exceeded. Max ${max} requests per ${windowMs / 60000} minute(s)`,
      },
    },
  };

  if (redisAvailable) {
    config.store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: `rl:${name}:`,
    });
  }

  return rateLimit(config);
}

export const commentLimiter = createLimiter(60 * 1000, 30, "comment");
export const analyticsLimiter = createLimiter(60 * 1000, 10, "analytics");
export const replyLimiter = createLimiter(60 * 1000, 20, "reply");
export const classifyLimiter = createLimiter(60 * 1000, 30, "classify");
export const moderationLimiter = createLimiter(60 * 1000, 15, "moderation");
export const leadLimiter = createLimiter(60 * 1000, 20, "lead");
export const loginLimiter = createLimiter(60 * 1000, 5, "login");

const routeLimiterMap = [
  { prefix: "/api/comments/classify", limiter: classifyLimiter },
  { prefix: "/api/comments", limiter: commentLimiter },
  { prefix: "/api/reply", limiter: replyLimiter },
  { prefix: "/api/moderation", limiter: moderationLimiter },
  { prefix: "/api/leads", limiter: leadLimiter },
  { prefix: "/api/analytics", limiter: analyticsLimiter },
  { prefix: "/api/settings", limiter: commentLimiter },
  { prefix: "/api/activity-log", limiter: commentLimiter },
];

export function selectRateLimiter(req, res, next) {
  const path = req.path;

  for (const { prefix, limiter } of routeLimiterMap) {
    if (path.startsWith(prefix)) {
      return limiter(req, res, next);
    }
  }

  next();
}
