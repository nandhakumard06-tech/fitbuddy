import { ApiError } from "@/lib/api";
import {
  aiPlanSchema,
  aiInsightSchema,
  type AiPlan,
  type AiInsight,
} from "@/lib/validation";
import { generateStructuredJson, isGeminiConfigured } from "@/lib/gemini";
import { validatePlanSafety } from "@/lib/planSafety";
import { exerciseLibrary as seedExercises } from "@/scripts/seed-data";
import { getOverview, getWorkoutFrequency, getVolumeOverTime, getPersonalRecords } from "./analytics.service";
import { getCompletedCompletions } from "./achievements.service";
import { loadPlanWorkouts, type PlanWithWorkouts } from "./workout.service";
import {
  COLLECTIONS,
  addDoc,
  docRef,
  getById,
  getItemsByIds,
  newId,
  queryWhere,
  runBatch,
  setDoc,
  workoutExercisesPath,
  type Exercise,
  type ExercisePerformance,
  type FitnessPlan,
  type Profile,
  type User,
  type Workout,
  type WorkoutCompletion,
  type WorkoutExercise,
} from "@/lib/firestore";

type SafeProfile = Pick<
  Profile,
  | "age"
  | "gender"
  | "fitnessLevel"
  | "goal"
  | "activityLevel"
  | "daysPerWeek"
  | "workoutDurationMin"
  | "preferredTrainingDays"
  | "equipment"
  | "preferences"
  | "heightCm"
  | "weightKg"
>;

async function ensureExerciseLibrarySeeded() {
  const existing = await queryWhere<Exercise>(COLLECTIONS.exercises, [], { limit: 1 });
  if (existing.length > 0) return;

  const seededAt = new Date(2026, 0, 1);
  await runBatch((batch) => {
    for (const exercise of seedExercises) {
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
}

async function getExercisePromptLibrary() {
  await ensureExerciseLibrarySeeded();
  const exercises = await queryWhere<Exercise>(COLLECTIONS.exercises, [], {
    orderBy: { field: "muscleGroup", direction: "asc" },
  });

  return exercises
    .map(
      (e) =>
        `- ${e.code} | "${e.name}" | ${e.muscleGroup} | equipment: ${e.equipment.join("/") || "NONE"} | difficulty: ${e.difficulty} | type: ${e.movementType}`
    )
    .join("\n");
}

export interface GeneratePlanResult {
  plan: {
    id: string;
    name: string;
    planJson: unknown;
    workoutCount: number;
    usedTemplate: boolean;
  };
  usedTemplate: boolean;
}

/**
 * Generates a personalized plan with Gemini. When Gemini is not configured or
 * fails after retries, falls back to a deterministic template and records it.
 */
export async function generatePlan(user: User, profile: SafeProfile): Promise<GeneratePlanResult> {
  await ensureExerciseLibrarySeeded();

  if (!isGeminiConfigured()) {
    return generateTemplatePlan(user, profile, "Gemini is not configured");
  }

  const exerciseLibrary = await getExercisePromptLibrary();

  const prompt = buildPlanPrompt(profile, exerciseLibrary);

  try {
    const aiPlan = await generateStructuredJson(prompt, aiPlanSchema);

    const validated = await enforcePlanRules(user, aiPlan);
    const plan = await storePlan(user.id, validated, "AI", profile.goal);
    return { plan: summarizePlan(plan), usedTemplate: false };
  } catch (error) {
    await recordAiGeneration(user.id, "PLAN", { prompt: prompt.slice(0, 2000) }, null, false, errorMessage(error));
    return generateTemplatePlan(user, profile, errorMessage(error), true);
  }
}

async function enforcePlanRules(user: User, aiPlan: AiPlan): Promise<AiPlan> {
  const exercises = await queryWhere<Exercise>(COLLECTIONS.exercises, []);

  const validIds = new Set(exercises.map((e) => e.id));
  const difficultyMap = new Map(exercises.map((e) => [e.id, e.difficulty]));

  validatePlanSafety(aiPlan, {
    validExerciseIds: validIds,
    exerciseDifficultyMap: difficultyMap,
    maxSets: 8,
    maxReps: 60,
    maxRestSeconds: 300,
    maxWorkoutMinutes: 180,
    minDays: 1,
    maxDays: 7,
  });

  const profile = await getById<Profile>(COLLECTIONS.profiles, user.id);
  if (!profile) throw ApiError.notFound("Profile not found.");

  const userEquipment = new Set(profile.equipment.map((e) => e));
  const byId = new Map(exercises.map((e) => [e.id, e]));

  // Equipment compatibility & difficulty ceiling enforcement.
  for (const day of aiPlan.days) {
    for (const ex of day.exercises) {
      const record = byId.get(ex.exerciseId);
      if (!record) continue;

      const compatible = record.equipment.some(
        (e) => e === "NONE" || userEquipment.has(e) || userEquipment.has("FULL_GYM")
      );
      if (!compatible) {
        throw new Error(
          `Exercise "${ex.exerciseId}" requires equipment the user does not have.`
        );
      }

      const allowed = difficultyCeiling(profile.fitnessLevel);
      if (record.difficulty === "ADVANCED" && allowed !== "ADVANCED") {
        throw new Error(
          `Exercise "${ex.exerciseId}" is too advanced for a ${profile.fitnessLevel} user.`
        );
      }
    }
  }

  return aiPlan;
}

function difficultyCeiling(level: string): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" {
  if (level === "BEGINNER") return "BEGINNER";
  if (level === "INTERMEDIATE") return "INTERMEDIATE";
  return "ADVANCED";
}

type StoredPlan = FitnessPlan & {
  workouts: { id: string }[];
};

async function storePlan(
  userId: string,
  aiPlan: AiPlan,
  source: "AI" | "ADAPTED" | "TEMPLATE",
  goal: string = "GENERAL_FITNESS"
): Promise<StoredPlan> {
  const now = new Date();

  const activePlans =
    source !== "ADAPTED"
      ? (await queryWhere<FitnessPlan>(COLLECTIONS.plans, [
          { field: "userId", op: "==", value: userId },
        ])).filter((plan) => plan.isActive)
      : [];

  const planId = newId(COLLECTIONS.plans);
  const workoutIds = aiPlan.days.map(() => newId(COLLECTIONS.workouts));
  const exerciseIds: string[][] = aiPlan.days.map((day) =>
    day.exercises.map(() => newId(COLLECTIONS.workouts))
  );

  const planJson = JSON.parse(JSON.stringify(aiPlan)) as Record<string, unknown>;

  await runBatch((batch) => {
    for (const active of activePlans) {
      batch.update(docRef(COLLECTIONS.plans, active.id), {
        isActive: false,
        status: "ARCHIVED",
        updatedAt: now,
      });
    }

    batch.set(docRef(COLLECTIONS.plans, planId), {
      userId,
      name: aiPlan.planName,
      goal,
      durationWeeks: aiPlan.durationWeeks,
      source,
      status: source === "ADAPTED" ? "PENDING" : "ACTIVE",
      isActive: source !== "ADAPTED",
      planJson,
      createdAt: now,
      updatedAt: now,
    });

    aiPlan.days.forEach((day, dayIndex) => {
      const workoutId = workoutIds[dayIndex];
      batch.set(docRef(COLLECTIONS.workouts, workoutId), {
        planId,
        userId,
        dayNumber: day.dayNumber,
        orderIndex: 0,
        name: day.name,
        focus: day.focus,
        durationMinutes: day.durationMinutes,
        warmup: day.warmup,
        cooldown: day.cooldown,
        createdAt: now,
      });

      day.exercises.forEach((exercise, exIndex) => {
        batch.set(docRef(workoutExercisesPath(workoutId), exerciseIds[dayIndex][exIndex]), {
          workoutId,
          exerciseId: exercise.exerciseId,
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.restSeconds,
          orderIndex: exIndex,
        });
      });
    });
  });

  const plan: StoredPlan = {
    id: planId,
    userId,
    name: aiPlan.planName,
    goal,
    durationWeeks: aiPlan.durationWeeks,
    source,
    status: source === "ADAPTED" ? "PENDING" : "ACTIVE",
    isActive: source !== "ADAPTED",
    planJson,
    createdAt: now,
    updatedAt: now,
    workouts: workoutIds.map((id) => ({ id })),
  };

  await recordAiGeneration(
    userId,
    source === "ADAPTED" ? "ADAPTATION" : "PLAN",
    { planName: aiPlan.planName, days: aiPlan.days.length },
    planJson,
    true
  );

  return plan;
}

function summarizePlan(plan: StoredPlan) {
  return {
    id: plan.id,
    name: plan.name,
    planJson: plan.planJson,
    workoutCount: plan.workouts.length,
    usedTemplate: false,
  };
}

function buildPlanPrompt(profile: SafeProfile, exerciseLibrary: string): string {
  return `You are FitBuddy's AI fitness planning engine.

Generate a personalized workout plan using the user's validated fitness profile and approved exercise library.

USER PROFILE:
Age: ${profile.age}
Gender: ${profile.gender}
Height: ${profile.heightCm} cm
Weight: ${profile.weightKg} kg
Fitness Level: ${profile.fitnessLevel}
Goal: ${profile.goal}
Activity Level: ${profile.activityLevel}
Days Per Week: ${profile.daysPerWeek}
Workout Duration: ${profile.workoutDurationMin} minutes
Equipment: ${profile.equipment.join(", ")}
Training Preferences: ${profile.preferences.join(", ")}

APPROVED EXERCISES:
${exerciseLibrary}

REQUIREMENTS:
1. Match the plan to the user's fitness level.
2. Respect the user's available equipment. Exercises requiring unavailable equipment are forbidden.
3. Match the user's selected goal and training preferences.
4. Create a realistic weekly schedule with exactly ${profile.daysPerWeek} workout days (dayNumber 1..${profile.daysPerWeek} in order).
5. Include a warmup.
6. Include exercises.
7. Include sets.
8. Include repetitions.
9. Include rest periods (in seconds).
10. Include a cooldown.
11. Include progression guidance in the plan name or focus where suitable.
12. Avoid unsafe or extreme recommendations. Never exceed 8 sets or 60 reps per exercise in a single session.
13. Only select exercises from the approved exercise library. Use the exercise id values.
14. Return structured JSON.
15. Do not return markdown.
16. Do not return explanations outside the JSON.

Respond ONLY with a JSON object matching this schema:
{
  "planName": string,
  "durationWeeks": number,
  "days": [
    {
      "dayNumber": number,
      "name": string,
      "focus": string,
      "durationMinutes": number,
      "warmup": string[],
      "exercises": [
        { "exerciseId": "exercise-id", "sets": number, "reps": number, "restSeconds": number }
      ],
      "cooldown": string[]
    }
  ]
}`;
}

async function recordAiGeneration(
  userId: string,
  type: "PLAN" | "ADAPTATION" | "INSIGHT",
  input: Record<string, unknown>,
  output: Record<string, unknown> | null,
  success: boolean,
  error?: string
) {
  await addDoc(COLLECTIONS.aiGenerations, {
    userId,
    type,
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    input,
    output: (output ?? {}) as Record<string, unknown>,
    success,
    error: error ?? null,
    createdAt: new Date(),
  });
}

// ============================== Template fallback ==============================

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const GOAL_FOCUS: Record<string, { focus: string; muscleGroups: string[] }> = {
  WEIGHT_LOSS: { focus: "Full body conditioning", muscleGroups: ["Cardio", "Legs", "Core"] },
  MUSCLE_GAIN: { focus: "Hypertrophy", muscleGroups: ["Chest", "Back", "Legs", "Shoulders", "Biceps", "Triceps"] },
  STRENGTH: { focus: "Progressive overload", muscleGroups: ["Legs", "Chest", "Back", "Shoulders"] },
  ENDURANCE: { focus: "Cardiovascular conditioning", muscleGroups: ["Cardio", "Core", "Legs"] },
  GENERAL_FITNESS: { focus: "Balanced fitness", muscleGroups: ["Chest", "Back", "Legs", "Core", "Cardio"] },
  FLEXIBILITY: { focus: "Mobility and flexibility", muscleGroups: ["Mobility", "Core"] },
};

export async function generateTemplatePlan(
  user: User,
  profile: SafeProfile,
  reason: string,
  fromRecovery = false
): Promise<GeneratePlanResult> {
  await ensureExerciseLibrarySeeded();
  const exercises = await queryWhere<Exercise>(COLLECTIONS.exercises, []);

  const byGroup = new Map<string, Exercise[]>();
  for (const exercise of exercises) {
    const list = byGroup.get(exercise.muscleGroup) ?? [];
    list.push(exercise);
    byGroup.set(exercise.muscleGroup, list);
  }

  const userEquipment = new Set(profile.equipment.map((e) => e));
  const allowed = (e: Exercise) =>
    e.equipment.some(
      (eq) => eq === "NONE" || userEquipment.has(eq) || userEquipment.has("FULL_GYM")
    );

  const usable = (group: string, count: number) =>
    (byGroup.get(group) ?? [])
      .filter(allowed)
      .slice(0, count)
      .filter((e) => (e.movementType !== "CARDIO" && e.movementType !== "MOBILITY") || group === "Cardio" || group === "Mobility");

  const focusMap = GOAL_FOCUS[profile.goal] ?? GOAL_FOCUS.GENERAL_FITNESS;
  const groups = focusMap.muscleGroups;
  const dayCount = Math.min(profile.daysPerWeek, 5);
  const usedExerciseIds = new Set<string>();

  const days = Array.from({ length: dayCount }, (_, dayIndex) => {
    const muscleGroup = groups[dayIndex % groups.length];
    const secondary = groups[(dayIndex + 1) % groups.length];
    const primaryExercises = usable(muscleGroup, 3).filter(
      (exercise) => !usedExerciseIds.has(exercise.id)
    );
    const secondaryExercises = usable(secondary, 2).filter(
      (exercise) => !usedExerciseIds.has(exercise.id)
    );
    const warmup = byGroup.get("Mobility")?.filter(allowed).slice(0, 2).map((e) => e.name) ?? [
      "Shoulder Circles",
      "Cat Cow Stretch",
    ];

    const selectedExercises = [...primaryExercises, ...secondaryExercises];
    const uniqueExercises = selectedExercises.length
      ? selectedExercises
      : exercises.filter(
          (exercise) =>
            allowed(exercise) &&
            !usedExerciseIds.has(exercise.id) &&
            exercise.movementType !== "CARDIO" &&
            exercise.movementType !== "MOBILITY"
        );

    for (const exercise of uniqueExercises) {
      usedExerciseIds.add(exercise.id);
    }

    return {
      id: `template-day-${dayIndex + 1}`,
      dayNumber: dayIndex + 1,
      name: `${muscleGroup} Day`,
      focus: `${focusMap.focus} — ${muscleGroup} focus`,
      durationMinutes: profile.workoutDurationMin,
      warmup: warmup.length ? warmup : ["Cat Cow Stretch"],
      exercises: uniqueExercises.slice(0, 8).map((exercise) => ({
        exerciseId: exercise.id,
        sets: profile.fitnessLevel === "BEGINNER" ? 3 : 4,
        reps: 10,
        restSeconds: profile.fitnessLevel === "BEGINNER" ? 90 : 75,
      })),
      cooldown: ["Hold a deep breathing stretch for 2 minutes."],
    };
  });

  const aiPlan: AiPlan = {
    planName: `${dayCount} Day ${focusMap.focus} Plan`,
    durationWeeks: 8,
    days: days.map(({ id: _id, ...day }) => day),
  };

  const validated = await validatePlanSafety(aiPlan, {
    validExerciseIds: new Set(exercises.map((e) => e.id)),
    exerciseDifficultyMap: new Map(exercises.map((e) => [e.id, e.difficulty])),
  });

  const plan = await storePlan(user.id, validated, "TEMPLATE", profile.goal);
  await recordAiGeneration(
    user.id,
    "PLAN",
    { templateFallback: true, reason },
    validated as unknown as Record<string, unknown>,
    true
  );

  return {
    plan: { ...summarizePlan(plan), usedTemplate: true },
    usedTemplate: true,
  };
}

// ============================== AI Insights ==============================

export async function generateInsights(user: User): Promise<AiInsight> {
  const overview = await getOverview(user.id);
  const [weekly, volume, records] = await Promise.all([
    getWorkoutFrequency(user.id, 4),
    getVolumeOverTime(user.id, 28),
    getPersonalRecords(user.id, 5),
  ]);

  const stats = {
    totalWorkouts: overview.totalWorkouts,
    completionRate: overview.completionRate,
    currentStreak: overview.currentStreak,
    weeklyGoal: overview.weeklyGoal,
    workoutsThisWeek: overview.workoutsThisWeek,
    averageDurationSeconds: overview.averageDurationSeconds,
    totalVolume: overview.totalVolume,
    thisWeekVolume: overview.thisWeekVolume,
    perWeek: weekly,
    volumeLast28Days: volume,
    personalRecords: records,
  };

  if (!isGeminiConfigured()) {
    return buildFallbackInsight(overview, weekly);
  }

  const prompt = `You are FitBuddy's AI fitness coach. Analyze this real user workout data (all statistics come from the system's database — do not invent or change any numbers) and produce concise, specific insights.

DATA:
${JSON.stringify(stats, null, 2)}

Respond ONLY with JSON matching:
{
  "summary": string (max 400 chars),
  "highlights": string[] (max 4, each max 200 chars),
  "recommendations": string[] (max 4, each max 300 chars)
}`;

  try {
    const insight = await generateStructuredJson(prompt, aiInsightSchema, {
      temperature: 0.6,
      maxOutputTokens: 2048,
    });
    await recordAiGeneration(
      user.id,
      "INSIGHT",
      { stats: stats as unknown as Record<string, unknown> },
      insight as unknown as Record<string, unknown>,
      true
    );
    return insight;
  } catch (error) {
    await recordAiGeneration(
      user.id,
      "INSIGHT",
      { stats: stats as unknown as Record<string, unknown> },
      null,
      false,
      errorMessage(error)
    );
    return buildFallbackInsight(overview, weekly);
  }
}

function buildFallbackInsight(overview: Awaited<ReturnType<typeof getOverview>>, weekly: Awaited<ReturnType<typeof getWorkoutFrequency>>): AiInsight {
  const last = weekly[weekly.length - 1]?.count ?? 0;
  const previous = weekly[weekly.length - 2]?.count ?? 0;

  const efficiency = last > previous ? "increased" : last < previous ? "decreased" : "stayed the same";
  const highlights = [
    last >= overview.weeklyGoal && overview.weeklyGoal > 0
      ? `You hit your weekly goal of ${overview.weeklyGoal} workouts.`
      : `You completed ${overview.workoutsThisWeek} of ${overview.weeklyGoal} planned workouts this week.`,
    overview.currentStreak > 0
      ? `Your current streak is ${overview.currentStreak} workout day(s).`
      : "Complete a workout today to start a streak.",
    overview.totalWorkouts > 0
      ? `Overall completion rate is ${overview.completionRate}%.`
      : "You haven't completed a workout yet.",
  ].filter(Boolean);

  return {
    summary: `Your workout consistency has ${efficiency} compared with the previous week. ${
      overview.currentStreak > 0
        ? `You are on a ${overview.currentStreak}-day streak.`
        : "Complete a workout to begin a new streak."
    } Consider keeping volume progression gradual to avoid burnout.`,
    highlights,
    recommendations: [
      "Aim for a small, consistent increase in volume each week rather than large jumps.",
      "Prioritize recovery with at least one full rest day between hard sessions.",
      "Track your weights and reps each session to keep overload progressive.",
    ],
  };
}

// ============================== Plan adaptation ==============================

export interface AdaptPlanInput {
  feedback: string;
}

export async function adaptPlan(user: User, input: AdaptPlanInput) {
  const currentPlan = await queryWhere<FitnessPlan>(COLLECTIONS.plans, [
    { field: "userId", op: "==", value: user.id },
    { field: "isActive", op: "==", value: true },
    { field: "status", op: "==", value: "ACTIVE" },
  ]);

  if (!currentPlan.length) throw ApiError.notFound("No active plan to adapt.");
  const current = await loadPlanWorkouts(currentPlan[0]);

  const completions = (await getCompletedCompletions(user.id))
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    .slice(0, 30);

  const workoutIds = [...new Set(completions.map((c) => c.workoutId))];
  const workoutMap = workoutIds.length
    ? await getItemsByIds<Workout>(COLLECTIONS.workouts, workoutIds)
    : new Map<string, Workout>();

  const summary = completions.map((c) => {
    const workout = workoutMap.get(c.workoutId);
    return {
      day: workout?.dayNumber ?? null,
      name: workout?.name ?? "Workout",
      completionPct: c.completionPct,
      durationSeconds: c.durationSeconds,
    };
  });

  const feedback = input.feedback.trim();

  const currentPlanText = JSON.stringify(
    {
      name: current.name,
      weeks: current.durationWeeks,
      days: current.workouts.map((w) => ({
        day: w.dayNumber,
        name: w.name,
        focus: w.focus,
        exercises: w.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          name: e.exercise?.name ?? e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          restSeconds: e.restSeconds,
        })),
      })),
    },
    null,
    2
  );

  if (!isGeminiConfigured()) {
    throw ApiError.ai("Gemini is not configured. Cannot adapt the plan.");
  }

  const exerciseLibrary = await getExercisePromptLibrary();

  const prompt = `You are FitBuddy's AI fitness planning engine. Adapt the user's current workout plan based on their actual completion history and feedback.

CURRENT PLAN:
${currentPlanText}

WORKOUT HISTORY (last 30 sessions):
${JSON.stringify(summary, null, 2)}

USER FEEDBACK:
"${feedback || "No specific feedback — use the workout history to adjust difficulty."}"

APPROVED EXERCISES:
${exerciseLibrary}

REQUIREMENTS:
1. Only use exercises from the approved exercise library (use their ids).
2. Keep the same number of training days unless the history suggests otherwise.
3. Progress difficulty moderately based on completion rates (aim for challenging but achievable).
4. Respect equipment constraints.
5. Follow the same strict JSON schema and safety limits as plan generation.
6. Do not return markdown or explanations outside JSON.`;

  try {
    const aiPlan = await generateStructuredJson(prompt, aiPlanSchema);
    const validated = await enforcePlanRules(user, aiPlan);
    const plan = await storePlan(user.id, validated, "ADAPTED", current.goal);
    return { current, updated: plan };
  } catch (error) {
    await recordAiGeneration(
      user.id,
      "ADAPTATION",
      { feedback },
      null,
      false,
      errorMessage(error)
    );
    throw ApiError.ai(
      "AI adaptation failed. Please try again in a moment."
    );
  }
}

/** Returns the user's latest pending (unreviewed) adapted plan, if any. */
export async function getPendingAdaptedPlan(userId: string): Promise<PlanWithWorkouts | null> {
  const plans = await queryWhere<FitnessPlan>(COLLECTIONS.plans, [
    { field: "userId", op: "==", value: userId },
  ]);

  const plan = plans.find(
    (entry) => entry.status === "PENDING" && entry.source === "ADAPTED"
  );

  if (!plan) return null;
  return loadPlanWorkouts(plan);
}

async function deletePlanTree(userId: string, planId: string) {
  const workouts = await queryWhere<Workout>(COLLECTIONS.workouts, [
    { field: "planId", op: "==", value: planId },
  ]);
  const workoutIds = workouts.map((w) => w.id);

  const completions = workoutIds.length
    ? await queryWhere<WorkoutCompletion>(COLLECTIONS.completions, [
        { field: "workoutId", op: "in", value: workoutIds },
      ])
    : [];
  const completionIds = completions.map((c) => c.id);

  const exerciseRefs: { ref: ReturnType<typeof docRef> }[] = [];
  for (const workoutId of workoutIds) {
    const exercises = await queryWhere<WorkoutExercise>(
      workoutExercisesPath(workoutId),
      []
    );
    for (const exercise of exercises) {
      exerciseRefs.push({ ref: docRef(workoutExercisesPath(workoutId), exercise.id) });
    }
  }

  await runBatch((batch) => {
    for (const { ref } of exerciseRefs) batch.delete(ref);
    for (const workoutId of workoutIds) batch.delete(docRef(COLLECTIONS.workouts, workoutId));
    for (const completionId of completionIds) batch.delete(docRef(COLLECTIONS.completions, completionId));
    batch.delete(docRef(COLLECTIONS.plans, planId));
  });

  if (completionIds.length) {
    const dangling = await queryWhere<ExercisePerformance>(
      COLLECTIONS.performances,
      [{ field: "completionId", op: "in", value: completionIds }]
    );
    for (const performance of dangling) {
      await setDoc(COLLECTIONS.performances, performance.id, { completionId: null });
    }
  }
}

export async function reviewAdaptedPlan(user: User, planId: string, accept: boolean) {
  const plan = await getById<FitnessPlan>(COLLECTIONS.plans, planId);
  if (
    !plan ||
    plan.userId !== user.id ||
    plan.status !== "PENDING" ||
    plan.source !== "ADAPTED"
  ) {
    throw ApiError.notFound("Pending plan not found.");
  }

  if (!accept) {
    await deletePlanTree(user.id, plan.id);
    return { accepted: false };
  }

  const activePlans = (await queryWhere<FitnessPlan>(COLLECTIONS.plans, [
    { field: "userId", op: "==", value: user.id },
  ])).filter((plan) => plan.isActive);

  const now = new Date();
  await runBatch((batch) => {
    for (const active of activePlans) {
      batch.update(docRef(COLLECTIONS.plans, active.id), {
        isActive: false,
        status: "ARCHIVED",
        updatedAt: now,
      });
    }
    batch.update(docRef(COLLECTIONS.plans, plan.id), {
      status: "ACTIVE",
      isActive: true,
      updatedAt: now,
    });
  });

  return { accepted: true, plan: { ...plan, status: "ACTIVE" as const, isActive: true, updatedAt: now } };
}