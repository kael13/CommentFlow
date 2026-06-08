import { Router } from "express";
import { encryptPII, logger, ValidationError } from "@commentflow/shared";
import {
  findLeads,
  findLeadById,
  createLead,
  updateLead,
  findLeadByCommentId,
  softDeleteLead,
  getLeadStats,
} from "../handlers/leadQueries.js";
import { notifyLead } from "../handlers/notifications.js";

const router = Router();

const VALID_STATUSES = ["new", "contacted", "converted", "closed"];
const VALID_TRANSITIONS = {
  new: ["contacted", "closed"],
  contacted: ["converted", "closed"],
  converted: ["closed"],
  closed: ["new"],
};

function autoDetectProduct(text) {
  if (!text || typeof text !== "string") return null;
  const lower = text.toLowerCase();

  const patterns = [
    { keywords: ["pricing", "price", "cost", "how much", "subscription", "plan", "paid"], label: "pricing" },
    { keywords: ["feature", "capability", "can it", "does it", "integration"], label: "features" },
    { keywords: ["demo", "trial", "sample", "test drive", "walkthrough"], label: "demo" },
    { keywords: ["support", "help", "customer service", "contact"], label: "support" },
    { keywords: ["bug", "issue", "problem", "error", "broken"], label: "bug-report" },
    { keywords: ["api", "sdk", "developer", "webhook"], label: "developer" },
    { keywords: ["enterprise", "team", "organization", "business"], label: "enterprise" },
  ];

  for (const pattern of patterns) {
    if (pattern.keywords.some((kw) => lower.includes(kw))) {
      return pattern.label;
    }
  }

  const productMatch = lower.match(/\b(product|service|tool|app)\b/);
  if (productMatch) return "general";

  return null;
}

router.get("/", async (req, res, next) => {
  try {
    const { status, search, source, product_interest, date_from, date_to, limit, offset, order_by, order_dir } = req.query;

    const result = await findLeads(
      { status, search, source, product_interest, date_from, date_to },
      { limit, offset, order_by, order_dir }
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const stats = await getLeadStats();
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const lead = await findLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: { message: "Lead not found" } });
    }
    res.json({ data: lead });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { comment_id, name, contact_info, product_interest, source: reqSource } = req.body;

    if (!comment_id) {
      throw new ValidationError("comment_id is required");
    }
    if (!name || !name.trim()) {
      throw new ValidationError("name is required");
    }

    const existing = await findLeadByCommentId(comment_id);
    if (existing) {
      return res.status(409).json({
        error: { message: "A lead already exists for this comment", existing_lead_id: existing.id },
      });
    }

    const detectedInterest = product_interest || autoDetectProduct(req.body.comment_text || "");

    let contactInfoEncrypted = null;
    if (contact_info) {
      contactInfoEncrypted = encryptPII(typeof contact_info === "string" ? contact_info : JSON.stringify(contact_info));
    }

    const lead = await createLead({
      comment_id,
      name: name.trim(),
      contact_info_encrypted: contactInfoEncrypted,
      product_interest: detectedInterest,
      source: reqSource || "comment",
    });

    const notifiedVia = await notifyLead(lead).catch((err) => {
      logger.error("Initial notification failed for new lead", { leadId: lead.id, error: err });
      return [];
    });

    if (notifiedVia.length > 0) {
      await updateLead(lead.id, { notified_via: notifiedVia[0] });
      lead.notified_via = notifiedVia[0];
    }

    res.status(201).json({ data: lead, notified_via: notifiedVia });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const lead = await findLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: { message: "Lead not found" } });
    }

    const updates = {};

    if (req.body.status) {
      const newStatus = req.body.status;
      if (!VALID_STATUSES.includes(newStatus)) {
        throw new ValidationError(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
      }
      const allowed = VALID_TRANSITIONS[lead.status];
      if (!allowed || !allowed.includes(newStatus)) {
        throw new ValidationError(
          `Cannot transition from '${lead.status}' to '${newStatus}'. Allowed: ${(allowed || []).join(", ")}`
        );
      }
      updates.status = newStatus;
    }

    if (req.body.notes !== undefined) {
      updates.notes = req.body.notes;
    }

    if (req.body.contact_info) {
      updates.contact_info_encrypted = encryptPII(
        typeof req.body.contact_info === "string" ? req.body.contact_info : JSON.stringify(req.body.contact_info)
      );
    }

    const updated = await updateLead(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: { message: "Lead not found" } });
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await softDeleteLead(req.params.id);
    if (!result) {
      return res.status(404).json({ error: { message: "Lead not found" } });
    }
    res.json({ data: { message: "Lead deleted" } });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/notify", async (req, res, next) => {
  try {
    const lead = await findLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: { message: "Lead not found" } });
    }

    const notifiedVia = await notifyLead(lead);

    if (notifiedVia.length > 0) {
      await updateLead(lead.id, { notified_via: notifiedVia[0] });
    }

    res.json({ data: { notified_via: notifiedVia } });
  } catch (err) {
    next(err);
  }
});

export default router;
