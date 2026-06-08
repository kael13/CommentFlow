import { logger } from "@commentflow/shared";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";
const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL || "";
const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || "";
const SMTP_WEBHOOK_URL = process.env.SMTP_WEBHOOK_URL || "";

function buildLeadMessage(lead) {
  const lines = [
    `New Lead Captured`,
    `Name: ${lead.name}`,
    `Product Interest: ${lead.product_interest || "N/A"}`,
    `Source: ${lead.source}`,
    `Captured At: ${lead.captured_at}`,
  ];
  if (lead.notes) {
    lines.push(`Notes: ${lead.notes}`);
  }
  return lines.join("\n");
}

export async function notifyLead(lead) {
  const settings = await loadSettings();
  const promises = [];

  if (settings.telegram_enabled) {
    promises.push(sendTelegram(TELEGRAM_CHAT_ID, buildLeadMessage(lead)));
  }

  if (settings.email_enabled && settings.email_address) {
    const subject = `New Lead: ${lead.name}`;
    const body = buildLeadMessage(lead);
    promises.push(sendEmail(settings.email_address, subject, body));
  }

  if (settings.sheets_enabled) {
    promises.push(sendToSheets(lead));
  }

  const results = await Promise.allSettled(promises);

  const notifiedVia = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      if (i === 0 && settings.telegram_enabled) notifiedVia.push("telegram");
      else if (i === 1 && settings.email_enabled) notifiedVia.push("email");
      else if (i === 2 && settings.sheets_enabled) notifiedVia.push("sheets");
    } else {
      logger.error("Notification delivery failed", {
        error: result.reason,
        leadId: lead.id,
      });
    }
  }

  return notifiedVia;
}

async function loadSettings() {
  const { query } = await import("@commentflow/shared");
  try {
    const result = await query(
      `SELECT
        COALESCE((SELECT value FROM settings WHERE key = 'lead_telegram_enabled'), 'false') AS telegram_enabled,
        COALESCE((SELECT value FROM settings WHERE key = 'lead_email_enabled'), 'false') AS email_enabled,
        COALESCE((SELECT value FROM settings WHERE key = 'lead_email_address'), '') AS email_address,
        COALESCE((SELECT value FROM settings WHERE key = 'lead_sheets_enabled'), 'false') AS sheets_enabled
       FROM (VALUES (1)) AS dummy`
    );
    const row = result.rows[0];
    return {
      telegram_enabled: row?.telegram_enabled === "true",
      email_enabled: row?.email_enabled === "true",
      email_address: row?.email_address || "",
      sheets_enabled: row?.sheets_enabled === "true",
    };
  } catch (err) {
    logger.error("Failed to load notification settings", { error: err });
    return {
      telegram_enabled: false,
      email_enabled: false,
      email_address: "",
      sheets_enabled: false,
    };
  }
}

export async function sendTelegram(chatId, message) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    logger.warn("Telegram notification skipped: missing bot token or chat ID");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram API error ${response.status}: ${body}`);
    }

    logger.info("Telegram notification sent", { chatId });
    return true;
  } catch (err) {
    logger.error("Failed to send Telegram notification", { error: err });
    throw err;
  }
}

export async function sendEmail(email, subject, body) {
  if (!email) {
    logger.warn("Email notification skipped: no recipient address");
    return false;
  }

  if (SMTP_WEBHOOK_URL) {
    try {
      const response = await fetch(SMTP_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, subject, body }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`SMTP webhook error ${response.status}: ${text}`);
      }

      logger.info("Email notification sent via webhook", { to: email });
      return true;
    } catch (err) {
      logger.error("Failed to send email via webhook", { error: err });
      throw err;
    }
  }

  if (N8N_WEBHOOK_URL) {
    try {
      const response = await fetch(`${N8N_WEBHOOK_URL}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, subject, body }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`n8n email webhook error ${response.status}: ${text}`);
      }

      logger.info("Email notification sent via n8n", { to: email });
      return true;
    } catch (err) {
      logger.error("Failed to send email via n8n", { error: err });
      throw err;
    }
  }

  logger.warn("Email not sent: no SMTP_WEBHOOK_URL or N8N_WEBHOOK_URL configured");
  return false;
}

export async function sendToSheets(lead) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) {
    logger.warn("Sheets export skipped: GOOGLE_SHEETS_WEBHOOK_URL not configured");
    return false;
  }

  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: lead.id,
        comment_id: lead.comment_id,
        name: lead.name,
        product_interest: lead.product_interest,
        status: lead.status,
        source: lead.source,
        captured_at: lead.captured_at,
        notes: lead.notes,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Sheets webhook error ${response.status}: ${text}`);
    }

    logger.info("Lead exported to Google Sheets", { leadId: lead.id });
    return true;
  } catch (err) {
    logger.error("Failed to export lead to Sheets", { error: err });
    throw err;
  }
}

export async function sendToCRM(lead) {
  if (!CRM_WEBHOOK_URL) {
    logger.warn("CRM export skipped: CRM_WEBHOOK_URL not configured");
    return false;
  }

  try {
    const response = await fetch(CRM_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: lead.id,
        comment_id: lead.comment_id,
        name: lead.name,
        contact_info_encrypted: lead.contact_info_encrypted,
        product_interest: lead.product_interest,
        status: lead.status,
        source: lead.source,
        captured_at: lead.captured_at,
        notes: lead.notes,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CRM webhook error ${response.status}: ${text}`);
    }

    logger.info("Lead pushed to CRM", { leadId: lead.id });
    return true;
  } catch (err) {
    logger.error("Failed to push lead to CRM", { error: err });
    throw err;
  }
}
