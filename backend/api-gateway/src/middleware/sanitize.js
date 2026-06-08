const HTML_TAG_REGEX = /<[^>]*>/g;
const JAVASCRIPT_URI_REGEX = /^javascript\s*:/i;
const NULL_BYTE_REGEX = /\0/g;

function sanitizeValue(value) {
  if (typeof value === "string") {
    let cleaned = value.replace(HTML_TAG_REGEX, "");
    cleaned = cleaned.replace(JAVASCRIPT_URI_REGEX, "");
    cleaned = cleaned.replace(NULL_BYTE_REGEX, "");
    cleaned = cleaned.trim();
    return cleaned;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return sanitizeObject(value);
  }

  return value;
}

function sanitizeObject(obj) {
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeValue(value);
    }
  }

  return sanitized;
}

export function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
}
