import crypto from "node:crypto";
import fs from "node:fs";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function loadEncryptionKey() {
  const secretPath = "/run/secrets/encryption_key";
  try {
    if (fs.existsSync(secretPath)) {
      return fs.readFileSync(secretPath, "utf8").trim();
    }
  } catch {
    // Fall through to env var
  }

  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY must be set or available at /run/secrets/encryption_key"
    );
  }
  return key;
}

function deriveKey(raw) {
  const hash = crypto.createHash("sha256").update(raw).digest();
  if (hash.length !== KEY_LENGTH) {
    throw new Error("Derived key length mismatch");
  }
  return hash;
}

let cachedKey = null;

function getKey() {
  if (!cachedKey) {
    cachedKey = deriveKey(loadEncryptionKey());
  }
  return cachedKey;
}

export function encryptPII(plaintext) {
  if (plaintext === null || plaintext === undefined) {
    throw new Error("Cannot encrypt null or undefined value");
  }

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptPII(ciphertext) {
  if (!ciphertext || typeof ciphertext !== "string") {
    throw new Error("Invalid ciphertext");
  }

  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed ciphertext: expected iv:authTag:encrypted");
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const key = getKey();

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length");
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
