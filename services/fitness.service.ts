import { ApiError } from "@/lib/api";
import { computeFitnessAssessment } from "@/lib/fitness";
import { onboardingSchema } from "@/lib/validation";
import type { OnboardingInput } from "./types";
import {
  COLLECTIONS,
  getById,
  queryWhere,
  setDoc,
  type FitnessAssessment,
  type Profile,
  type User,
  type WorkoutCompletion,
} from "@/lib/firestore";

export async function saveProfile(userId: string, input: OnboardingInput) {
  const data = onboardingSchema.parse(input);

  const assessment = computeFitnessAssessment({
    weightKg: data.weightKg,
    heightCm: data.heightCm,
    daysPerWeek: data.daysPerWeek,
    workoutDurationMin: data.workoutDurationMin,
  });

  const now = new Date();
  const existingProfile = await getById<Profile>(COLLECTIONS.profiles, userId);
  const existingAssessment = await getById<FitnessAssessment>(
    COLLECTIONS.assessments,
    userId
  );

  const profile: Profile = {
    id: userId,
    userId,
    age: data.age,
    gender: data.gender,
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    fitnessLevel: data.fitnessLevel,
    goal: data.goal,
    activityLevel: data.activityLevel,
    daysPerWeek: data.daysPerWeek,
    workoutDurationMin: data.workoutDurationMin,
    preferredTrainingDays: data.preferredTrainingDays,
    equipment: data.equipment,
    preferences: data.preferences,
    completedAt: now,
    createdAt: existingProfile?.createdAt ?? now,
    updatedAt: now,
  };
  await setDoc(COLLECTIONS.profiles, userId, { ...profile });

  const assessmentRecord: FitnessAssessment = {
    id: userId,
    userId,
    bmi: assessment.bmi,
    bmiCategory: assessment.bmiCategory,
    weeklyTargetMinutes: assessment.weeklyTargetMinutes,
    trainingVolumeTarget: assessment.trainingVolumeTarget,
    consistencyScore: assessment.consistencyScore,
    form: null,
    createdAt: existingAssessment?.createdAt ?? now,
  };
  await setDoc(COLLECTIONS.assessments, userId, { ...assessmentRecord });

  return profile;
}

export async function getProfile(userId: string) {
  const profile = await getById<Profile>(COLLECTIONS.profiles, userId);
  if (!profile) throw ApiError.notFound("Profile not found.");

  const user = await getById<User>(COLLECTIONS.users, userId);
  if (!user) throw ApiError.notFound("User not found.");

  return {
    ...profile,
    user: { id: user.id, name: user.name, email: user.email, xp: user.xp },
  };
}

export async function getFitnessMetrics(userId: string) {
  const weekStartDate = getWeekStart();

  const [profile, assessment, completions] = await Promise.all([
    getById<Profile>(COLLECTIONS.profiles, userId),
    getById<FitnessAssessment>(COLLECTIONS.assessments, userId),
    queryWhere<WorkoutCompletion>(COLLECTIONS.completions, [
      { field: "userId", op: "==", value: userId },
    ]),
  ]);

  const completionCount = completions.filter((entry) => entry.completedAt != null).length;
  const weekWorkouts = completions.filter(
    (entry) => entry.startedAt instanceof Date && entry.startedAt >= weekStartDate
  ).length;

  return {
    profile,
    assessment,
    totalCompletedWorkouts: completionCount,
    workoutsThisWeek: weekWorkouts,
    weeklyGoal: profile?.daysPerWeek ?? null,
  };
}

export function getWeekStart(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Week starts on Monday
  d.setDate(d.getDate() + diff);
  return d;
}