import { logger } from "./logger.js";

const API_KEY = process.env.OPENROUTER_API_KEY || "";
const BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const FALLBACK_MODEL =
  process.env.OPENROUTER_FALLBACK_MODEL || "google/gemini-2.0-flash-lite";
const MAX_RETRIES = parseInt(process.env.OPENROUTER_MAX_RETRIES || "3", 10);
const SITE_URL = process.env.SITE_URL || "";
const SITE_NAME = process.env.SITE_NAME || "CommentFlow";

export class LLMError extends Error {
  constructor(message, { cause, model, retries } = {}) {
    super(message);
    this.name = "LLMError";
    this.cause = cause;
    this.model = model;
    this.retries = retries;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function isLLMAvailable() {
  return typeof API_KEY === "string" && API_KEY.length > 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptRequest(model, messages, options) {
  const { max_tokens = 1024, temperature = 0.7, response_format } = options;

  const body = {
    model,
    messages,
    max_tokens,
    temperature,
  };

  if (response_format === "json") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": SITE_URL,
      "X-Title": SITE_NAME,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenRouter");
  }

  if (response_format === "json") {
    return JSON.parse(content);
  }

  return content;
}

export async function callOpenRouter(messages, options = {}) {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await attemptRequest(MODEL, messages, options);
    } catch (err) {
      lastError = err;
      const delay = Math.pow(2, attempt) * 1000;
      logger.warn("OpenRouter request failed, retrying", {
        attempt: attempt + 1,
        model: MODEL,
        error: err.message,
        delayMs: delay,
      });
      await sleep(delay);
    }
  }

  logger.warn("Primary model exhausted retries, trying fallback", {
    model: MODEL,
    fallback: FALLBACK_MODEL,
  });

  try {
    return await attemptRequest(FALLBACK_MODEL, messages, options);
  } catch (err) {
    throw new LLMError("All LLM attempts failed", {
      cause: err,
      model: FALLBACK_MODEL,
      retries: MAX_RETRIES,
    });
  }
}

export async function classifyText(text) {
  const messages = [
    {
      role: "system",
      content:
        "You are a Facebook comment classifier for a business page. Analyze the comment and return ONLY valid JSON with these exact fields: intent (one of: lead, question, complaint, spam, positive, general), confidence (0.0-1.0), sentiment (one of: positive, neutral, negative), isLead (boolean true/false). Be concise and accurate.",
    },
    {
      role: "user",
      content: `Classify this Facebook comment: "${text}"`,
    },
  ];

  try {
    const result = await callOpenRouter(messages, {
      response_format: "json",
      temperature: 0.2,
      max_tokens: 256,
    });
    return {
      intent: result.intent,
      confidence: result.confidence,
      sentiment: result.sentiment,
      isLead: result.isLead,
    };
  } catch (err) {
    logger.error("classifyText failed", { error: err });
    return null;
  }
}

const TONE_DESCRIPTIONS = {
  professional: "Formal, polite, business-appropriate language. No emojis.",
  friendly: "Warm, approachable, conversational. Use emojis sparingly.",
  gen_z:
    "Casual, uses modern slang (fr, bestie, slay, no cap). Mostly lowercase. Trendy.",
  taglish:
    "Mix of Tagalog and English. Use Filipino particles like po, sige, kasi, naman, lang.",
};

export async function generateReply(
  commentText,
  tone,
  intent,
  sentiment,
  authorName
) {
  const toneDesc = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.professional;

  const messages = [
    {
      role: "system",
      content: `You are a customer service AI for a Facebook business page. Generate a helpful, contextually appropriate reply. Keep it under 3 sentences. Match the specified tone exactly. Address the user by name if provided.\n\nTone: ${tone} — ${toneDesc}`,
    },
    {
      role: "user",
      content: `Context: Intent=${intent}, Sentiment=${sentiment}, Author=${authorName || "unknown"}\nComment: "${commentText}"\nReply:`,
    },
  ];

  try {
    const result = await callOpenRouter(messages, {
      temperature: 0.8,
      max_tokens: 256,
    });
    return result;
  } catch (err) {
    logger.error("generateReply failed", { error: err });
    return null;
  }
}

export async function checkSpam(text) {
  const messages = [
    {
      role: "system",
      content:
        "You are a spam and toxicity detector for Facebook comments. Analyze the comment and return ONLY valid JSON: { isSpam: boolean, reason: string, score: 0-100 }. Consider: promotional spam, scams, phishing links, hate speech, harassment, off-topic bot behavior.",
    },
    {
      role: "user",
      content: `Analyze this comment: "${text}"`,
    },
  ];

  try {
    const result = await callOpenRouter(messages, {
      response_format: "json",
      temperature: 0.1,
      max_tokens: 256,
    });
    return {
      isSpam: result.isSpam,
      reason: result.reason,
      score: result.score,
    };
  } catch (err) {
    logger.error("checkSpam failed", { error: err });
    return null;
  }
}
