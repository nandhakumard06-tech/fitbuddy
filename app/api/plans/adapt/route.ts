import { requireUser, enforceRateLimit } from "@/lib/auth";
import { getRequestBody, jsonSuccess } from "@/lib/api";
import { adaptPlan } from "@/services/ai.service";
import { apiHandler } from "../../_helpers";

export const POST = apiHandler(async (request) => {
  await enforceRateLimit("plan-adapt", request, 10, 60_000);
  const user = await requireUser();
  const body = await getRequestBody(request);

  const feedback =
    typeof body === "object" && body !== null && typeof (body as { feedback?: unknown }).feedback === "string"
      ? (body as { feedback: string }).feedback
      : "";

  const result = await adaptPlan(user, { feedback });
  return jsonSuccess(result, 201);
});
