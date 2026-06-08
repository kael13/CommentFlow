import { Router } from "express";
import { query, ValidationError, NotFoundError, logger } from "@commentflow/shared";

const router = Router();

const ALLOWED_AUTOMATION_LEVELS = ["off", "suggest", "semi", "full"];
const ALLOWED_TONES = ["friendly", "professional", "casual", "short"];

router.get("/", async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new ValidationError("x-user-id header is required");
    }

    const result = await query(
      "SELECT * FROM comment_settings WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError("Settings not found for user");
    }

    res.json(result.rows[0]);
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

    const existing = await query(
      "SELECT id FROM comment_settings WHERE user_id = $1",
      [userId]
    );
    if (existing.rows.length > 0) {
      throw new ValidationError("Settings already exist for this user");
    }

    const {
      automation_level = "suggest",
      auto_reply_enabled = false,
      tone = "friendly",
      spam_strictness = 5,
      working_hours_only = false,
      max_daily_replies = 100,
    } = req.body;

    const errors = [];

    if (!ALLOWED_AUTOMATION_LEVELS.includes(automation_level)) {
      errors.push(`automation_level must be one of: ${ALLOWED_AUTOMATION_LEVELS.join(", ")}`);
    }
    if (!ALLOWED_TONES.includes(tone)) {
      errors.push(`tone must be one of: ${ALLOWED_TONES.join(", ")}`);
    }
    if (typeof spam_strictness !== "number" || spam_strictness < 1 || spam_strictness > 10) {
      errors.push("spam_strictness must be a number between 1 and 10");
    }

    if (errors.length > 0) {
      throw new ValidationError("Validation failed", errors);
    }

    const result = await query(
      `INSERT INTO comment_settings (user_id, automation_level, auto_reply_enabled, tone, spam_strictness, working_hours_only, max_daily_replies)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, automation_level, auto_reply_enabled, tone, spam_strictness, working_hours_only, max_daily_replies]
    );

    logger.info("Settings created", { user_id: userId });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch("/", async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new ValidationError("x-user-id header is required");
    }

    const existing = await query(
      "SELECT * FROM comment_settings WHERE user_id = $1",
      [userId]
    );
    if (existing.rows.length === 0) {
      throw new NotFoundError("Settings not found for user");
    }

    const updates = [];
    const values = [];
    let idx = 1;

    const fieldMap = {
      automation_level: { validate: (v) => ALLOWED_AUTOMATION_LEVELS.includes(v) },
      auto_reply_enabled: { validate: (v) => typeof v === "boolean" },
      tone: { validate: (v) => ALLOWED_TONES.includes(v) },
      spam_strictness: { validate: (v) => typeof v === "number" && v >= 1 && v <= 10 },
      working_hours_only: { validate: (v) => typeof v === "boolean" },
      max_daily_replies: { validate: (v) => typeof v === "number" && v > 0 },
    };

    const errors = [];

    for (const [field, config] of Object.entries(fieldMap)) {
      if (req.body[field] !== undefined) {
        if (!config.validate(req.body[field])) {
          errors.push(`Invalid value for ${field}`);
          continue;
        }
        updates.push(`${field} = $${idx++}`);
        values.push(req.body[field]);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError("Validation failed", errors);
    }

    if (updates.length === 0) {
      return res.json(existing.rows[0]);
    }

    values.push(userId);
    const result = await query(
      `UPDATE comment_settings SET ${updates.join(", ")} WHERE user_id = $${idx} RETURNING *`,
      values
    );

    logger.info("Settings updated", { user_id: userId });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
