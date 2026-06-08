const actionMap = new Map();

const CLEANUP_INTERVAL_MS = 60000;

let cleanupTimer = null;

function cleanup() {
  const now = Date.now();
  for (const [userId, timestamps] of actionMap.entries()) {
    const filtered = timestamps.filter((t) => now - t < CLEANUP_INTERVAL_MS);
    if (filtered.length === 0) {
      actionMap.delete(userId);
    } else {
      actionMap.set(userId, filtered);
    }
  }
}

function startCleanup() {
  if (!cleanupTimer) {
    cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
    if (cleanupTimer.unref) {
      cleanupTimer.unref();
    }
  }
}

startCleanup();

export function checkAutopilotLimit(userId, maxActions = 20, windowMs = 60000) {
  const now = Date.now();
  const cutoff = now - windowMs;

  let timestamps = actionMap.get(userId);
  if (!timestamps) {
    timestamps = [];
    actionMap.set(userId, timestamps);
  }

  const filtered = timestamps.filter((t) => t > cutoff);

  if (filtered.length >= maxActions) {
    const retryAfter = Math.ceil((filtered[0] + windowMs - now) / 1000);
    const error = new Error(
      `Autopilot limit exceeded: ${maxActions} actions per ${windowMs / 1000}s`
    );
    error.code = "AUTOPILOT_LIMIT_EXCEEDED";
    error.retryAfter = retryAfter;
    throw error;
  }

  filtered.push(now);
  actionMap.set(userId, filtered);

  return {
    allowed: true,
    remaining: maxActions - filtered.length,
    resetTime: new Date(now + windowMs).toISOString(),
  };
}

export async function checkAutopilotLimitRedis(
  redisClient,
  userId,
  maxActions = 20,
  windowMs = 60000
) {
  const now = Date.now();
  const key = `autopilot:${userId}`;
  const cutoff = now - windowMs;

  const multi = redisClient.multi();
  multi.zRemRangeByScore(key, 0, cutoff);
  multi.zCard(key);
  multi.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
  multi.pExpire(key, windowMs);

  const results = await multi.exec();

  const currentCount = results[1];

  if (currentCount >= maxActions) {
    const oldest = await redisClient.zRangeWithScores(key, 0, 0);
    const oldestScore = oldest.length > 0 ? oldest[0].score : now;
    const retryAfter = Math.ceil((oldestScore + windowMs - now) / 1000);

    const error = new Error(
      `Autopilot limit exceeded: ${maxActions} actions per ${windowMs / 1000}s`
    );
    error.code = "AUTOPILOT_LIMIT_EXCEEDED";
    error.retryAfter = retryAfter;
    throw error;
  }

  return {
    allowed: true,
    remaining: maxActions - currentCount - 1,
    resetTime: new Date(now + windowMs).toISOString(),
  };
}
