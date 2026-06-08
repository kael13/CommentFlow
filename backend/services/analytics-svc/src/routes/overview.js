import { Router } from "express";
import { query } from "@commentflow/shared";

const router = Router();

router.get("/overview", async (_req, res, next) => {
  try {
    const [totalComments, totalLeads, avgResponseTime, sentimentBreakdown, intentBreakdown, todayComments, weeklyTrend] =
      await Promise.all([
        query("SELECT COUNT(*)::int AS count FROM comments"),
        query("SELECT COUNT(*)::int AS count FROM leads"),
        query(
          `SELECT AVG(
            EXTRACT(EPOCH FROM (reply_timestamp - timestamp)) / 60
          )::numeric(10,2) AS avg_minutes
          FROM comments
          WHERE reply_timestamp IS NOT NULL AND timestamp IS NOT NULL`
        ),
        query(
          `SELECT sentiment, COUNT(*)::int AS count
           FROM comments
           WHERE sentiment IS NOT NULL
           GROUP BY sentiment`
        ),
        query(
          `SELECT ai_intent, COUNT(*)::int AS count
           FROM comments
           WHERE ai_intent IS NOT NULL
           GROUP BY ai_intent`
        ),
        query(
          `SELECT COUNT(*)::int AS count
           FROM comments
           WHERE timestamp::date = CURRENT_DATE`
        ),
        query(
          `SELECT DATE_TRUNC('day', timestamp)::date AS date, COUNT(*)::int AS count
           FROM comments
           WHERE timestamp >= CURRENT_DATE - INTERVAL '6 days'
           GROUP BY DATE_TRUNC('day', timestamp)
           ORDER BY date`
        ),
      ]);

    const sentimentMap = { positive: 0, neutral: 0, negative: 0 };
    for (const row of sentimentBreakdown.rows) {
      if (sentimentMap[row.sentiment] !== undefined) {
        sentimentMap[row.sentiment] = row.count;
      }
    }

    const weeklyTrendMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      weeklyTrendMap[key] = 0;
    }
    for (const row of weeklyTrend.rows) {
      const key = new Date(row.date).toISOString().slice(0, 10);
      if (weeklyTrendMap[key] !== undefined) {
        weeklyTrendMap[key] = row.count;
      }
    }
    const weeklyTrendArray = Object.entries(weeklyTrendMap).map(([date, count]) => ({ date, count }));

    res.json({
      totalComments: totalComments.rows[0].count,
      totalLeads: totalLeads.rows[0].count,
      avgResponseTime: avgResponseTime.rows[0]?.avg_minutes || null,
      sentimentBreakdown: sentimentMap,
      intentBreakdown: intentBreakdown.rows.reduce((acc, r) => {
        acc[r.ai_intent] = r.count;
        return acc;
      }, {}),
      todayComments: todayComments.rows[0].count,
      weeklyTrend: weeklyTrendArray,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
