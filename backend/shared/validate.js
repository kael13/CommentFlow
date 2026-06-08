import { ValidationError } from "./errors.js";

function validateField(value, rules, fieldName) {
  const errors = [];

  if (rules.required && (value === undefined || value === null || value === "")) {
    errors.push(`${fieldName} is required`);
    return errors;
  }

  if (value === undefined || value === null || value === "") {
    return errors;
  }

  if (rules.type) {
    const actualType = Array.isArray(value) ? "array" : typeof value;
    if (actualType !== rules.type) {
      errors.push(`${fieldName} must be of type ${rules.type}`);
      return errors;
    }
  }

  if (rules.minLength !== undefined && typeof value === "string" && value.length < rules.minLength) {
    errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
  }

  if (rules.maxLength !== undefined && typeof value === "string" && value.length > rules.maxLength) {
    errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
  }

  if (rules.pattern !== undefined && typeof value === "string") {
    const regex = rules.pattern instanceof RegExp ? rules.pattern : new RegExp(rules.pattern);
    if (!regex.test(value)) {
      errors.push(`${fieldName} has invalid format`);
    }
  }

  if (rules.enum !== undefined && Array.isArray(rules.enum)) {
    if (!rules.enum.includes(value)) {
      errors.push(`${fieldName} must be one of: ${rules.enum.join(", ")}`);
    }
  }

  if (rules.min !== undefined && typeof value === "number" && value < rules.min) {
    errors.push(`${fieldName} must be at least ${rules.min}`);
  }

  if (rules.max !== undefined && typeof value === "number" && value > rules.max) {
    errors.push(`${fieldName} must be at most ${rules.max}`);
  }

  return errors;
}

function validateObject(data, schema) {
  const allErrors = [];

  for (const [fieldName, rules] of Object.entries(schema)) {
    const value = data ? data[fieldName] : undefined;
    const fieldErrors = validateField(value, rules, fieldName);
    allErrors.push(...fieldErrors);
  }

  return allErrors;
}

function createValidator(source, schema) {
  return (req, res, next) => {
    const data = req[source];
    const errors = validateObject(data, schema);

    if (errors.length > 0) {
      return next(new ValidationError("Validation failed", errors));
    }

    next();
  };
}

export function validateBody(schema) {
  return createValidator("body", schema);
}

export function validateQuery(schema) {
  return createValidator("query", schema);
}

export function validateParams(schema) {
  return createValidator("params", schema);
}
