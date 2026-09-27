import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "AI_ERROR"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    cause?: unknown
  ) {
    super(message, { cause });
    this.status = status;
    this.code = code;
  }

  static validation(message: string, cause?: unknown): ApiError {
    return new ApiError(400, "VALIDATION_ERROR", message, cause);
  }

  static unauthorized(message = "You must be signed in."): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "You do not have access to this resource."): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found."): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static rateLimited(message = "Too many requests. Please try again later."): ApiError {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  static ai(message = "The AI service is temporarily unavailable."): ApiError {
    return new ApiError(502, "AI_ERROR", message);
  }
}

/** Returns a unified error response, mapping known errors without leaking internals. */
export function toErrorResponse(status: number, code: ApiErrorCode, message: string): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

export function HttpErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return toErrorResponse(error.status, error.code, error.message);
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const field = firstIssue?.path.join(".") ?? "input";
    const message = firstIssue
      ? `${field}: ${firstIssue.message}`
      : "Invalid input.";
    return toErrorResponse(400, "VALIDATION_ERROR", message);
  }

  if (error instanceof SyntaxError) {
    return toErrorResponse(400, "VALIDATION_ERROR", "Invalid JSON body.");
  }

  const message =
    process.env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";

  return toErrorResponse(500, "INTERNAL_ERROR", message);
}

export function jsonSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export async function getRequestBody(request: Request): Promise<unknown> {
  return request.json();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}