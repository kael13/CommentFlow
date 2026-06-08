import { Router } from "express";
import { query, logger } from "@commentflow/shared";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const minScore = parseInt(req.query.minScore || "5", 10);

    const result = await query(
      `SELECT vc.id AS viral_id,
              vc.comment_id,
              vc.engagement_score,
              vc.is_pinned,
              vc.detected_at,
              vc.trending_phrase,
              c.page_id,
              c.post_id,
              c.author_name,
              c.text,
              c.timestamp,
              c.like_count,
              c.reply_count,
              c.sentiment,
              c.ai_intent
       FROM viral_comments vc
       JOIN comments c ON c.id = vc.comment_id
       WHERE vc.engagement_score >= $1
       ORDER BY vc.is_pinned DESC, vc.engagement_score DESC
       LIMIT $2`,
      [minScore, limit]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get("/trending", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT text FROM comments
       WHERE timestamp >= NOW() - INTERVAL '24 hours'
         AND text IS NOT NULL`
    );

    const wordCounts = {};
    const stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
      "being", "have", "has", "had", "do", "does", "did", "will", "would",
      "could", "should", "may", "might", "shall", "can", "need", "dare",
      "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
      "us", "them", "my", "your", "his", "its", "our", "their", "this",
      "that", "these", "those", "not", "no", "nor", "so", "if", "as",
      "just", "like", "get", "got", "its", "im", "dont", "wont", "cant",
      "ve", "ll", "re", "&amp;", "–", "—", "&", "nbsp;",
    ]);

    for (const row of result.rows) {
      const cleaned = row.text
        .toLowerCase()
        .replace(/<[^>]+>/g, "")
        .replace(/[^a-z0-9\s'-]/g, "")
        .trim();

      const words = cleaned.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

      for (let i = 0; i < words.length; i++) {
        for (let j = i + 1; j <= Math.min(i + 2, words.length - 1); j++) {
          const phrase = words.slice(i, j + 1).join(" ");
          if (phrase.split(" ").length >= 2) {
            wordCounts[phrase] = (wordCounts[phrase] || 0) + 1;
          }
        }
        wordCounts[words[i]] = (wordCounts[words[i]] || 0) + 1;
      }
    }

    const sorted = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([phrase, count]) => ({ phrase, count }));

    res.json(sorted);
  } catch (err) {
    next(err);
  }
});

router.post("/pin/:commentId", async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const result = await query(
      `UPDATE viral_comments
       SET is_pinned = TRUE
       WHERE comment_id = $1
       RETURNING id, comment_id, is_pinned`,
      [commentId]
    );

    if (result.rowCount === 0) {
      const insertResult = await query(
        `INSERT INTO viral_comments (comment_id, is_pinned)
         VALUES ($1, TRUE)
         RETURNING id, comment_id, is_pinned`,
        [commentId]
      );
      res.json(insertResult.rows[0]);
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (_req, res, next) => {
  try {
    const result = await query(
      `INSERT INTO viral_comments (comment_id, engagement_score, detected_at)
       SELECT c.id,
              (c.like_count + (c.reply_count * 2) +
               CASE
                 WHEN LENGTH(c.text) > 200 THEN 5
                 WHEN LENGTH(c.text) > 100 THEN 3
                 ELSE 1
               END +
               CASE
                 WHEN c.reply_count > 10 THEN 5
                 WHEN c.reply_count > 5 THEN 3
                 ELSE 0
               END) AS engagement_score,
              NOW()
       FROM comments c
       WHERE c.timestamp >= NOW() - INTERVAL '24 hours'
         AND (c.like_count > 0 OR c.reply_count > 0 OR LENGTH(c.text) > 50)
       ON CONFLICT (comment_id)
       DO UPDATE SET
         engagement_score = EXCLUDED.engagement_score,
         detected_at = NOW()
       RETURNING id`
    );

    const count = result.rowCount || 0;
    logger.info("Viral scores refreshed", { updatedRows: count });
    res.json({ updatedRows: count });
  } catch (err) {
    next(err);
  }
});

export default router;
