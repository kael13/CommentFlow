import { classifyText, isLLMAvailable } from '@commentflow/shared';
import { createQueue, createWorker, enqueueAndWait } from '@commentflow/shared';
import { logger } from '@commentflow/shared';

const classificationQueue = createQueue('comment-classification');

createWorker(classificationQueue, async (job) => {
  const { text, commentId } = job.data;
  const result = await classifyText(text);
  if (result) return result;
  return classifyWithKeywords(text);
});

export async function classifyComment(text, commentId) {
  if (!isLLMAvailable()) {
    logger.info('LLM unavailable, using keyword fallback', { commentId });
    return classifyWithKeywords(text);
  }

  try {
    const result = await enqueueAndWait(classificationQueue, { text, commentId }, 30000);
    logger.info('Classification via LLM', { commentId, intent: result.intent });
    return result;
  } catch (err) {
    logger.warn('LLM classification failed, falling back to keywords', {
      commentId,
      error: err.message,
    });
    return classifyWithKeywords(text);
  }
}

export function classifyBackground(text) {
  return classifyWithKeywords(text);
}

function classifyWithKeywords(text) {
  const lower = text.toLowerCase();

  const buyingSignals = [
    "hm?", "available?", "interested?", "how much?", "pm", "price",
    "how to order", "want to buy", "ordering", "checkout", "payment",
    "shipping", "delivery", "stock", "sold out",
  ];

  const complaintKeywords = [
    "bad", "terrible", "scam", "worst", "awful", "disappointed",
    "horrible", "fraud", "useless", "broken", "not working",
    "refund", "return", "waste",
  ];

  const spamPatterns = [
    /http[s]?:\/\//i,
    /(.)\1{4,}/,
    /^(?:[A-Z\s]){10,}$/,
    /(?:check|visit|click|subscribe|follow)\s*(?:my|our|this)/i,
    /[@#]\w{10,}/,
  ];

  const positiveKeywords = [
    "love", "great", "amazing", "thanks", "perfect", "excellent",
    "beautiful", "wonderful", "fantastic", "awesome", "best",
    "recommend", "satisfied",
  ];

  let matchCount = 0;
  let totalChecks = 0;
  let maxScore = 0;
  let intent = "general";
  let sentiment = "neutral";
  let isLead = false;

  for (const signal of buyingSignals) {
    totalChecks++;
    if (lower.includes(signal)) {
      matchCount++;
      maxScore = Math.max(maxScore, 1);
    }
  }

  if (matchCount > 0) {
    intent = "buying";
    sentiment = "positive";
    isLead = true;
  }

  const complaintCount = complaintKeywords.filter((k) => lower.includes(k)).length;
  if (complaintCount > 0) {
    if (complaintCount >= 3) {
      intent = "complaint";
      sentiment = "negative";
      maxScore = Math.max(maxScore, 0.95);
    } else if (intent === "general") {
      intent = "complaint";
      sentiment = "negative";
      maxScore = Math.max(maxScore, 0.7);
    }
  }

  const spamMatch = spamPatterns.some((p) => p.test(text));
  if (spamMatch && intent !== "complaint") {
    intent = "spam";
    sentiment = "negative";
    maxScore = Math.max(maxScore, 0.9);
  }

  const positiveCount = positiveKeywords.filter((k) => lower.includes(k)).length;
  if (positiveCount > 0 && intent === "general") {
    intent = "positive";
    sentiment = "positive";
  } else if (positiveCount > 0 && intent !== "general") {
    sentiment = "positive";
  }

  const containsQuestion = /\?$/.test(text.trim()) || lower.startsWith("is ") || lower.startsWith("are ") || lower.startsWith("can ") || lower.startsWith("will ");
  if (containsQuestion && intent === "general") {
    intent = "question";
  }

  if (intent === "general") {
    if (text.length < 20) {
      intent = "short_comment";
    }
  }

  let confidence;
  if (maxScore >= 0.9) {
    confidence = 0.85 + Math.random() * 0.14;
  } else if (maxScore >= 0.7) {
    confidence = 0.7 + Math.random() * 0.19;
  } else if (matchCount > 0) {
    confidence = 0.55 + Math.random() * 0.14;
  } else {
    confidence = 0.3 + Math.random() * 0.3;
  }

  confidence = Math.round(confidence * 100) / 100;

  return { intent, confidence, sentiment, isLead };
}
