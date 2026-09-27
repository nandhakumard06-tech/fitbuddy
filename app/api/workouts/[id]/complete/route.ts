import { requireUser, enforceRateLimit } from "@/lib/auth";
import { getRequestBody, jsonSuccess } from "@/lib/api";
import { completeWorkout } from "@/services/workout.service";
import { apiHandler } from "../../../_helpers";

export const POST = apiHandler(async (request, ctx) => {
  await enforceRateLimit("workout-complete", request, 20);
  const { id } = await ctx.params;
  const user = await requireUser();
  const body = (await getRequestBody(request)) as Parameters<typeof completeWorkout>[2];
  const result = await completeWorkout(user.id, id, body);
  return jsonSuccess(result, 201);
});
