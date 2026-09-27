import { requireUser, enforceRateLimit } from "@/lib/auth";
import { getRequestBody, jsonSuccess } from "@/lib/api";
import { recordProgress, getProgress, getWeightTrend } from "@/services/progress.service";
import { apiHandler } from "../_helpers";

export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 50;
  const [records, trend] = await Promise.all([
    getProgress(user.id, limit),
    getWeightTrend(user.id),
  ]);
  return jsonSuccess({ records, trend });
});

export const POST = apiHandler(async (request) => {
  await enforceRateLimit("progress", request, 30);
  const user = await requireUser();
  const body = await getRequestBody(request);
  const record = await recordProgress(user.id, body as never);
  return jsonSuccess({ record }, 201);
});
