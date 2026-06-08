import { Router } from "express";
import { query, ValidationError, logger } from "@commentflow/shared";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new ValidationError("x-user-id header is required");
    }

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const offset = (page - 1) * limit;

    let whereClause = "WHERE user_id = $1";
    const params = [userId];
    let idx = 2;

    if (req.query.action_type) {
      whereClause += ` AND action_type = $${idx++}`;
      params.push(req.query.action_type);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM activity_log ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT * FROM activity_log ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    res.json({
      data: dataResult.rows,
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/recent", async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new ValidationError("x-user-id header is required");
    }

    const result = await query(
      `SELECT * FROM activity_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new ValidationError("x-user-id header is required");
    }

    const { action_type, target_type, target_id, details } = req.body;

    if (!action_type) {
      throw new ValidationError("action_type is required");
    }

    const result = await query(
      `INSERT INTO activity_log (user_id, action_type, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, action_type, target_type || null, target_id || null, details ? JSON.stringify(details) : null]
    );

    logger.info("Activity log entry created", { action_type, user_id: userId });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
