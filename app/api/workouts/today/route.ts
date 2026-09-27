import { requireUser, enforceRateLimit } from "@/lib/auth";
import { getRequestBody, jsonSuccess } from "@/lib/api";
import {
  getTodaysWorkout,
  getActiveWorkoutSession,
  startWorkout,
} from "@/services/workout.service";
import { apiHandler } from "../../_helpers";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const today = await getTodaysWorkout(user.id);
  const activeSession = await getActiveWorkoutSession(user.id);
  return jsonSuccess({ ...today, activeSession });
});

export const POST = apiHandler(async (request) => {
  await enforceRateLimit("workout-session", request, 30);
  const user = await requireUser();
  const body = (await getRequestBody(request).catch(() => ({}))) as {
    workoutId?: string;
  };
  const workoutId = typeof body.workoutId === "string" ? body.workoutId : "";
  const session = await startWorkout(user.id, workoutId);
  return jsonSuccess({ session });
});
