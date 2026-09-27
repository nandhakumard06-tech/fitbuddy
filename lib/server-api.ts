import { cookies } from "next/headers";
import { ApiRequestError } from "@/lib/http";

const base = process.env.APP_URL ?? "http://localhost:3000";

type Envelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

/** Server-side fetch against the internal API, forwarding the session cookie. */
export async function serverApi<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const cookie = await cookies();

  const headers: Record<string, string> = { cookie: cookie.toString() };
  if (init?.body) headers["Content-Type"] = "application/json";

  const res = await fetch(new URL(path, base), {
    cache: "no-store",
    ...init,
    headers: {
      ...headers,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  const body = (await res.json().catch(() => undefined)) as
    | Envelope<T>
    | undefined;

  if (!res.ok || !body || !body.success) {
    const info =
      body && "error" in body
        ? body.error
        : { code: "INTERNAL_ERROR", message: `Request failed (${res.status}).` };
    throw new ApiRequestError(res.status, info.code, info.message);
  }

  return body.data;
}