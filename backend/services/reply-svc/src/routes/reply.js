import { Router } from "express";
import { ValidationError, NotFoundError, logger } from "@commentflow/shared";
import { generateReply } from "../handlers/replyGenerator.js";

const router = Router();

const ALLOWED_TONES = ["professional", "gen_z", "taglish", "friendly"];
const COMMENT_SVC_URL = process.env.COMMENT_SVC_URL || "http://localhost:3001";

async function fetchComment(commentId, userId) {
  const headers = { "Content-Type": "application/json" };
  if (userId) headers["x-user-id"] = userId;

  const response = await fetch(`${COMMENT_SVC_URL}/api/comments/${commentId}`, { headers });
  if (!response.ok) {
    if (response.status === 404) throw new NotFoundError("Comment not found");
    throw new Error(`Comment service returned ${response.status}`);
  }
  return response.json();
}

async function fetchUserSettings(userId) {
  const response = await fetch(`${COMMENT_SVC_URL}/api/settings`, {
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

async function saveReplyToComment(commentId, replyText, tone, userId) {
  const response = await fetch(`${COMMENT_SVC_URL}/api/comments/${commentId}/reply`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    body: JSON.stringify({
      reply_text: replyText,
      reply_tone: tone,
      auto_replied: true,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to save reply: comment service returned ${response.status}`);
  }
  return response.json();
}

router.post("/generate", async (req, res, next) => {
  try {
    const userId = req.userId;
    const { commentId, tone, context } = req.body;

    if (!commentId) {
      throw new ValidationError("commentId is required");
    }

    const comment = await fetchComment(commentId, userId);

    let effectiveTone = tone;
    if (!effectiveTone && userId) {
      const settings = await fetchUserSettings(userId);
      if (settings && settings.tone) {
        const toneMap = {
          friendly: "friendly",
          professional: "professional",
          casual: "gen_z",
          short: "friendly",
        };
        effectiveTone = toneMap[settings.tone] || "friendly";
      }
    }
    if (!effectiveTone) {
      effectiveTone = "friendly";
    }
    if (!ALLOWED_TONES.includes(effectiveTone)) {
      effectiveTone = "friendly";
    }

    const commentText = comment.message || "";
    const intent = comment.ai_intent || "general";
    const sentiment = comment.sentiment || "neutral";
    const authorName = comment.author_name || null;

    const reply = await generateReply(commentText, intent, effectiveTone, sentiment, authorName);
    if (reply === null && intent === "spam") {
      return res.json({
        reply: null,
        tone: effectiveTone,
        originalComment: comment,
        templateUsed: false,
        skipped: true,
        reason: "Spam comments do not receive replies",
      });
    }

    res.json({
      reply,
      tone: effectiveTone,
      originalComment: comment,
      templateUsed: true,
      ...(context ? { context } : {}),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auto-reply", async (req, res, next) => {
  try {
    const userId = req.userId;
    const { commentId, tone } = req.body;

    if (!commentId) {
      throw new ValidationError("commentId is required");
    }

    const comment = await fetchComment(commentId, userId);

    let effectiveTone = tone;
    if (!effectiveTone && userId) {
      const settings = await fetchUserSettings(userId);
      if (settings && settings.tone) {
        const toneMap = {
          friendly: "friendly",
          professional: "professional",
          casual: "gen_z",
          short: "friendly",
        };
        effectiveTone = toneMap[settings.tone] || "friendly";
      }
    }
    if (!effectiveTone) {
      effectiveTone = "friendly";
    }
    if (!ALLOWED_TONES.includes(effectiveTone)) {
      effectiveTone = "friendly";
    }

    const commentText = comment.message || "";
    const intent = comment.ai_intent || "general";
    const sentiment = comment.sentiment || "neutral";
    const authorName = comment.author_name || null;

    const reply = await generateReply(commentText, intent, effectiveTone, sentiment, authorName);

    if (reply === null && intent === "spam") {
      return res.json({
        reply: null,
        tone: effectiveTone,
        originalComment: comment,
        templateUsed: false,
        skipped: true,
        reason: "Spam comments do not receive replies",
      });
    }

    const updatedComment = await saveReplyToComment(commentId, reply, effectiveTone, userId);

    logger.info("Auto-reply saved", { commentId, intent, tone: effectiveTone });

    res.json({
      reply,
      tone: effectiveTone,
      updatedComment,
      templateUsed: true,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
