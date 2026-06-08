import { query } from "@commentflow/shared";

const SCENARIOS = ["product_inquiry", "buying_intent", "complaint", "spam", "positive", "general"];
const TONES = ["gen_z", "taglish", "professional", "friendly"];

const DEFAULT_TEMPLATES = [
  { scenario: "product_inquiry", tone: "professional", template_text: "Thank you for your interest! Our team will send you the product details shortly via private message." },
  { scenario: "product_inquiry", tone: "friendly", template_text: "Hey there! Thanks for asking about our product! We'll DM you all the details soon 😊" },
  { scenario: "product_inquiry", tone: "gen_z", template_text: "omg thanks for the interest!! sliding into your DMs with all the deets soon ✨" },
  { scenario: "product_inquiry", tone: "taglish", template_text: "Salamat sa interest! I-DM namin sayo yung details ng product soon ha!" },
  { scenario: "buying_intent", tone: "professional", template_text: "Thank you for your purchase interest! A representative will reach out to assist you with your order." },
  { scenario: "buying_intent", tone: "friendly", template_text: "Awesome, glad you want to get one! We'll message you to help with your order real soon!" },
  { scenario: "buying_intent", tone: "gen_z", template_text: "yesss you won't regret this!! check your DMs for the order link bestie 💕" },
  { scenario: "buying_intent", tone: "taglish", template_text: "Salamat sa interest! I-message namin sayo yung order details in a bit!" },
  { scenario: "complaint", tone: "professional", template_text: "We sincerely apologize for the inconvenience. Our support team will address this promptly. Please check your messages." },
  { scenario: "complaint", tone: "friendly", template_text: "Oh no, we're sorry about that! Let us make it right — we'll message you directly to sort this out." },
  { scenario: "complaint", tone: "gen_z", template_text: "oh no we're so sorry!! 😭 let us fix this for you — check your DMs, we got you" },
  { scenario: "complaint", tone: "taglish", template_text: "Pasensya na talaga! I-message namin sayo para maayos namin 'to agad. Salamat sa patience!" },
  { scenario: "spam", tone: "professional", template_text: "This comment has been flagged for review. If this was a mistake, please contact our support team." },
  { scenario: "spam", tone: "friendly", template_text: "Hey, we noticed this comment might be spam. If it's not, no worries — just reach out to us!" },
  { scenario: "spam", tone: "gen_z", template_text: "hmm this looks sus 🤔 if it's legit just DM us and we'll sort it out!" },
  { scenario: "spam", tone: "taglish", template_text: "Mukhang spam 'to ah. Kung hindi naman, message lang sa amin para maayos namin!" },
  { scenario: "positive", tone: "professional", template_text: "Thank you for your kind words! We truly appreciate your support and feedback." },
  { scenario: "positive", tone: "friendly", template_text: "Aww thank you so much! Your support means the world to us! 🥰" },
  { scenario: "positive", tone: "gen_z", template_text: "STOP you're making us blush 🥹💖 thanks for the love bestie!!" },
  { scenario: "positive", tone: "taglish", template_text: "Salamat talaga sa suporta! Nakakatuwa naman, appreciate namin 'to!" },
  { scenario: "general", tone: "professional", template_text: "Thank you for your comment. We appreciate your engagement and will get back to you if needed." },
  { scenario: "general", tone: "friendly", template_text: "Thanks for dropping by! We love hearing from you — stay tuned for more updates!" },
  { scenario: "general", tone: "gen_z", template_text: "thanks for commenting!! we see you 👀💖 stay tuned for more content!" },
  { scenario: "general", tone: "taglish", template_text: "Salamat sa comment! Stay tuned lang for more updates ha!" },
];

export async function findTemplates(filters = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  for (const key of ["scenario", "tone"]) {
    if (filters[key] !== undefined) {
      conditions.push(`${key} = $${idx++}`);
      values.push(filters[key]);
    }
  }

  const sql = conditions.length > 0
    ? `SELECT * FROM templates WHERE ${conditions.join(" AND ")} ORDER BY usage_count ASC`
    : "SELECT * FROM templates ORDER BY scenario, tone";

  const result = await query(sql, values);
  return result.rows;
}

export async function findTemplateByScenarioAndTone(scenario, tone) {
  const result = await query(
    "SELECT * FROM templates WHERE scenario = $1 AND tone = $2 ORDER BY usage_count ASC LIMIT 1",
    [scenario, tone]
  );
  return result.rows[0] || null;
}

export async function createTemplate(data) {
  const { scenario, tone, template_text, is_active = true } = data;

  const result = await query(
    `INSERT INTO templates (scenario, tone, template_text, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [scenario, tone, template_text, is_active]
  );
  return result.rows[0];
}

export async function updateTemplate(id, data) {
  const allowed = ["scenario", "tone", "template_text", "is_active"];
  const updates = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      updates.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }

  if (updates.length === 0) return null;

  values.push(id);
  const result = await query(
    `UPDATE templates SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteTemplate(id) {
  const result = await query(
    "DELETE FROM templates WHERE id = $1 RETURNING id",
    [id]
  );
  return result.rowCount > 0;
}

export async function incrementUsage(id) {
  const result = await query(
    "UPDATE templates SET usage_count = usage_count + 1 WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows[0] || null;
}

export async function seedDefaultTemplates() {
  const countResult = await query("SELECT COUNT(*) as count FROM templates");
  if (parseInt(countResult.rows[0].count, 10) > 0) return false;

  for (const tpl of DEFAULT_TEMPLATES) {
    try {
      await createTemplate(tpl);
    } catch (err) {
      if (!err.message.includes("uq_templates_scenario_tone")) {
        throw err;
      }
    }
  }

  return true;
}

export { SCENARIOS, TONES };
