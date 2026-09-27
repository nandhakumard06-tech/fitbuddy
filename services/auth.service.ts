import { ApiError } from "@/lib/api";
import { hashPassword, verifyPassword, rateLimit } from "@/lib/security";
import { loginSchema, registerSchema } from "@/lib/validation";
import { createSession } from "@/lib/auth";
import {
  COLLECTIONS,
  getById,
  setDoc,
  newId,
  type User,
} from "@/lib/firestore";

const AUTH_RATE_LIMIT = { limit: 10, windowMs: 60_000 };

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export interface AuthResult {
  user: User;
  token: string;
}

function ensureRateLimit(identifier: string): void {
  if (!rateLimit(identifier, AUTH_RATE_LIMIT.limit, AUTH_RATE_LIMIT.windowMs)) {
    throw ApiError.rateLimited("Too many attempts. Please wait a minute.");
  }
}

async function findUserByEmail(email: string): Promise<User | null> {
  const emailRef = await getById<{ userId: string }>(
    COLLECTIONS.emails,
    email
  );
  if (!emailRef?.userId) return null;
  return getById<User>(COLLECTIONS.users, emailRef.userId);
}

export async function registerUser(
  input: RegisterInput,
  identifier: string
): Promise<AuthResult> {
  ensureRateLimit(`register:${identifier}`);

  const data = registerSchema.parse(input);
  const email = data.email.toLowerCase();

  const existing = await findUserByEmail(email);
  if (existing) {
    throw ApiError.conflict("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(data.password);

  const userId = newId(COLLECTIONS.users);
  const now = new Date();
  await setDoc(COLLECTIONS.users, userId, {
    name: data.name,
    email,
    passwordHash,
    xp: 0,
    createdAt: now,
    updatedAt: now,
  });
  await setDoc(COLLECTIONS.emails, email, { userId, createdAt: now });

  const user = (await getById<User>(COLLECTIONS.users, userId)) as User;
  const token = await createSession(user.id);
  return { user, token };
}

export async function loginUser(
  input: LoginInput,
  identifier: string
): Promise<AuthResult> {
  ensureRateLimit(`login:${identifier}`);

  const data = loginSchema.parse(input);
  const email = data.email.toLowerCase();

  const user = await findUserByEmail(email);
  if (!user) {
    // Perform a dummy verification to avoid revealing whether the email exists.
    await verifyPassword(data.password, "scrypt$16384,r=8,p=1$00$00");
    throw ApiError.unauthorized("Invalid email or password.");
  }

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  const token = await createSession(user.id);
  return { user, token };
}