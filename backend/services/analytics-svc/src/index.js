import express from "express";
import { errorMiddleware, logger } from "@commentflow/shared";
import overviewRouter from "./routes/overview.js";
import timelineRouter from "./routes/timeline.js";
import sentimentRouter from "./routes/sentiment.js";
import viralRouter from "./routes/viral.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3003", 10);

app.use(express.json({ limit: "100kb" }));

app.set("trust proxy", (ip) => {
  if (ip === "127.0.0.1" || ip === "::1") return true;
  return false;
});

app.use((req, res, next) => {
  req.userId = req.headers["x-user-id"] || null;
  req.userEmail = req.headers["x-user-email"] || null;
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "analytics-svc" });
});

app.use("/api/analytics", overviewRouter);
app.use("/api/analytics/timeline", timelineRouter);
app.use("/api/analytics/sentiment", sentimentRouter);
app.use("/api/analytics/viral", viralRouter);

app.use(errorMiddleware);

app.listen(PORT, () => {
  logger.info(`analytics-svc listening on port ${PORT}`);
});

export default app;
