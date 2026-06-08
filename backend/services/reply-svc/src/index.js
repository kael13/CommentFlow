import express from "express";
import { errorMiddleware, logger } from "@commentflow/shared";
import replyRouter from "./routes/reply.js";
import templatesRouter from "./routes/templates.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3005", 10);

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
  res.json({ status: "ok", service: "reply-svc" });
});

app.use("/api/reply", replyRouter);
app.use("/api/reply/templates", templatesRouter);

app.use(errorMiddleware);

app.listen(PORT, () => {
  logger.info(`reply-svc listening on port ${PORT}`);
});

export default app;
