import { Router } from "express";
import { ValidationError, NotFoundError, logger } from "@commentflow/shared";
import {
  findTemplates,
  findTemplateByScenarioAndTone,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  incrementUsage,
  seedDefaultTemplates,
  SCENARIOS,
  TONES,
} from "../handlers/templateQueries.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const filters = {};
    for (const key of ["scenario", "tone"]) {
      if (req.query[key] !== undefined) {
        filters[key] = req.query[key];
      }
    }
    const templates = await findTemplates(filters);
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { scenario, tone, template_text, is_active } = req.body;

    if (!scenario || !tone || !template_text) {
      throw new ValidationError("scenario, tone, and template_text are required");
    }

    if (!SCENARIOS.includes(scenario)) {
      throw new ValidationError(`scenario must be one of: ${SCENARIOS.join(", ")}`);
    }
    if (!TONES.includes(tone)) {
      throw new ValidationError(`tone must be one of: ${TONES.join(", ")}`);
    }

    const existing = await findTemplateByScenarioAndTone(scenario, tone);
    if (existing) {
      throw new ValidationError(`Template already exists for scenario '${scenario}' and tone '${tone}'`);
    }

    const template = await createTemplate({ scenario, tone, template_text, is_active });
    logger.info("Template created", { id: template.id, scenario, tone });
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const template = await updateTemplate(req.params.id, req.body);
    if (!template) {
      throw new NotFoundError("Template not found");
    }
    logger.info("Template updated", { id: req.params.id });
    res.json(template);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await deleteTemplate(req.params.id);
    if (!deleted) {
      throw new NotFoundError("Template not found");
    }
    logger.info("Template deleted", { id: req.params.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post("/:id/use", async (req, res, next) => {
  try {
    const template = await incrementUsage(req.params.id);
    if (!template) {
      throw new NotFoundError("Template not found");
    }
    logger.info("Template usage incremented", { id: req.params.id, usage_count: template.usage_count });
    res.json(template);
  } catch (err) {
    next(err);
  }
});

router.post("/seed", async (_req, res, next) => {
  try {
    const seeded = await seedDefaultTemplates();
    if (seeded) {
      logger.info("Default templates seeded");
      res.json({ message: "Default templates seeded successfully" });
    } else {
      res.json({ message: "Templates already exist, skipping seed" });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
