import { ApiError } from "@/lib/api";
import { completeWorkoutSchema } from "@/lib/validation";
import { checkAndAwardAchievements, awardXp, XP_BREAKDOWN } from "./achievements.service";
import {
  COLLECTIONS,
  addDoc,
  docRef,
  findFirst,
  getById,
  getItemsByIds,
  queryWhere,
  runBatch,
  setDoc,
  workoutExercisesPath,
  type Exercise,
  type ExercisePerformance,
  type FitnessPlan,
  type Profile,
  type Workout,
  type WorkoutCompletion,
  type WorkoutExercise,
} from "@/lib/firestore";

const DAY_INDEX: Record<string, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

const DAY_TO_NUMBER: Record<string, number> = {
  SUNDAY: 7,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export type WorkoutWithExercises = Workout & {
  exercises: (WorkoutExercise & { exercise: Exercise | null })[];
};

export type PlanWithWorkouts = FitnessPlan & {
  workouts: WorkoutWithExercises[];
};

async function loadWorkoutExercises(workout: Workout): Promise<WorkoutWithExercises> {
  const exercises = await queryWhere<WorkoutExercise>(
    workoutExercisesPath(workout.id),
    [],
    { orderBy: { field: "orderIndex", direction: "asc" } }
  );

  const exerciseMap = exercises.length
    ? await getItemsByIds<Exercise>(
        COLLECTIONS.exercises,
        exercises.map((e) => e.exerciseId)
      )
    : new Map<string, Exercise>();

  return {
    ...workout,
    exercises: exercises.map((we) => ({
      ...we,
      exercise: exerciseMap.get(we.exerciseId) ?? null,
    })),
  };
}

export async function loadPlanWorkouts<T extends FitnessPlan>(plan: T): Promise<T & { workouts: WorkoutWithExercises[] }> {
  const workouts = await queryWhere<Workout>(COLLECTIONS.workouts, [
    { field: "planId", op: "==", value: plan.id },
  ]);

  const ordered = [...workouts].sort((a, b) => a.dayNumber - b.dayNumber);

  return {
    ...plan,
    workouts: await Promise.all(ordered.map(loadWorkoutExercises)),
  };
}

export async function getActivePlan(userId: string): Promise<PlanWithWorkouts | null> {
  const plans = await queryWhere<FitnessPlan>(COLLECTIONS.plans, [
    { field: "userId", op: "==", value: userId },
  ]);

  const activePlan = plans.find(
    (plan) => plan.isActive && plan.status === "ACTIVE"
  );

  if (!activePlan) return null;
  return loadPlanWorkouts(activePlan);
}

export async function getPlanById(userId: string, planId: string) {
  const plan = await getById<FitnessPlan>(COLLECTIONS.plans, planId);
  if (!plan || plan.userId !== userId) {
    throw ApiError.notFound("Plan not found.");
  }
  return loadPlanWorkouts(plan);
}

export async function listPlans(userId: string) {
  const [plans, workouts] = await Promise.all([
    queryWhere<FitnessPlan>(COLLECTIONS.plans, [
      { field: "userId", op: "==", value: userId },
    ]),
    queryWhere<Workout>(COLLECTIONS.workouts, [
      { field: "userId", op: "==", value: userId },
    ]),
  ]);

  const workoutCounts = new Map<string, number>();
  for (const workout of workouts) {
    workoutCounts.set(workout.planId, (workoutCounts.get(workout.planId) ?? 0) + 1);
  }

  return plans
    .sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0))
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      goal: plan.goal,
      durationWeeks: plan.durationWeeks,
      source: plan.source,
      status: plan.status,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      _count: { workouts: workoutCounts.get(plan.id) ?? 0 },
    }));
}

/**
 * Determines which workout maps to today based on the user's preferred
 * training days. Falls back to a rotating dayNumber schedule when the user
 * has not specified preferred days (legacy/assessed accounts).
 */
export async function getTodaysWorkout(userId: string) {
  const plan = await getActivePlan(userId);
  if (!plan || plan.workouts.length === 0) return { plan: null, workout: null };

  const profile = await getById<Profile>(COLLECTIONS.profiles, userId);
  const prefDays = profile?.preferredTrainingDays ?? [];
  const todayNumber = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const existingDays = new Set(plan.workouts.map((w) => w.dayNumber));

  // 1) Preferred day match.
  if (prefDays.length > 0) {
    const todayKey = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ][todayNumber];
    const plannedMatch = prefDays.find((d) => d.toUpperCase() === todayKey);
    if (plannedMatch) {
      const workout = plan.workouts.find(
        (w) => w.dayNumber === DAY_TO_NUMBER[todayKey]
      );
      if (workout) return { plan, workout };
    }

    const next = findNextScheduledWorkout(plan.workouts, prefDays);
    return next;
  }

  // 2) Rotating schedule mapped onto preferred days.
  const schedule = plan.workouts
    .slice()
    .sort((a, b) => a.dayNumber - b.dayNumber);

  const trainingDays = prefDays.length
    ? prefDays.map((d) => DAY_INDEX[d.toUpperCase()]).sort((a, b) => a - b)
    : Array.from({ length: Math.min(schedule.length, 7) }, (_, i) => i + 1);

  if (trainingDays.includes(todayNumber)) {
    const position = trainingDays.indexOf(todayNumber);
    const workout = schedule.find((w) => w.dayNumber === position + 1);
    if (workout) return { plan, workout };
  }

  return { plan, workout: null };
}

function findNextScheduledWorkout(
  workouts: { id: string; dayNumber: number }[],
  preferredDays: string[]
) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(tomorrow);
    d.setDate(d.getDate() + offset);
    const dayNumber = d.getDay() === 0 ? 7 : d.getDay();
    const dayKey = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ][dayNumber];

    if (preferredDays.some((pd) => pd.toUpperCase() === dayKey)) {
      const workout = workouts.find((w) => w.dayNumber === dayNumber);
      if (workout) {
        return {
          plan: null,
          workout: { ...workout, scheduledFor: d.toISOString() },
        };
      }
      break;
    }
  }

  return { plan: null, workout: workouts[0] ?? null };
}

export async function getWorkoutByOwnership(userId: string, workoutId: string) {
  const workout = await getById<Workout>(COLLECTIONS.workouts, workoutId);
  if (!workout) throw ApiError.notFound("Workout not found.");
  if (workout.userId !== userId) {
    throw ApiError.forbidden("You do not have access to this workout.");
  }

  const withExercises = await loadWorkoutExercises(workout);
  return { ...withExercises, plan: { userId: withExercises.userId } };
}

/** Marks an in-progress session for a workout (idempotent). */
export async function startWorkout(userId: string, workoutId: string) {
  await getWorkoutByOwnership(userId, workoutId);

  const existing = (await queryWhere<WorkoutCompletion>(COLLECTIONS.completions, [
    { field: "userId", op: "==", value: userId },
  ])).find(
    (entry) =>
      entry.workoutId === workoutId &&
      entry.completedAt == null
  );
  if (existing) return existing;

  const now = new Date();
  return addDoc<WorkoutCompletion>(COLLECTIONS.completions, {
    userId,
    workoutId,
    startedAt: now,
    completedAt: null,
    durationSeconds: 0,
    completionPct: 0,
    exercisesCompleted: 0,
    setsCompleted: 0,
    totalExercises: 0,
    totalSets: 0,
    notes: null,
    xpEarned: 0,
    createdAt: now,
  });
}

export async function getActiveWorkoutSession(userId: string) {
  const completions = await queryWhere<WorkoutCompletion>(COLLECTIONS.completions, [
    { field: "userId", op: "==", value: userId },
  ]);

  const completion = completions
    .filter((entry) => entry.completedAt == null)
    .sort(
      (a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0)
    )[0] ?? null;

  if (!completion) return null;

  const workout = await getById<Workout>(COLLECTIONS.workouts, completion.workoutId);
  if (!workout) return completion;

  const withExercises = await loadWorkoutExercises(workout);
  return { ...completion, workout: withExercises };
}

export interface CompleteWorkoutInput {
  exercises: {
    exerciseId: string;
    sets: { weightKg?: number | null; reps?: number | null; completed?: boolean }[];
    rpe?: number | null;
    completed?: boolean;
  }[];
  notes?: string | null;
  durationSeconds?: number | null;
}

export async function completeWorkout(
  userId: string,
  workoutId: string,
  input: CompleteWorkoutInput
) {
  const workout = await getWorkoutByOwnership(userId, workoutId);
  const data = completeWorkoutSchema.parse(input);

  const templateExercises = new Map(
    workout.exercises.map((we) => [we.exerciseId, we])
  );

  let exercisesCompleted = 0;
  let setsCompleted = 0;
  let totalSets = 0;
  const completedAt = new Date();
  const performanceCreates: {
    userId: string;
    exerciseId: string;
    date: Date;
    sets: number[];
    reps: number[];
    weights: number[];
    bestWeight: number | null;
    bestVolume: number | null;
    rpe: number | null;
  }[] = [];
  let personalRecords = 0;
  const allCompleted = data.exercises.length;

  for (const tracked of data.exercises) {
    const template = templateExercises.get(tracked.exerciseId);
    if (!template) {
      throw ApiError.validation(
        `Exercise "${tracked.exerciseId}" is not part of this workout.`
      );
    }

    const completedSets = tracked.sets.filter((s) => s.completed !== false);
    const sets = completedSets.map((s) => Number(s.reps ?? 0));
    const reps = completedSets.map((s) => Number(s.reps ?? 0));
    const weights = completedSets.map((s) => Number(s.weightKg ?? 0));
    const isCompleted = tracked.completed !== false;

    if (isCompleted && !reps.some((r) => r > 0)) {
      throw ApiError.validation(
        `Exercise "${template.exercise?.name ?? "Exercise"}" needs at least one completed set.`
      );
    }

    totalSets += template.sets;
    if (isCompleted) {
      exercisesCompleted += 1;
      setsCompleted += completedSets.length;
    }

    const bestWeight = weights.length ? Math.max(...weights) : 0;
    const bestVolume = sets.reduce((acc, r, i) => acc + r * weights[i], 0);

    performanceCreates.push({
      userId,
      exerciseId: template.exerciseId,
      date: completedAt,
      sets,
      reps,
      weights,
      bestWeight: bestWeight > 0 ? bestWeight : null,
      bestVolume: bestVolume > 0 ? Number(bestVolume.toFixed(1)) : null,
      rpe: tracked.rpe ?? null,
    });
  }

  const totalExercises = templateExercises.size;
  const completionPct =
    totalExercises > 0 ? Math.round((exercisesCompleted / totalExercises) * 100) : 0;

  const completion = (await addDoc<WorkoutCompletion>(COLLECTIONS.completions, {
    userId,
    workoutId,
    startedAt: new Date(new Date().getTime() - (data.durationSeconds ?? 3600) * 1000),
    completedAt,
    durationSeconds: data.durationSeconds ?? 0,
    completionPct,
    exercisesCompleted,
    setsCompleted,
    totalExercises,
    totalSets,
    notes: data.notes ?? null,
    xpEarned: 0,
    createdAt: new Date(),
  })) as WorkoutCompletion;

  const exerciseIds = [...new Set(performanceCreates.map((p) => p.exerciseId))];
  const byExercise = new Map<string, ExercisePerformance[]>();
  const exerciseRows = await queryWhere<ExercisePerformance>(
    COLLECTIONS.performances,
    [
      { field: "userId", op: "==", value: userId },
      { field: "exerciseId", op: "in", value: exerciseIds },
    ]
  );
  for (const row of exerciseRows) {
    const list = byExercise.get(row.exerciseId) ?? [];
    list.push(row);
    byExercise.set(row.exerciseId, list);
  }

  for (const performance of performanceCreates) {
    const previousRounds = (byExercise.get(performance.exerciseId) ?? []).filter(
      (p) => p.bestWeight != null && Number(p.bestWeight) > 0
    );
    const previousBest = previousRounds.length
      ? Math.max(...previousRounds.map((p) => Number(p.bestWeight)))
      : null;

    const created = (await addDoc<ExercisePerformance>(COLLECTIONS.performances, {
      ...performance,
      completionId: completion.id,
      notes: null,
      createdAt: new Date(),
    })) as ExercisePerformance;

    if (
      created.bestWeight != null &&
      (previousBest === null || Number(created.bestWeight) > previousBest)
    ) {
      personalRecords += 1;
    }
  }

  let xpEarned = XP_BREAKDOWN.workout;
  xpEarned += personalRecords * XP_BREAKDOWN.personalRecord;
  await awardXp(userId, xpEarned);

  await setDoc(COLLECTIONS.completions, completion.id, { xpEarned });

  await checkAndAwardAchievements(userId);

  return {
    completion: {
      id: completion.id,
      completionPct,
      exercisesCompleted,
      setsCompleted,
      totalExercises,
      totalSets,
      durationSeconds: data.durationSeconds ?? 0,
      xpEarned,
    },
    personalRecords,
    completedAt: completedAt.toISOString(),
  };
}

export async function getExerciseLibraryPublic() {
  const exercises = await queryWhere<Exercise>(
    COLLECTIONS.exercises,
    [],
    { orderBy: { field: "muscleGroup", direction: "asc" } }
  );

  if (exercises.length === 0) {
    const { exerciseLibrary } = await import("@/scripts/seed-data");
    const seededAt = new Date(2026, 0, 1);
    await runBatch((batch) => {
      for (const exercise of exerciseLibrary) {
        batch.set(
          docRef(COLLECTIONS.exercises, exercise.code),
          {
            code: exercise.code,
            name: exercise.name,
            description: exercise.description,
            muscleGroup: exercise.muscleGroup,
            secondaryMuscles: exercise.secondaryMuscles ?? [],
            equipment: exercise.equipment ?? [],
            difficulty: exercise.difficulty,
            movementType: exercise.movementType,
            instructions: exercise.instructions ?? [],
            safetyNotes: exercise.safetyNotes ?? null,
            createdAt: seededAt,
            updatedAt: seededAt,
          },
          { merge: true }
        );
      }
    });
    return getExerciseLibraryPublic();
  }

  return exercises
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      difficulty: exercise.difficulty,
      movementType: exercise.movementType,
      equipment: exercise.equipment,
    }));
}