import { Router } from "express";
import { logger } from "@commentflow/shared";
import { getAllLeads, findLeadById } from "../handlers/leadQueries.js";
import { sendToSheets, sendToCRM } from "../handlers/notifications.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ available: ["csv", "sheets", "crm"] });
});

router.get("/csv", async (req, res, next) => {
  try {
    const { status, source, date_from, date_to } = req.query;
    const leads = await getAllLeads({ status, source, date_from, date_to });

    const headers = [
      "id", "comment_id", "name", "product_interest", "status",
      "source", "captured_at", "notified_via", "notes",
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [headers.join(",")];
    for (const lead of leads) {
      const row = headers.map((h) => escapeCsv(lead[h]));
      csvLines.push(row.join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="leads-${Date.now()}.csv"`);
    res.send(csvLines.join("\n"));
  } catch (err) {
    next(err);
  }
});

router.post("/sheets", async (req, res, next) => {
  try {
    const { lead_id, status, source, date_from, date_to } = req.body;

    let leads;
    if (lead_id) {
      const lead = await findLeadById(lead_id);
      if (!lead) {
        return res.status(404).json({ error: { message: "Lead not found" } });
      }
      leads = [lead];
    } else {
      leads = await getAllLeads({ status, source, date_from, date_to });
    }

    if (leads.length === 0) {
      return res.status(400).json({ error: { message: "No leads to export" } });
    }

    const results = await Promise.allSettled(leads.map((lead) => sendToSheets(lead)));

    const succeeded = results.filter((r) => r.status === "fulfilled" && r.value).length;
    const failed = results.filter((r) => r.status === "rejected" || !r.value).length;

    if (failed > 0) {
      logger.warn("Some leads failed to export to sheets", { succeeded, failed, total: leads.length });
    }

    res.json({ data: { total: leads.length, succeeded, failed } });
  } catch (err) {
    next(err);
  }
});

router.post("/crm", async (req, res, next) => {
  try {
    const { lead_id, status, source, date_from, date_to } = req.body;

    let leads;
    if (lead_id) {
      const lead = await findLeadById(lead_id);
      if (!lead) {
        return res.status(404).json({ error: { message: "Lead not found" } });
      }
      leads = [lead];
    } else {
      leads = await getAllLeads({ status, source, date_from, date_to });
    }

    if (leads.length === 0) {
      return res.status(400).json({ error: { message: "No leads to export" } });
    }

    const results = await Promise.allSettled(leads.map((lead) => sendToCRM(lead)));

    const succeeded = results.filter((r) => r.status === "fulfilled" && r.value).length;
    const failed = results.filter((r) => r.status === "rejected" || !r.value).length;

    if (failed > 0) {
      logger.warn("Some leads failed to export to CRM", { succeeded, failed, total: leads.length });
    }

    res.json({ data: { total: leads.length, succeeded, failed } });
  } catch (err) {
    next(err);
  }
});

export default router;
