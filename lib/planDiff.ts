/**
 * Compares the current plan with an updated one and reports what changed,
 * so the user can review adaptation changes before activating.
 */

export interface PlanExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
}

export interface PlanDay {
  dayNumber: number;
  name: string;
  focus: string;
  durationMinutes: number;
  exercises: PlanExercise[];
}

export type PlanForDiff = { days: PlanDay[] };

export interface ExerciseDiff {
  exerciseId: string;
  name: string;
  status: "ADDED" | "REMOVED" | "UNCHANGED";
  sets: { from: number | null; to: number | null };
  reps: { from: number | null; to: number | null };
  restSeconds: { from: number | null; to: number | null };
}

export interface PlanDiff {
  scheduleChanged: boolean;
  addedDays: number[];
  removedDays: number[];
  exerciseChanges: ExerciseDiff[];
  changedCount: number;
}

function findExercise(
  days: PlanDay[],
  exerciseId: string
): PlanExercise | null {
  for (const day of days) {
    for (const exercise of day.exercises) {
      if (exercise.exerciseId === exerciseId) return exercise;
    }
  }
  return null;
}

export function diffPlans(current: PlanForDiff, updated: PlanForDiff): PlanDiff {
  const currentIds = new Set<string>();
  const updatedIds = new Set<string>();

  for (const day of current.days) {
    for (const exercise of day.exercises) currentIds.add(exercise.exerciseId);
  }
  for (const day of updated.days) {
    for (const exercise of day.exercises) updatedIds.add(exercise.exerciseId);
  }

  const currentDayNumbers = current.days.map((d) => d.dayNumber);
  const updatedDayNumbers = updated.days.map((d) => d.dayNumber);

  const addedDays = updatedDayNumbers.filter((n) => !currentDayNumbers.includes(n));
  const removedDays = currentDayNumbers.filter((n) => !updatedDayNumbers.includes(n));
  const scheduleChanged =
    addedDays.length > 0 ||
    removedDays.length > 0 ||
    currentDayNumbers.length !== updatedDayNumbers.length;

  const allIds = new Set([...currentIds, ...updatedIds]);
  const exerciseChanges: ExerciseDiff[] = [];

  for (const exerciseId of allIds) {
    const from = findExercise(current.days, exerciseId);
    const to = findExercise(updated.days, exerciseId);

    if (from && !to) {
      exerciseChanges.push({
        exerciseId,
        name: from.name,
        status: "REMOVED",
        sets: { from: from.sets, to: null },
        reps: { from: from.reps, to: null },
        restSeconds: { from: from.restSeconds, to: null },
      });
      continue;
    }

    if (!from && to) {
      exerciseChanges.push({
        exerciseId,
        name: to.name,
        status: "ADDED",
        sets: { from: null, to: to.sets },
        reps: { from: null, to: to.reps },
        restSeconds: { from: null, to: to.restSeconds },
      });
      continue;
    }

    if (from && to) {
      const changed =
        from.sets !== to.sets ||
        from.reps !== to.reps ||
        from.restSeconds !== to.restSeconds;

      if (changed) {
        exerciseChanges.push({
          exerciseId,
          name: to.name,
          status: "UNCHANGED",
          sets: { from: from.sets, to: to.sets },
          reps: { from: from.reps, to: to.reps },
          restSeconds: { from: from.restSeconds, to: to.restSeconds },
        });
      }
    }
  }

  const changedCount = exerciseChanges.filter(
    (e) => e.sets.from !== e.sets.to || e.reps.from !== e.reps.to
  ).length;

  return {
    scheduleChanged,
    addedDays,
    removedDays,
    exerciseChanges: exerciseChanges.slice(0, 60),
    changedCount,
  };
}