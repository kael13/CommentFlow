export async function checkRateLimit(redisClient, key, maxRequests, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `ratelimit:${key}`;

  const multi = redisClient.multi();
  multi.zRemRangeByScore(redisKey, 0, windowStart);
  multi.zCard(redisKey);
  multi.zAdd(redisKey, { score: now, value: `${now}:${Math.random()}` });
  multi.pExpire(redisKey, windowMs);

  const results = await multi.exec();

  const currentCount = results[1];
  const remaining = Math.max(0, maxRequests - currentCount - 1);
  const resetTime = new Date(now + windowMs).toISOString();

  if (currentCount >= maxRequests) {
    const oldest = await redisClient.zRangeWithScores(redisKey, 0, 0);
    const oldestScore = oldest.length > 0 ? oldest[0].score : now;
    const retryAfterMs = oldestScore + windowMs - now;

    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: Math.ceil(retryAfterMs / 1000),
    };
  }

  return {
    allowed: true,
    remaining,
    resetTime,
    retryAfter: null,
  };
}

export function createRateLimiter(options = {}) {
  const {
    redisClient,
    keyPrefix = "rl",
    maxRequests = 100,
    windowMs = 60000,
    keyGenerator = (req) => req.ip,
  } = options;

  if (!redisClient) {
    throw new Error("redisClient is required for createRateLimiter");
  }

  return async function rateLimitMiddleware(req, res, next) {
    try {
      const identifier = keyGenerator(req);
      const key = `${keyPrefix}:${identifier}`;

      const result = await checkRateLimit(
        redisClient,
        key,
        maxRequests,
        windowMs
      );

      res.set("X-RateLimit-Limit", String(maxRequests));
      res.set("X-RateLimit-Remaining", String(result.remaining));
      res.set("X-RateLimit-Reset", result.resetTime);

      if (!result.allowed) {
        res.set("Retry-After", String(result.retryAfter));
        return res.status(429).json({
          error: "Too many requests",
          retryAfter: result.retryAfter,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
