import { requireUser, enforceRateLimit } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { startWorkout } from "@/services/workout.service";
import { apiHandler } from "../../../_helpers";

export const POST = apiHandler(async (request, ctx) => {
  await enforceRateLimit("workout-start", request, 30);
  const { id } = await ctx.params;
  const user = await requireUser();
  const session = await startWorkout(user.id, id);
  return jsonSuccess({ session });
});
