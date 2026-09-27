export const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  NON_BINARY: "Non-binary",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

export const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Weight Loss",
  MUSCLE_GAIN: "Muscle Gain",
  STRENGTH: "Strength",
  ENDURANCE: "Endurance",
  GENERAL_FITNESS: "General Fitness",
  FLEXIBILITY: "Flexibility",
};

export const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const ACTIVITY_LABELS: Record<string, string> = {
  SEDENTARY: "Sedentary",
  LIGHT: "Lightly Active",
  MODERATE: "Moderately Active",
  ACTIVE: "Active",
  VERY_ACTIVE: "Very Active",
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  NONE: "No Equipment",
  DUMBBELLS: "Dumbbells",
  BARBELL: "Barbell",
  RESISTANCE_BANDS: "Resistance Bands",
  BENCH: "Bench",
  MACHINES: "Machines",
  FULL_GYM: "Full Gym",
};

export const PREFERENCE_LABELS: Record<string, string> = {
  STRENGTH_TRAINING: "Strength Training",
  CARDIO: "Cardio",
  MOBILITY: "Mobility",
  BODYWEIGHT: "Bodyweight",
  HIIT: "HIIT",
  HOME_WORKOUTS: "Home Workouts",
  GYM_WORKOUTS: "Gym Workouts",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const MOVEMENT_LABELS: Record<string, string> = {
  COMPOUND: "Compound",
  ISOLATION: "Isolation",
  BODYWEIGHT: "Bodyweight",
  CARDIO: "Cardio",
  MOBILITY: "Mobility",
  CORE: "Core",
};

export const DAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export const DAY_LABELS: Record<string, string> = {
  SUNDAY: "Sun",
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
};

export const PLAN_SOURCE_LABELS: Record<string, string> = {
  AI: "AI Generated",
  TEMPLATE: "Template",
  ADAPTED: "AI Adapted",
};

export function labelFor(
  map: Record<string, string>,
  value: string | undefined | null
): string {
  return (value && map[value]) || value || "—";
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}