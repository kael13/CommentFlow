import { Router } from "express";
import { query } from "@commentflow/shared";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT sentiment, COUNT(*)::int AS count
       FROM comments
       WHERE sentiment IS NOT NULL
       GROUP BY sentiment`
    );

    const total = result.rows.reduce((sum, r) => sum + r.count, 0) || 1;
    const breakdown = { positive: 0, neutral: 0, negative: 0 };

    for (const row of result.rows) {
      if (breakdown[row.sentiment] !== undefined) {
        breakdown[row.sentiment] = {
          count: row.count,
          percentage: Math.round((row.count / total) * 10000) / 100,
        };
      }
    }

    for (const key of Object.keys(breakdown)) {
      if (typeof breakdown[key] === "number") {
        breakdown[key] = { count: 0, percentage: 0 };
      }
    }

    res.json(breakdown);
  } catch (err) {
    next(err);
  }
});

router.get("/trend", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT DATE_TRUNC('day', timestamp)::date AS date,
              COUNT(*) FILTER (WHERE sentiment = 'positive')::int AS positive,
              COUNT(*) FILTER (WHERE sentiment = 'neutral')::int AS neutral,
              COUNT(*) FILTER (WHERE sentiment = 'negative')::int AS negative
       FROM comments
       WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
         AND sentiment IS NOT NULL
       GROUP BY DATE_TRUNC('day', timestamp)
       ORDER BY date`
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
