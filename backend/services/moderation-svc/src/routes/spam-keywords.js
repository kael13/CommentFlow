import { Router } from "express";
import { ValidationError, logger } from "@commentflow/shared";
import {
  getSpamKeywords,
  addSpamKeyword,
  removeSpamKeyword,
  toggleSpamKeyword,
} from "../handlers/moderationQueries.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const keywords = await getSpamKeywords();
    res.json({ data: keywords });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { keyword } = req.body;
    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
      throw new ValidationError("keyword is required");
    }

    const trimmed = keyword.trim().toLowerCase();
    const result = await addSpamKeyword(trimmed, req.userId);

    logger.info("Spam keyword added", { keyword: trimmed, added_by: req.userId });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await removeSpamKeyword(req.params.id);
    logger.info("Spam keyword removed", { id: req.params.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== "boolean") {
      throw new ValidationError("is_active (boolean) is required");
    }

    const result = await toggleSpamKeyword(req.params.id, is_active);
    if (!result) {
      return res.status(404).json({ error: { message: "Keyword not found" } });
    }

    logger.info("Spam keyword toggled", { id: req.params.id, is_active });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
