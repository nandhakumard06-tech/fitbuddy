import { cert, getApps, initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

function buildCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are missing. Set FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in the environment " +
        "(e.g. .env.local)."
    );
  }

  privateKey = privateKey.replace(/\\n/g, "\n");

  return {
    projectId,
    credential: cert({ projectId, clientEmail, privateKey }),
  };
}

let cachedDb: Firestore | null = null;

/**
 * Returns the Firestore client, initializing the Firebase Admin app on first
 * use. Lazy so that importing modules during build/SSR never throws when
 * credentials are absent — errors surface only when a query actually runs.
 */
export function getFirestoreClient(): Firestore {
  if (cachedDb) return cachedDb;

  const app =
    getApps().length > 0 ? getApps()[0] : initializeApp(buildCredential());
  cachedDb = getFirestore(app);
  return cachedDb;
}

/**
 * Forwarding proxy that resolves to the real Firestore client on first
 * property access, keeping `firestore.collection(...)`, `firestore.doc(...)`
 * and `firestore.batch()` usable at module scope.
 */
export const firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (typeof prop === "symbol") {
      return undefined;
    }
    const db = getFirestoreClient();
    const value = (db as unknown as Record<string, unknown>)[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(db);
    }
    return value;
  },
});