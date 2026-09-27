import { HttpErrorResponse } from "@/lib/api";
import type { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<Record<string, string>> };

/**
 * Wraps an API route handler with unified error handling and no-store headers.
 * The optional second argument exposes dynamic route params (Next.js 15).
 */
export function apiHandler(
  handler: (
    request: NextRequest,
    ctx: RouteContext
  ) => Promise<NextResponse>
): (
  request: NextRequest,
  ctx: RouteContext
) => Promise<NextResponse> {
  return async (request: NextRequest, ctx: RouteContext): Promise<NextResponse> => {
    try {
      const response = await handler(request, ctx);
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      response.headers.set("X-Content-Type-Options", "nosniff");
      return response;
    } catch (error) {
      const response = HttpErrorResponse(error);
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      return response;
    }
  };
}