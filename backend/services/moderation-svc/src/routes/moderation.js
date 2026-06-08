import { Router } from "express";
import { logger, NotFoundError, ValidationError } from "@commentflow/shared";
import {
  findFlaggedComments,
  updateCommentStatus,
  hideCommentsByAuthor,
} from "../handlers/moderationQueries.js";
import { query as dbQuery } from "@commentflow/shared";

const router = Router();

router.get("/flagged", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const filters = {};

    if (req.query.status) {
      filters.moderation_status = req.query.status;
    } else {
      filters.moderation_status = "flagged,pending";
    }

    const result = await findFlaggedComments(filters, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch("/:commentId/approve", async (req, res, next) => {
  try {
    const comment = await updateCommentStatus(req.params.commentId, "approved");
    if (!comment) {
      throw new NotFoundError("Comment not found");
    }

    logger.info("Comment approved", { id: req.params.commentId });

    await dbQuery(
      `INSERT INTO activity_log (user_id, action_type, details)
       VALUES ($1, 'moderate', $2)`,
      [
        req.userId,
        JSON.stringify({
          comment_id: req.params.commentId,
          action: "approve",
        }),
      ]
    );

    res.json(comment);
  } catch (err) {
    next(err);
  }
});

router.patch("/:commentId/hide", async (req, res, next) => {
  try {
    const comment = await updateCommentStatus(req.params.commentId, "hidden");
    if (!comment) {
      throw new NotFoundError("Comment not found");
    }

    logger.info("Comment hidden", { id: req.params.commentId });

    await dbQuery(
      `INSERT INTO activity_log (user_id, action_type, details)
       VALUES ($1, 'moderate', $2)`,
      [
        req.userId,
        JSON.stringify({
          comment_id: req.params.commentId,
          action: "hide",
        }),
      ]
    );

    res.json(comment);
  } catch (err) {
    next(err);
  }
});

router.patch("/:commentId/block-user", async (req, res, next) => {
  try {
    const { authorFbId } = req.body;
    if (!authorFbId) {
      throw new ValidationError("authorFbId is required");
    }

    const hidden = await hideCommentsByAuthor(authorFbId);

    logger.info("User blocked and comments hidden", {
      author_fb_id: authorFbId,
      comments_affected: hidden.length,
    });

    await dbQuery(
      `INSERT INTO activity_log (user_id, action_type, details)
       VALUES ($1, 'moderate', $2)`,
      [
        req.userId,
        JSON.stringify({
          action: "block_user",
          author_fb_id: authorFbId,
          comment_id: req.params.commentId,
          comments_affected: hidden.length,
        }),
      ]
    );

    res.json({
      message: "User blocked and comments hidden",
      author_fb_id: authorFbId,
      comments_affected: hidden.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/log", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const offset = (page - 1) * limit;

    const countResult = await dbQuery(
      `SELECT COUNT(*) FROM activity_log WHERE action_type = 'moderate'`
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await dbQuery(
      `SELECT * FROM activity_log
       WHERE action_type = 'moderate'
       ORDER BY timestamp DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
