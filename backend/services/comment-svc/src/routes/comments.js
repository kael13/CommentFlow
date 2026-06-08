import { Router } from "express";
import {
  findComments,
  findCommentById,
  createComment,
  updateComment,
  updateCommentReply,
  classifyAndUpdate,
  findPosts,
  findThreadForPost,
} from "../handlers/commentQueries.js";
import { classifyComment } from "../handlers/classification.js";
import { ValidationError, NotFoundError, logger } from "@commentflow/shared";

const router = Router();

router.get("/posts", async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50", 10)));
    const result = await findPosts(limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/thread/:postId", async (req, res, next) => {
  try {
    const result = await findThreadForPost(req.params.postId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const filters = {};

    for (const key of ["page_id", "post_id", "ai_intent", "moderation_status", "is_lead"]) {
      if (req.query[key] !== undefined) {
        filters[key] = req.query[key];
      }
    }

    const result = await findComments(filters, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const comment = await findCommentById(req.params.id);
    if (!comment) {
      throw new NotFoundError("Comment not found");
    }
    res.json(comment);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.post_id || !data.facebook_comment_id || !data.author_name || !data.message) {
      throw new ValidationError("Missing required fields: post_id, facebook_comment_id, author_name, message");
    }

    const comment = await createComment({
      page_id: data.page_id || null,
      post_id: data.post_id,
      facebook_comment_id: data.facebook_comment_id,
      parent_facebook_comment_id: data.parent_facebook_comment_id || null,
      author_name: data.author_name,
      author_email: data.author_email || null,
      message: data.message,
      timestamp: data.timestamp || new Date().toISOString(),
      permalink: data.permalink || null,
    });

    logger.info("Comment created", { id: comment.id, post_id: data.post_id });
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const existing = await findCommentById(req.params.id);
    if (!existing) {
      throw new NotFoundError("Comment not found");
    }

    const allowed = [
      "moderation_status", "ai_intent", "ai_confidence", "sentiment",
      "is_lead", "lead_score", "lead_phone", "lead_email",
      "reply_text", "reply_tone", "auto_replied", "reply_timestamp",
      "auto_reply_disabled", "auto_reply_disabled_reason", "notes",
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const comment = await updateComment(req.params.id, updates);
    logger.info("Comment updated", { id: req.params.id });
    res.json(comment);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/reply", async (req, res, next) => {
  try {
    const existing = await findCommentById(req.params.id);
    if (!existing) {
      throw new NotFoundError("Comment not found");
    }

    const replyData = {
      reply_text: req.body.reply_text || null,
      reply_tone: req.body.reply_tone || null,
      auto_replied: req.body.auto_replied !== undefined ? req.body.auto_replied : false,
      reply_timestamp: req.body.reply_timestamp || new Date().toISOString(),
    };

    const comment = await updateCommentReply(req.params.id, replyData);
    logger.info("Comment reply updated", { id: req.params.id });
    res.json(comment);
  } catch (err) {
    next(err);
  }
});

router.post("/classify", async (req, res, next) => {
  try {
    const { comment_id, text } = req.body;
    if (!comment_id || !text) {
      throw new ValidationError("comment_id and text are required");
    }

    const existing = await findCommentById(comment_id);
    if (!existing) {
      throw new NotFoundError("Comment not found");
    }

    const classification = await classifyComment(text, comment_id);
    const comment = await classifyAndUpdate(comment_id, classification);

    logger.info("Comment classified", { id: comment_id, intent: classification.intent });
    res.json(classification);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await findCommentById(req.params.id);
    if (!existing) {
      throw new NotFoundError("Comment not found");
    }

    await updateComment(req.params.id, { moderation_status: "hidden" });
    logger.info("Comment soft-deleted", { id: req.params.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
