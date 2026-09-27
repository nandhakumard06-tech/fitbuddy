import { requireUser } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { getActivePlan } from "@/services/workout.service";
import { getById } from "@/lib/firestore";
import { COLLECTIONS, type Profile } from "@/lib/firestore";
import { apiHandler } from "../../_helpers";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const [plan, profile] = await Promise.all([
    getActivePlan(user.id),
    getById<Profile>(COLLECTIONS.profiles, user.id),
  ]);

  if (!plan) {
    return jsonSuccess({
      plan: null,
      needsProfile: !profile,
      needsPlan: true,
    });
  }

  return jsonSuccess({
    plan: {
      ...plan,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      workouts: plan.workouts.map((workout) => ({
        ...workout,
        warmup: workout.warmup,
        cooldown: workout.cooldown,
        exercises: workout.exercises.map((we) => ({
          ...we,
          exercise: we.exercise
            ? {
                id: we.exercise.id,
                name: we.exercise.name,
                description: we.exercise.description,
                muscleGroup: we.exercise.muscleGroup,
                equipment: we.exercise.equipment,
                difficulty: we.exercise.difficulty,
              }
            : null,
        })),
      })),
    },
    needsProfile: !profile,
    needsPlan: false,
  });
});