import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";

function scryptHash(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
};

export type PasswordHash = {
  algorithm: string;
  params: string;
  salt: string;
  hash: string;
};

/**
 * Hash a plaintext password using scrypt with a random per-user salt.
 * Format stored: scrypt$N=16384,r=8,p=1$<salt-hex>$<hash-hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptHash(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_OPTIONS.N},r=${SCRYPT_OPTIONS.r},p=${SCRYPT_OPTIONS.p}$${salt.toString(
    "hex"
  )}$${derived.toString("hex")}`;
}

/**
 * Verify a plaintext password against a stored hash. Always performs a full
 * comparison to reduce timing side channels.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 4 || parts[0] !== "scrypt") return false;

    const params = parts[1].split(",");
    const n = Number(params[0]);
    const r = Number(params[1].split("r=")[1]);
    const p = Number(params[2].split("p=")[1]);
    const salt = Buffer.from(parts[2], "hex");
    const expected = Buffer.from(parts[3], "hex");

    const actual = await scryptHash(password, salt, expected.length, {
      N: n,
      r,
      p,
    });

    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Generate an opaque random session token plus its SHA-256 hash. */
export function generateSessionToken(): {
  token: string;
  tokenHash: string;
} {
  const token = randomUUID().replace(/-/g, "") + randomBytes(24).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

/** Hash a session token so raw tokens are never stored in the database. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// In-memory rate limiter. Production deployments should use a shared store
// (Redis / Upstash) when running multiple instances.
const rateLimitStore = new Map<string, RateLimitEntry>();

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Sliding fixed-window rate limiter keyed by identifier.
 * Returns true when the request is allowed, false when it exceeds the limit.
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count += 1;
  if (entry.count > limit) {
    return false;
  }

  // Prevent unbounded growth of the store.
  if (rateLimitStore.size > 10_000) {
    for (const [key, value] of rateLimitStore) {
      if (value.resetAt <= now) rateLimitStore.delete(key);
    }
  }

  return true;
}

/** Generate a cryptographically secure random API-safe string. */
export function randomApiToken(): string {
  return randomBytes(32).toString("hex");
}