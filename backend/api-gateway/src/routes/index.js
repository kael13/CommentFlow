import { Router } from "express";
import httpProxy from "http-proxy";
import { authenticate } from "../middleware/auth.js";
import {
  commentLimiter,
  analyticsLimiter,
  replyLimiter,
  classifyLimiter,
  moderationLimiter,
  leadLimiter,
  loginLimiter,
} from "../middleware/rate-limit.js";
import { sanitizeInput } from "../middleware/sanitize.js";
import { auditLog } from "../middleware/audit.js";
import { validateRequest, loginSchema } from "../middleware/validate.js";
import { logger } from "@commentflow/shared";

const COMMENT_SVC = process.env.COMMENT_SVC_URL || "http://comment-svc:3001";
const LEAD_SVC = process.env.LEAD_SVC_URL || "http://lead-svc:3002";
const ANALYTICS_SVC = process.env.ANALYTICS_SVC_URL || "http://analytics-svc:3003";
const MODERATION_SVC = process.env.MODERATION_SVC_URL || "http://moderation-svc:3004";
const REPLY_SVC = process.env.REPLY_SVC_URL || "http://reply-svc:3005";

const proxy = httpProxy.createProxyServer({
  proxyTimeout: 30000,
  timeout: 30000,
});

proxy.on("proxyReq", (proxyReq, req) => {
  if (req.user) {
    proxyReq.setHeader("x-user-id", req.user.id);
    proxyReq.setHeader("x-user-email", req.user.email || "");
  }
  proxyReq.setHeader("x-request-id", req.id || "");
});

proxy.on("error", (err, req, res) => {
  const target = req._proxyTarget;
  logger.error("Proxy error", {
    target,
    path: req.path,
    method: req.method,
    error: err.message,
  });
  if (!res.headersSent) {
    res.status(503).json({
      error: {
        code: "proxy/unavailable",
        message: "Upstream service unavailable",
      },
    });
  }
});

function forwardRequest(target) {
  return (req, res) => {
    req._proxyTarget = target;
    req.url = req.originalUrl;
    proxy.web(req, res, { target, changeOrigin: true });
  };
}

const router = Router();

router.use(auditLog);

router.post(
  "/api/auth/login",
  loginLimiter,
  sanitizeInput,
  validateRequest(loginSchema),
  forwardRequest(COMMENT_SVC)
);

router.use("/api/comments/classify", authenticate, classifyLimiter, sanitizeInput, forwardRequest(COMMENT_SVC));
router.use("/api/comments/posts", authenticate, commentLimiter, forwardRequest(COMMENT_SVC));
router.use("/api/comments/thread", authenticate, commentLimiter, forwardRequest(COMMENT_SVC));
router.use("/api/comments", authenticate, commentLimiter, sanitizeInput, forwardRequest(COMMENT_SVC));

router.use("/api/leads", authenticate, leadLimiter, sanitizeInput, forwardRequest(LEAD_SVC));

router.use("/api/analytics", authenticate, analyticsLimiter, forwardRequest(ANALYTICS_SVC));

router.use("/api/moderation", authenticate, moderationLimiter, sanitizeInput, forwardRequest(MODERATION_SVC));

router.use("/api/reply", authenticate, replyLimiter, sanitizeInput, forwardRequest(REPLY_SVC));

router.use("/api/settings", authenticate, commentLimiter, sanitizeInput, forwardRequest(COMMENT_SVC));

router.use("/api/activity-log", authenticate, commentLimiter, forwardRequest(COMMENT_SVC));

export { router as routes };
