import admin from "firebase-admin";
import { readFileSync, existsSync } from "node:fs";
import { UnauthorizedError, logger } from "@commentflow/shared";

const FIREBASE_KEY_PATH =
  process.env.FIREBASE_ADMIN_KEY_PATH || "/run/secrets/firebase_admin_key";

let firebaseApp = null;

function initFirebase() {
  if (firebaseApp) return;

  try {
    let serviceAccount;

    if (existsSync(FIREBASE_KEY_PATH)) {
      const raw = readFileSync(FIREBASE_KEY_PATH, "utf-8");
      serviceAccount = JSON.parse(raw);
    } else if (process.env.FIREBASE_ADMIN_KEY) {
      serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const raw = readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf-8");
      serviceAccount = JSON.parse(raw);
    } else {
      logger.warn("No Firebase service account found — auth middleware will reject all requests");
      return;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    logger.info("Firebase Admin SDK initialized");
  } catch (err) {
    logger.error("Failed to initialize Firebase Admin SDK", { error: err });
  }
}

initFirebase();

export async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError(
        JSON.stringify({ code: "auth/missing-token", message: "Missing or malformed authorization header" })
      );
    }

    const token = authHeader.split(" ")[1];

    if (!firebaseApp) {
      throw new UnauthorizedError(
        JSON.stringify({ code: "auth/unavailable", message: "Authentication service unavailable" })
      );
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token, true);
    } catch (err) {
      if (err.code === "auth/id-token-expired") {
        throw new UnauthorizedError(
          JSON.stringify({ code: "auth/expired-token", message: "Firebase ID token has expired" })
        );
      }
      if (err.code === "auth/revoked-id-token" || err.message?.includes("revoked")) {
        throw new UnauthorizedError(
          JSON.stringify({ code: "auth/revoked-session", message: "Firebase session has been revoked" })
        );
      }
      throw new UnauthorizedError(
        JSON.stringify({ code: "auth/invalid-token", message: "Invalid Firebase ID token" })
      );
    }

    req.user = {
      id: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || decoded.displayName || null,
      picture: decoded.picture || decoded.photoURL || null,
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return next(err);
    }
    next(new UnauthorizedError(
      JSON.stringify({ code: "auth/invalid-token", message: "Invalid Firebase ID token" })
    ));
  }
}
