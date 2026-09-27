export class ApiRequestError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

type Envelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

function parseEnvelope<T>(res: Response): Promise<Envelope<T> | undefined> {
  return res.json().catch(() => undefined) as Promise<Envelope<T> | undefined>;
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.body) headers["Content-Type"] = "application/json";

  const res = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      ...headers,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  const body = await parseEnvelope<T>(res);

  if (!res.ok || !body || !body.success) {
    const info =
      body && "error" in body
        ? body.error
        : { code: "INTERNAL_ERROR", message: `Request failed (${res.status}).` };
    throw new ApiRequestError(res.status, info.code, info.message);
  }

  return body.data;
}

export function postJson<T = unknown>(path: string, body?: unknown): Promise<T> {
  return api<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}