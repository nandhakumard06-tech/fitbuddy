import {
  COLLECTIONS,
  countWhere,
  getById,
  increment,
  queryWhere,
  setDoc,
  type Achievement,
  type ExercisePerformance,
  type Profile,
  type User,
  type UserAchievement,
  type WorkoutCompletion,
} from "@/lib/firestore";

/**
 * Awards XP to a user and returns the updated XP total.
 */
export async function awardXp(userId: string, amount: number): Promise<number> {
  if (amount <= 0) return 0;
  await setDoc(COLLECTIONS.users, userId, {
    xp: increment(amount),
    updatedAt: new Date(),
  });
  const user = await getById<User>(COLLECTIONS.users, userId);
  return user?.xp ?? 0;
}

export const XP_BREAKDOWN = {
  workout: 50,
  personalRecord: 100,
  weeklyGoal: 200,
} as const;

/**
 * Evaluates a user's history against all achievement definitions and awards
 * any that have not yet been earned. Returns the newly earned achievement keys.
 */
export async function checkAndAwardAchievements(userId: string) {
  const now = new Date();

  const [completions, performances, earned] = await Promise.all([
    getCompletedCompletions(userId),
    queryWhere<ExercisePerformance>(COLLECTIONS.performances, [
      { field: "userId", op: "==", value: userId },
    ]),
    queryWhere<UserAchievement>(COLLECTIONS.userAchievements, [
      { field: "userId", op: "==", value: userId },
    ]),
  ]);

  const totalWorkouts = completions.length;
  const earnedKeys = new Set(earned.map((a) => a.achievementKey));

  const hasPersonalRecord =
    completions.length > 0 &&
    performances.some(
      (p) => p.bestWeight != null && Number(p.bestWeight) > 0
    );

  const currentStreak = computeCurrentStreak(
    completions
      .map((c) => c.completedAt)
      .filter((d): d is Date => d !== null)
  );

  const weeklyGoalMet = await isWeeklyGoalMet(userId, now);

  const evaluations: { key: string; earned: boolean }[] = [
    { key: "first_workout", earned: totalWorkouts >= 1 },
    { key: "streak_3", earned: currentStreak >= 3 },
    { key: "streak_7", earned: currentStreak >= 7 },
    { key: "workouts_10", earned: totalWorkouts >= 10 },
    { key: "workouts_25", earned: totalWorkouts >= 25 },
    { key: "workouts_50", earned: totalWorkouts >= 50 },
    { key: "first_pr", earned: hasPersonalRecord },
    { key: "weekly_goal", earned: weeklyGoalMet },
  ];

  const newlyEarned: string[] = [];
  let xpToAward = 0;

  for (const evaluation of evaluations) {
    if (!evaluation.earned) continue;
    if (earnedKeys.has(evaluation.key)) continue;

    const achievement = await getById<Achievement>(
      COLLECTIONS.achievements,
      evaluation.key
    );
    if (!achievement) continue;

    await setDoc(COLLECTIONS.userAchievements, `${userId}_${evaluation.key}`, {
      userId,
      achievementKey: evaluation.key,
      achievementId: evaluation.key,
      earnedAt: now,
    });
    earnedKeys.add(evaluation.key);
    newlyEarned.push(evaluation.key);
    xpToAward += achievement.xpReward;
  }

  if (xpToAward > 0) {
    await awardXp(userId, xpToAward);
  }

  return newlyEarned;
}

/** Completed workout sessions for a user (completedAt != null). */
export function filterCompletedCompletions(rows: WorkoutCompletion[]) {
  return rows
    .filter((row) => row.completedAt != null)
    .sort((a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0));
}

export async function getCompletedCompletions(userId: string) {
  const rows = await queryWhere<WorkoutCompletion>(COLLECTIONS.completions, [
    { field: "userId", op: "==", value: userId },
  ]);
  return filterCompletedCompletions(rows);
}

/** Number of consecutive days (ending today, or yesterday) with a completed workout. */
export function computeCurrentStreak(
  dates: Date[],
  today = new Date()
): number {
  if (dates.length === 0) return 0;

  const daySet = new Set(
    dates.map((d) => {
      const local = new Date(d);
      return `${local.getFullYear()}-${local.getMonth()}-${local.getDate()}`;
    })
  );

  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  const format = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  // Allow a streak to continue if the user worked out yesterday but is resting today.
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

async function isWeeklyGoalMet(userId: string, now: Date): Promise<boolean> {
  const profile = await getById<Profile>(COLLECTIONS.profiles, userId);
  if (!profile) return false;

  const start = weekStart(now);
  const completions = await getCompletedCompletions(userId);
  const count = completions.filter(
    (c) => c.startedAt && c.startedAt >= start
  ).length;

  return count >= profile.daysPerWeek;
}

export function weekStart(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}