/** Pure, deterministic fitness calculations. No AI involved. */

export function calculateBmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0 || weightKg <= 0) {
    throw new Error("Height and weight must be positive.");
  }
  const heightMeters = heightCm / 100;
  return Number((weightKg / (heightMeters * heightMeters)).toFixed(1));
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export function weeklyTargetMinutes(daysPerWeek: number, workoutMinutes: number): number {
  return daysPerWeek * workoutMinutes;
}

export function trainingVolumeTarget(
  daysPerWeek: number,
  workoutMinutes: number,
  setsPerExercise = 12
): number {
  // Rough estimate: minutes × sets-per-exercise per session.
  return daysPerWeek * workoutMinutes * setsPerExercise;
}

export function consistencyScore(daysPerWeek: number): number {
  return Math.min(100, Math.round((daysPerWeek / 7) * 100));
}

export interface FitnessAssessmentResult {
  bmi: number;
  bmiCategory: string;
  weeklyTargetMinutes: number;
  trainingVolumeTarget: number;
  consistencyScore: number;
}

export function computeFitnessAssessment(input: {
  weightKg: number;
  heightCm: number;
  daysPerWeek: number;
  workoutDurationMin: number;
}): FitnessAssessmentResult {
  const bmi = calculateBmi(input.weightKg, input.heightCm);
  return {
    bmi,
    bmiCategory: bmiCategory(bmi),
    weeklyTargetMinutes: weeklyTargetMinutes(
      input.daysPerWeek,
      input.workoutDurationMin
    ),
    trainingVolumeTarget: trainingVolumeTarget(
      input.daysPerWeek,
      input.workoutDurationMin
    ),
    consistencyScore: consistencyScore(input.daysPerWeek),
  };
}

export function activityMultiplier(activityLevel: string, goal: string): number {
  const multipliers: Record<string, number> = {
    SEDENTARY: 1.2,
    LIGHT: 1.375,
    MODERATE: 1.55,
    ACTIVE: 1.725,
    VERY_ACTIVE: 1.9,
  };

  const base = multipliers[activityLevel] ?? 1.2;

  if (goal === "WEIGHT_LOSS") return base * 0.9;
  if (goal === "MUSCLE_GAIN") return base * 1.1;
  return base;
}

/** Mifflin-St Jeor estimate for daily maintenance calories. */
export function estimateDailyCalories(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
}): number {
  const isMale = input.gender === "MALE";
  let bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  bmr += isMale ? 5 : -161;
  const calories = Math.max(1200, Math.round(bmr * activityMultiplier(input.activityLevel, input.goal)));
  return calories;
}