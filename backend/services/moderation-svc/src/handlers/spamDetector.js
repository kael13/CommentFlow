import { query as dbQuery } from "@commentflow/shared";

let cachedKeywords = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadKeywords() {
  const now = Date.now();
  if (cachedKeywords && now - cacheTimestamp < CACHE_TTL) {
    return cachedKeywords;
  }

  const result = await dbQuery(
    `SELECT keyword FROM spam_keywords WHERE is_active = TRUE`
  );
  cachedKeywords = result.rows.map((r) => r.keyword.toLowerCase());
  cacheTimestamp = now;
  return cachedKeywords;
}

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const ALL_CAPS_PATTERN = /[A-Z]{4,}/g;
const REPEATED_CHAR_PATTERN = /(.)\1{4,}/;
const PHONE_PATTERN = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

function countMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

export function checkComment(text, strictness = 5) {
  const normalizedText = text.trim();
  const textLower = normalizedText.toLowerCase();
  let score = 0;
  const reasons = [];

  const keywords = cachedKeywords || [];
  for (const kw of keywords) {
    if (textLower.includes(kw)) {
      score += 30;
      reasons.push(`Matched spam keyword: "${kw}"`);
      break;
    }
  }

  const urlCount = countMatches(normalizedText, URL_PATTERN);
  if (urlCount >= 3) {
    score += 25;
    reasons.push(`Multiple links (${urlCount})`);
  } else if (urlCount >= 1) {
    score += 10;
    reasons.push(`Contains link`);
  }

  const allCapsWords = normalizedText.match(ALL_CAPS_PATTERN);
  if (allCapsWords) {
    const capsRatio = allCapsWords.join("").length / normalizedText.length;
    if (capsRatio > 0.5) {
      score += 20;
      reasons.push("Excessive all-caps text");
    }
  }

  if (REPEATED_CHAR_PATTERN.test(normalizedText)) {
    score += 10;
    reasons.push("Repeated characters detected");
  }

  if (PHONE_PATTERN.test(normalizedText)) {
    score += 15;
    reasons.push("Phone number detected");
  }

  const threshold = strictness * 10;
  const isSpam = score >= threshold;

  return {
    isSpam,
    reason: reasons.length > 0 ? reasons.join("; ") : "No spam indicators",
    score,
  };
}

export async function detectTroll(authorFbId) {
  const result = await dbQuery(
    `SELECT COUNT(*) as offense_count FROM comments
     WHERE author_fb_id = $1 AND moderation_status = 'hidden'`,
    [authorFbId]
  );

  const previousOffenses = parseInt(result.rows[0].offense_count, 10);

  return {
    isTroll: previousOffenses >= 3,
    previousOffenses,
  };
}

const TOXIC_PHRASES = [
  "stupid", "idiot", "dumb", "hate", "loser", "scam", "ugly",
  "shut up", "moron", "trash", "worthless", "suck", "crap",
  "nobody asked", "delete this", "you're wrong", "fake news",
];

export function scanCommentForToxicity(text) {
  const textLower = text.toLowerCase();
  const found = [];

  for (const phrase of TOXIC_PHRASES) {
    if (textLower.includes(phrase)) {
      found.push(phrase);
    }
  }

  return {
    isToxic: found.length > 0,
    toxicPhrases: found,
  };
}

export { loadKeywords };
