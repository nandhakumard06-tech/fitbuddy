import type { AiPlan } from "@/lib/validation";

export interface PlanSafetyContext {
  validExerciseIds: Set<string>;
  exerciseDifficultyMap: Map<string, string>;
  maxSets?: number;
  maxReps?: number;
  maxRestSeconds?: number;
  maxWorkoutMinutes?: number;
  minDays?: number;
  maxDays?: number;
}

/**
 * Verifies an AI plan against hard fitness-safety rules. Only safe plans are
 * returned; anything unsafe throws with a user-friendly message.
 */
export function validatePlanSafety(
  plan: AiPlan,
  context: PlanSafetyContext
): AiPlan {
  const maxSets = context.maxSets ?? 8;
  const maxReps = context.maxReps ?? 60;
  const maxRestSeconds = context.maxRestSeconds ?? 300;
  const maxWorkoutMinutes = context.maxWorkoutMinutes ?? 180;
  const minDays = context.minDays ?? 1;
  const maxDays = context.maxDays ?? 7;

  if (plan.days.length < minDays || plan.days.length > maxDays) {
    throw new Error(
      `Plan must contain between ${minDays} and ${maxDays} training days.`
    );
  }

  const seenExerciseIds = new Set<string>();
  const seen = new Set<number>();

  for (const day of plan.days) {
    if (seen.has(day.dayNumber)) {
      throw new Error(`Duplicate training day number ${day.dayNumber}.`);
    }
    seen.add(day.dayNumber);

    if (day.durationMinutes < 10 || day.durationMinutes > maxWorkoutMinutes) {
      throw new Error(
        `Workout "${day.name}" duration must stay between 10 and ${maxWorkoutMinutes} minutes.`
      );
    }

    if (!day.exercises.length) {
      throw new Error(`Workout "${day.name}" has no exercises.`);
    }

    for (const exercise of day.exercises) {
      if (!context.validExerciseIds.has(exercise.exerciseId)) {
        throw new Error(
          `Unknown exercise "${exercise.exerciseId}" is not in the approved library.`
        );
      }

      if (exercise.sets < 1 || exercise.sets > maxSets) {
        throw new Error(
          `Sets for an exercise must be between 1 and ${maxSets}.`
        );
      }

      if (exercise.reps < 1 || exercise.reps > maxReps) {
        throw new Error(
          `Reps for an exercise must be between 1 and ${maxReps}.`
        );
      }

      if (exercise.restSeconds < 20 || exercise.restSeconds > maxRestSeconds) {
        throw new Error(
          `Rest period must be between 20 and ${maxRestSeconds} seconds.`
        );
      }

      if (seenExerciseIds.has(exercise.exerciseId)) {
        throw new Error(
          `Exercise "${exercise.exerciseId}" appears more than once in the plan.`
        );
      }
      seenExerciseIds.add(exercise.exerciseId);
    }
  }

  return plan;
}