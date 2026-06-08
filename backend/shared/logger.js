const SERVICE_NAME = process.env.SERVICE_NAME || "commentflow";
const isProduction = process.env.NODE_ENV === "production";

function formatEntry(level, message, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    message,
  };

  if (meta && Object.keys(meta).length > 0) {
    entry.meta = meta;
  }

  return entry;
}

function prettyPrint(entry) {
  const { timestamp, level, service, message, meta } = entry;
  const levelColors = {
    info: "\x1b[36m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
  };
  const reset = "\x1b[0m";
  const color = levelColors[level] || "";

  let line = `${color}[${level.toUpperCase()}]${reset} ${timestamp} (${service}) ${message}`;
  if (meta) {
    line += ` ${JSON.stringify(meta)}`;
  }
  return line;
}

function output(entry) {
  if (isProduction) {
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    process.stdout.write(prettyPrint(entry) + "\n");
  }
}

function outputError(entry) {
  if (isProduction) {
    process.stderr.write(JSON.stringify(entry) + "\n");
  } else {
    process.stderr.write(prettyPrint(entry) + "\n");
  }
}

export const logger = {
  info(message, meta = {}) {
    output(formatEntry("info", message, meta));
  },

  warn(message, meta = {}) {
    output(formatEntry("warn", message, meta));
  },

  error(message, meta = {}) {
    const entry = formatEntry("error", message, meta);
    if (meta.error instanceof Error) {
      entry.meta = {
        ...meta,
        errorMessage: meta.error.message,
        errorStack: meta.error.stack,
      };
      delete entry.meta.error;
    }
    outputError(entry);
  },
};
