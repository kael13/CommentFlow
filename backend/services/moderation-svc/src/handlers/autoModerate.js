import { query as dbQuery, logger } from "@commentflow/shared";
import { checkComment, loadKeywords } from "./spamDetector.js";
import { updateCommentStatus } from "./moderationQueries.js";

export async function autoModerate(comment, settings = {}) {
  const strictness = settings.strictness || 5;

  await loadKeywords();

  const spamResult = checkComment(comment.text || comment.message, strictness);

  if (!spamResult.isSpam) {
    return {
      action: "none",
      reason: "No spam detected",
      spamScore: spamResult.score,
    };
  }

  const threshold = strictness * 10;
  if (spamResult.score < threshold) {
    return {
      action: "none",
      reason: "Below threshold",
      spamScore: spamResult.score,
    };
  }

  await updateCommentStatus(comment.id, "hidden");

  logger.info("Comment auto-moderated (hidden)", {
    comment_id: comment.id,
    score: spamResult.score,
    reason: spamResult.reason,
  });

  await dbQuery(
    `INSERT INTO activity_log (user_id, action_type, details)
     VALUES ($1, 'moderate', $2)`,
    [
      "system",
      JSON.stringify({
        comment_id: comment.id,
        action: "auto_hide",
        score: spamResult.score,
        reason: spamResult.reason,
        strictness,
      }),
    ]
  );

  return {
    action: "hidden",
    reason: spamResult.reason,
    spamScore: spamResult.score,
  };
}
