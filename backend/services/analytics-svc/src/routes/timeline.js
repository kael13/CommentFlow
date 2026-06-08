import { Router } from "express";
import { query } from "@commentflow/shared";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const period = req.query.period || "day";
    const startDate = req.query.startDate || "1970-01-01";
    const endDate = req.query.endDate || "9999-12-31";
    const dateField = "timestamp";

    const groupExpr = period === "week"
      ? "DATE_TRUNC('week', timestamp)"
      : period === "month"
        ? "DATE_TRUNC('month', timestamp)"
        : "DATE_TRUNC('day', timestamp)";

    const result = await query(
      `SELECT ${groupExpr}::date AS date, COUNT(*)::int AS count
       FROM comments
       WHERE ${dateField} >= $1 AND ${dateField} <= $2
       GROUP BY ${groupExpr}
       ORDER BY date`,
      [startDate, endDate]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get("/leads", async (req, res, next) => {
  try {
    const period = req.query.period || "day";
    const startDate = req.query.startDate || "1970-01-01";
    const endDate = req.query.endDate || "9999-12-31";

    const groupExpr = period === "week"
      ? "DATE_TRUNC('week', captured_at)"
      : period === "month"
        ? "DATE_TRUNC('month', captured_at)"
        : "DATE_TRUNC('day', captured_at)";

    const result = await query(
      `SELECT ${groupExpr}::date AS date, COUNT(*)::int AS count
       FROM leads
       WHERE captured_at >= $1 AND captured_at <= $2
       GROUP BY ${groupExpr}
       ORDER BY date`,
      [startDate, endDate]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
