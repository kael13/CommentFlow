import express from "express";
import { errorMiddleware, logger } from "@commentflow/shared";
import commentsRouter from "./routes/comments.js";
import settingsRouter from "./routes/settings.js";
import activityRouter from "./routes/activity.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

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
  res.json({ status: "ok", service: "comment-svc" });
});

app.use("/api/comments", commentsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/activity-log", activityRouter);

app.use(errorMiddleware);

app.listen(PORT, () => {
  logger.info(`comment-svc listening on port ${PORT}`);
});

export default app;
