import { cookies } from "next/headers";
import { ApiError, getClientIp } from "@/lib/api";
import {
  generateSessionToken,
  hashToken,
  rateLimit,
} from "@/lib/security";
import {
  COLLECTIONS,
  getById,
  deleteDoc,
  setDoc,
  type Session,
  type Profile,
  type User,
} from "@/lib/firestore";

export const SESSION_COOKIE_NAME = "fitbuddy_session";
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const RATE_LIMIT_WINDOW_MS = 60_000;

export async function createSession(userId: string): Promise<string> {
  const { token, tokenHash } = generateSessionToken();

  await setDoc(COLLECTIONS.sessions, tokenHash, {
    userId,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    createdAt: new Date(),
  });

  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  await deleteDoc(COLLECTIONS.sessions, hashToken(token));
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export type AuthedUser = User & {
  profile?: {
    id: string;
    fitnessLevel: string;
    goal: string;
    activityLevel: string;
    daysPerWeek: number;
  } | null;
};

/** Returns the current user when a valid session exists, otherwise null. */
export async function getCurrentUser(): Promise<AuthedUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const session = await getById<Session>(COLLECTIONS.sessions, hashToken(token));
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await deleteDoc(COLLECTIONS.sessions, session.id);
    await clearSessionCookie();
    return null;
  }

  const user = await getById<User>(COLLECTIONS.users, session.userId);
  if (!user) return null;

  const profile = await getById<Profile>(COLLECTIONS.profiles, session.userId);
  if (profile) {
    return {
      ...user,
      profile: {
        id: profile.id,
        fitnessLevel: profile.fitnessLevel,
        goal: profile.goal,
        activityLevel: profile.activityLevel,
        daysPerWeek: profile.daysPerWeek,
      },
    };
  }

  return { ...user, profile: null };
}

/** Requires an authenticated user; throws when the session is missing/expired. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw ApiError.unauthorized();
  return user;
}

/** Returns session expiry, or null when there is no session. */
export async function getSessionExpiry(): Promise<Date | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const session = await getById<Session>(COLLECTIONS.sessions, hashToken(token));
  return session?.expiresAt ?? null;
}

export async function enforceRateLimit(
  bucket: string,
  request: Request,
  limit = 20,
  windowMs = RATE_LIMIT_WINDOW_MS
): Promise<void> {
  const identifier = `${bucket}:${getClientIp(request)}`;
  if (!rateLimit(identifier, limit, windowMs)) {
    throw ApiError.rateLimited();
  }
}