import { validateBody, validateQuery, validateParams } from "@commentflow/shared";

export function validateRequest(schema) {
  return validateBody(schema);
}

export const loginSchema = {
  email: { required: true, type: "string", pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, type: "string", minLength: 6 },
};

export const createCommentSchema = {
  content: { required: true, type: "string", minLength: 1, maxLength: 5000 },
  postId: { required: true, type: "string" },
  parentId: { required: false, type: "string" },
  authorName: { required: false, type: "string", maxLength: 100 },
  authorEmail: { required: false, type: "string", pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
};

export const updateReplySchema = {
  content: { required: true, type: "string", minLength: 1, maxLength: 5000 },
};

export const createLeadSchema = {
  name: { required: true, type: "string", minLength: 1, maxLength: 200 },
  email: { required: true, type: "string", pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  source: { required: false, type: "string", maxLength: 100 },
  message: { required: false, type: "string", maxLength: 5000 },
};

export const updateLeadSchema = {
  status: { required: false, type: "string", enum: ["new", "contacted", "qualified", "lost", "converted"] },
  notes: { required: false, type: "string", maxLength: 5000 },
  assignedTo: { required: false, type: "string" },
};

export const updateSettingsSchema = {
  moderationEnabled: { required: false, type: "boolean" },
  autoApproveUsers: { required: false, type: "boolean" },
  requireApproval: { required: false, type: "boolean" },
  profanityFilter: { required: false, type: "boolean" },
  maxCommentLength: { required: false, type: "number", min: 1, max: 10000 },
};

export const moderationActionSchema = {
  commentId: { required: true, type: "string" },
  action: { required: true, type: "string", enum: ["approve", "reject", "flag", "spam"] },
  reason: { required: false, type: "string", maxLength: 1000 },
};
