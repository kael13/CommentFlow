import { logger, query } from "@commentflow/shared";

export function auditLog(req, res, next) {
  const start = Date.now();

  res.on("finish", async () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    const entry = {
      id: req.id,
      userId: req.user?.id || null,
      method: req.method,
      path: req.originalUrl || req.url,
      status,
      duration,
      ip: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    };

    logger.info("request completed", entry);

    if (status >= 400) {
      try {
        await query(
          `INSERT INTO activity_log (request_id, user_id, method, path, status, duration, ip, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [entry.id, entry.userId, entry.method, entry.path, entry.status, entry.duration, entry.ip, entry.userAgent]
        );
      } catch (err) {
        logger.error("Failed to persist audit log", { error: err });
      }
    }
  });

  next();
}
