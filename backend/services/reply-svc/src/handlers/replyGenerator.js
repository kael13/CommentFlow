import { findTemplateByScenarioAndTone } from "./templateQueries.js";

const INTENT_TO_SCENARIO = {
  lead: "buying_intent",
  question: "product_inquiry",
  complaint: "complaint",
  positive: "positive",
  spam: "spam",
  general: "general",
};

const FALLBACK_REPLIES = {
  lead: "Hi [name]! Thanks for your interest. Please send us a message and we'll be happy to assist you with your inquiry!",
  question: "Hi [name], great question! Our team would be happy to help. Feel free to send us a message for more details.",
  complaint: "Hi [name], we're sorry to hear about your experience. Please send us a private message so we can look into this.",
  positive: "Thank you so much, [name]! We really appreciate your kind words. \uD83C\uDF89",
  spam: null,
  general: "Thanks for your comment, [name]! Let us know if you have any questions.",
};

function replaceName(text, name) {
  if (!name) return text.replace(/\[name\]/g, "there");
  return text.replace(/\[name\]/g, name);
}

export async function generateReply(commentText, intent, tone, sentiment, authorName) {
  const scenario = INTENT_TO_SCENARIO[intent];
  if (!scenario) return null;

  if (intent === "spam") return null;

  const template = await findTemplateByScenarioAndTone(scenario, tone);

  if (template && template.template_text) {
    const reply = replaceName(template.template_text, authorName);
    return reply;
  }

  const fallback = FALLBACK_REPLIES[intent];
  if (fallback === null) return null;

  let reply = replaceName(fallback, authorName);
  reply = applyTone(reply, tone);
  return reply;
}

export function applyTone(text, tone) {
  switch (tone) {
    case "professional":
      return generateProfessional(text);
    case "gen_z":
      return generateGenZ(text);
    case "taglish":
      return generateTaglish(text);
    case "friendly":
      return generateFriendly(text);
    default:
      return text;
  }
}

function generateTaglish(text) {
  const tagalogWords = {
    "Thank you": "Salamat",
    "thank you": "salamat",
    "Thanks": "Salamat",
    "thanks": "salamat",
    "Hello": "Kumusta",
    "hello": "kumusta",
    "Hi": "Kumusta",
    "hi": "kumusta",
    "Please": "Pakiusap",
    "please": "pakiusap lang",
    "Sorry": "Pasensya na",
    "sorry": "pasensya na",
    "Friend": "Kaibigan",
    "friend": "kaibigan",
    "you": "kayo",
    "your": "ninyo",
    "we": "kami",
    "our": "amin",
    "will": "po",
    "soon": "mamaya",
    "later": "maya-maya",
    "now": "ngayon na",
    "really": "talaga",
    "very": "sobra",
    "also": "din",
    "too": "rin",
    "just": "lang",
    "already": "na",
    "yet": "pa",
    "because": "kasi",
    "so": "kaya",
    "for": "para sa",
    "but": "pero",
    "and": "at",
    "if": "kung",
    "this": "ito",
    "that": "iyan",
    "about": "tungkol",
    "with": "kasama",
    "all": "lahat",
    "very much": "talaga",
    "always": "palagi",
    "please": "lang",
  };

  const suffixes = [" po", " ha", " no", " ba", " kasi", " naman"];
  const prefixes = ["Sige, ", "Ah, ", "", ""];

  let result = `Ay, ${text}`;
  for (const [en, tl] of Object.entries(tagalogWords)) {
    const regex = new RegExp(`\\b${en}\\b`, "g");
    result = result.replace(regex, tl);
  }

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return `${prefix}${result}${suffix}!`;
}

function generateGenZ(text) {
  const genZReplacements = {
    "thank you": "omg thanks fr",
    "Thank you": "OMG thanks fr",
    "thanks": "thx bestie",
    "Thanks": "Thx bestie",
    "sorry": "omg rip sorry",
    "Sorry": "OMG rip sorry",
    "great": "lit",
    "wonderful": "fire",
    "amazing": "iconic",
    "amazing": "slay",
    "good": "bet",
    "awesome": "lowkey awesome",
    "please": "pls",
    "understand": "vibe with",
    "appreciate": "stan",
    "support": "the support",
    "question": "q",
    "message": "DM",
    "help": "help a bestie out",
    "team": "squad",
    "company": "the group chat",
    "customer": "bestie",
    "friend": "bestie",
    "happy": "vibing",
    "excited": "hyped",
    "interested": "intrigued fr",
    "value": "the vibes",
    "hear": "love that for you",
    "details": "deets",
    "comment": "the comment",
    "inquiry": "the 411",
    "link": "the link bestie",
    "representative": "our person",
    "contact": "slide into DMs",
    "support team": "squad",
    "available": "down",
    "interested": "down bad for",
    "call": "hop on a call",
    "service": "the service fr",
    "purchase": "cop",
    "buy": "cop",
    "order": "cop",
    "question": "q",
    "review": "the tea",
    "response": "reply bestie",
  };

  const genZPrefixes = ["omg ", "bestie ", "fr ", "no cap ", "ngl ", "period ", "", "slay "];
  const genZSuffixes = [" fr", " ngl", " no cap", " period", " bestie", " slay", "", "", ""];
  const genZEmojis = [" ✨", " 💅", " 💖", " 🔥", " 👀", " 💯", " 🥹", "", "", ""];

  let result = text;
  for (const [normal, slang] of Object.entries(genZReplacements)) {
    const regex = new RegExp(`\\b${normal}\\b`, "gi");
    result = result.replace(regex, slang);
  }

  result = result.replace(/[.!]+$/, "");
  const prefix = genZPrefixes[Math.floor(Math.random() * genZPrefixes.length)];
  const suffix = genZSuffixes[Math.floor(Math.random() * genZSuffixes.length)];
  const emoji = genZEmojis[Math.floor(Math.random() * genZEmojis.length)];

  return `${prefix}${result}${suffix}${emoji}`.trim();
}

function generateProfessional(text) {
  const formalReplacements = {
    "Hey": "Greetings",
    "hey": "greetings",
    "Hi": "Greetings",
    "hi": "greetings",
    "Thanks": "Thank you",
    "thanks": "thank you",
    "Awesome": "Excellent",
    "awesome": "excellent",
    "Great": "Excellent",
    "great": "excellent",
    "Sorry": "We apologize",
    "sorry": "we apologize",
    "Sure": "Certainly",
    "sure": "certainly",
    "Yeah": "Yes",
    "yeah": "yes",
    "Yep": "Yes",
    "yep": "yes",
    "Nope": "No",
    "nope": "no",
    "Cool": "Splendid",
    "cool": "splendid",
    "Hey there": "Dear customer",
    "hey there": "dear customer",
    "guys": "team",
    "folks": "team",
    "Lots of": "A significant number of",
    "lots of": "a significant number of",
    "a lot": "significantly",
    "super": "highly",
    "very": "quite",
    "really": "truly",
    "awesome": "commendable",
    "amazing": "remarkable",
    "thanks": "thank you",
    "okay": "acknowledged",
    "ok": "acknowledged",
    "gonna": "going to",
    "wanna": "wish to",
    "gotta": "must",
    "kinda": "somewhat",
    "sorta": "somewhat",
  };

  let result = text;
  for (const [informal, formal] of Object.entries(formalReplacements)) {
    const regex = new RegExp(`\\b${informal}\\b`, "g");
    result = result.replace(regex, formal);
  }

  result = result.replace(/!+/g, ".");
  if (result.endsWith(".") && !result.endsWith("!") && !result.endsWith("?")) {
  }

  return result;
}

function generateFriendly(text) {
  let result = text;

  const friendlyPrefixes = ["Hey! ", "Hi there! ", "", "Aww, "];
  const friendlySuffixes = [" 😊", " 🥰", " 💕", " 😄", " ✨", "", ""];
  const exclamations = ["!", "!!", "! 😊", "", " 🎉"];

  const prefix = friendlyPrefixes[Math.floor(Math.random() * friendlyPrefixes.length)];
  let suffix = friendlySuffixes[Math.floor(Math.random() * friendlySuffixes.length)];

  result = result.replace(/[.!]+$/, "");
  const exclamation = exclamations[Math.floor(Math.random() * exclamations.length)];

  if (!suffix && !exclamation) {
    suffix = " 😊";
  }

  return `${prefix}${result}${exclamation}${suffix}`;
}
