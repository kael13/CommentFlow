import express from "express";
import helmet from "helmet";
import cors from "cors";
import { errorMiddleware, logger } from "@commentflow/shared";
import { routes } from "./routes/index.js";
import crypto from "node:crypto";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

function requestId(req, res, next) {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.set("x-request-id", req.id);
  next();
}

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(requestId);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(routes);

app.use(errorMiddleware);

const server = app.listen(PORT, () => {
  logger.info(`API Gateway listening on port ${PORT}`);
});

function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
