import { weekStart, getCompletedCompletions } from "./achievements.service";
import {
  COLLECTIONS,
  countWhere,
  getById,
  getItemsByIds,
  queryWhere,
  type Exercise,
  type ExercisePerformance,
  type Profile,
  type User,
  type Workout,
} from "@/lib/firestore";

function computeCompletionVolume(sets: number[], reps: number[], weights: number[]): number {
  let total = 0;
  for (let i = 0; i < sets.length; i++) {
    const weight = weights[i] ?? 0;
    const rep = reps[i] ?? 0;
    total += weight * rep;
  }
  return Number(total.toFixed(1));
}

async function getAllPerformances(userId: string) {
  return queryWhere<ExercisePerformance>(COLLECTIONS.performances, [
    { field: "userId", op: "==", value: userId },
  ]);
}

export async function getOverview(userId: string) {
  const [profile, completions, achievementCount, user] = await Promise.all([
    getById<Profile>(COLLECTIONS.profiles, userId),
    getCompletedCompletions(userId),
    countWhere(COLLECTIONS.userAchievements, [
      { field: "userId", op: "==", value: userId },
    ]),
    getById<User>(COLLECTIONS.users, userId),
  ]);

  const performanceByCompletion = new Map<string, ExercisePerformance[]>();
  for (const p of await getAllPerformances(userId)) {
    if (!p.completionId) continue;
    const list = performanceByCompletion.get(p.completionId) ?? [];
    list.push(p);
    performanceByCompletion.set(p.completionId, list);
  }

  const completionsWithPerformances = completions.map((c) => ({
    ...c,
    performances: performanceByCompletion.get(c.id) ?? [],
  }));

  const completed = completions.length;

  // Planned workouts: daysPerWeek since the profile was set up (capped to 6 weeks).
  const start = weekStart();
  const thisWeekCount = completions.filter(
    (c) => c.completedAt && c.completedAt >= start
  ).length;

  const weeklyGoal = profile?.daysPerWeek ?? 0;
  const lastSixWeeks = 6 * weeklyGoal || 1;

  // Completion rate is measured against the planned weekly schedule.
  const completionRate = Math.min(
    100,
    Math.round((completed / lastSixWeeks) * 100)
  );

  const currentStreak = computeStreak(
    completions.map((c) => c.completedAt as Date)
  );

  let totalVolume = 0;
  let totalDuration = 0;
  for (const c of completionsWithPerformances) {
    totalDuration += c.durationSeconds;
    for (const p of c.performances) {
      totalVolume += computeCompletionVolume(p.sets, p.reps, p.weights.map(Number));
    }
  }
  const thisWeekVolume = completionsWithPerformances
    .filter((c) => c.completedAt && c.completedAt >= start)
    .reduce((acc, c) => {
      for (const p of c.performances) {
        acc += computeCompletionVolume(p.sets, p.reps, p.weights.map(Number));
      }
      return acc;
    }, 0);

  return {
    totalWorkouts: completed,
    completionRate,
    currentStreak,
    weeklyGoal,
    workoutsThisWeek: thisWeekCount,
    weeklyGoalMet: weeklyGoal > 0 && thisWeekCount >= weeklyGoal,
    averageDurationSeconds: completed > 0 ? Math.round(totalDuration / completed) : 0,
    totalVolume: Number(totalVolume.toFixed(1)),
    thisWeekVolume: Number(thisWeekVolume.toFixed(1)),
    xp: user?.xp ?? 0,
    achievements: achievementCount,
    averageCompletionPct:
      completed > 0
        ? Math.round(
            completions.reduce((acc, c) => acc + c.completionPct, 0) / completed
          )
        : 0,
  };
}

export async function getWorkoutFrequency(userId: string, weeks = 12) {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const completions = (await getCompletedCompletions(userId)).filter(
    (c) => c.startedAt && c.startedAt >= since
  );

  const weekMap = new Map<string, number>();
  const cursor = new Date(since);
  while (cursor <= new Date()) {
    weekMap.set(isoWeek(cursor), 0);
    cursor.setDate(cursor.getDate() + 7);
  }

  for (const c of completions) {
    const key = isoWeek(c.startedAt);
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  }

  return Array.from(weekMap.entries()).map(([week, count]) => ({ week, count }));
}

/** Daily training volume (kg × reps) for the last `days`. */
export async function getVolumeOverTime(userId: string, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const performances = (await getAllPerformances(userId)).filter(
    (p) => p.date >= since && p.completionId !== null
  );

  const dayMap = new Map<string, number>();
  for (const p of performances) {
    const key = p.date.toISOString().slice(0, 10);
    const volume = computeCompletionVolume(p.sets, p.reps, p.weights.map(Number));
    dayMap.set(key, (dayMap.get(key) ?? 0) + volume);
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, volume]) => ({ date, volume: Number(volume.toFixed(1)) }));
}

export async function getPersonalRecords(userId: string, limit = 10) {
  const performances = (await getAllPerformances(userId)).filter(
    (p) => p.bestWeight != null && Number(p.bestWeight) > 0
  );
  if (performances.length === 0) return [];

  const exerciseMap = await getItemsByIds<Exercise>(
    COLLECTIONS.exercises,
    performances.map((p) => p.exerciseId)
  );

  const records = new Map<
    string,
    { bestWeight: number; bestVolume: number | null; date: Date; exerciseId: string }
  >();

  for (const p of performances) {
    const name = exerciseMap.get(p.exerciseId)?.name ?? p.exerciseId;
    const current = records.get(name);
    const weight = Number(p.bestWeight);
    if (!current || weight > current.bestWeight) {
      records.set(name, {
        bestWeight: weight,
        bestVolume: p.bestVolume != null ? Number(p.bestVolume) : null,
        date: p.date,
        exerciseId: p.exerciseId,
      });
    }
  }

  return Array.from(records.entries())
    .map(([name, r]) => ({
      exercise: name,
      muscleGroup: exerciseMap.get(r.exerciseId)?.muscleGroup ?? "Unknown",
      bestWeight: r.bestWeight,
      date: r.date.toISOString().slice(0, 10),
    }))
    .sort((a, b) => b.bestWeight - a.bestWeight)
    .slice(0, limit);
}

export async function getStrengthProgress(userId: string, weeks = 12) {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const performances = (await getAllPerformances(userId)).filter(
    (p) =>
      p.date >= since &&
      p.bestWeight != null &&
      Number(p.bestWeight) > 0
  );
  if (performances.length === 0) return [];

  const exerciseMap = await getItemsByIds<Exercise>(
    COLLECTIONS.exercises,
    performances.map((p) => p.exerciseId)
  );

  const byExercise = new Map<string, { date: string; weight: number }[]>();
  for (const p of performances) {
    const name = exerciseMap.get(p.exerciseId)?.name ?? p.exerciseId;
    const entry = { date: p.date.toISOString().slice(0, 10), weight: Number(p.bestWeight) };
    const list = byExercise.get(name) ?? [];
    list.push(entry);
    byExercise.set(name, list);
  }

  return Array.from(byExercise.entries())
    .map(([exercise, data]) => ({ exercise, data }))
    .slice(0, 6);
}

export async function getMuscleGroupDistribution(userId: string) {
  const performances = await getAllPerformances(userId);
  if (performances.length === 0) return [];

  const exerciseMap = await getItemsByIds<Exercise>(
    COLLECTIONS.exercises,
    performances.map((p) => p.exerciseId)
  );

  const counts = new Map<string, number>();
  for (const p of performances) {
    const group = exerciseMap.get(p.exerciseId)?.muscleGroup ?? "Unknown";
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export async function getWeeklyConsistency(userId: string) {
  const profile = await getById<Profile>(COLLECTIONS.profiles, userId);

  const start = weekStart();
  const completed = (await getCompletedCompletions(userId)).filter(
    (c) => c.startedAt && c.startedAt >= start
  ).length;

  const planned = profile?.daysPerWeek ?? 0;
  return {
    completed,
    planned,
    percentage: planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0,
  };
}

export async function getRecentWorkouts(userId: string, limit = 5) {
  const completions = (await getCompletedCompletions(userId))
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    .slice(0, limit);

  if (completions.length === 0) return [];

  const workoutMap = await getItemsByIds<Workout>(
    COLLECTIONS.workouts,
    completions.map((c) => c.workoutId)
  );

  return completions.map((c) => ({
    id: c.id,
    workoutId: c.workoutId,
    name: workoutMap.get(c.workoutId)?.name ?? "Workout",
    focus: workoutMap.get(c.workoutId)?.focus ?? "",
    completedAt: c.completedAt?.toISOString(),
    completionPct: c.completionPct,
    durationSeconds: c.durationSeconds,
  }));
}

function isoWeek(date: Date): string {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const week = Math.ceil((day + start.getDay() + 1) / 7) - 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Longest/number of consecutive days with completed workouts, ending today
 * (or yesterday when the user is resting today).
 */
export function computeStreak(dates: Date[], today = new Date()): number {
  if (dates.length === 0) return 0;

  const daySet = new Set(
    dates.map((d) => {
      const local = new Date(d);
      return `${local.getFullYear()}-${local.getMonth()}-${local.getDate()}`;
    })
  );

  const format = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  if (!daySet.has(format(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!daySet.has(format(cursor))) return 0;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  while (daySet.has(format(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}