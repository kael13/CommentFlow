import pg from "pg";

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "commentflow",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  max: parseInt(process.env.DB_POOL_SIZE || "10", 10),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  ssl: isProduction
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.LOG_QUERIES === "true") {
    console.log("Executed query", { text, duration, rows: result.rowCount });
  }
  return result;
}

async function shutdown() {
  try {
    await pool.end();
  } catch (err) {
    console.error("Error closing PostgreSQL pool:", err);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export { pool };
