import { requireUser } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { getWorkoutByOwnership } from "@/services/workout.service";
import { apiHandler } from "../../_helpers";

export const GET = apiHandler(async (_request, ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  const workout = await getWorkoutByOwnership(user.id, id);
  return jsonSuccess({ workout });
});
