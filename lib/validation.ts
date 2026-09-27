import { z } from "zod";

// ===================== Enum schemas (mirror Prisma enums) =====================

export const genderSchema = z.enum([
  "MALE",
  "FEMALE",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
]);

export const fitnessLevelSchema = z.enum([
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
]);

export const goalSchema = z.enum([
  "WEIGHT_LOSS",
  "MUSCLE_GAIN",
  "STRENGTH",
  "ENDURANCE",
  "GENERAL_FITNESS",
  "FLEXIBILITY",
]);

export const activityLevelSchema = z.enum([
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "ACTIVE",
  "VERY_ACTIVE",
]);

export const equipmentSchema = z.enum([
  "NONE",
  "DUMBBELLS",
  "BARBELL",
  "RESISTANCE_BANDS",
  "BENCH",
  "MACHINES",
  "FULL_GYM",
]);

// ===================== Auth =====================

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export const passwordFieldSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")
  .regex(passwordRegex, {
    message:
      "Password must contain an uppercase letter, a lowercase letter, a number, and a special character.",
  });

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(80, "Name must be at most 80 characters."),
    email: z.string().trim().email("Enter a valid email address.").max(255),
    password: passwordFieldSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(1, "Password is required.").max(128),
});

// ===================== Onboarding / Profile =====================

export const preferenceOptions = [
  "STRENGTH_TRAINING",
  "CARDIO",
  "MOBILITY",
  "BODYWEIGHT",
  "HIIT",
  "HOME_WORKOUTS",
  "GYM_WORKOUTS",
] as const;

export const onboardingSchema = z.object({
  age: z.coerce
    .number({ invalid_type_error: "Age is required." })
    .int("Age must be a whole number.")
    .min(13, "You must be at least 13 years old.")
    .max(100, "Age must be 100 or less."),
  gender: genderSchema,
  heightCm: z.coerce
    .number({ invalid_type_error: "Height is required." })
    .positive("Height must be positive.")
    .min(90, "Height must be at least 90 cm.")
    .max(260, "Height must be at most 260 cm."),
  weightKg: z.coerce
    .number({ invalid_type_error: "Weight is required." })
    .positive("Weight must be positive.")
    .min(30, "Weight must be at least 30 kg.")
    .max(400, "Weight must be at most 400 kg."),
  fitnessLevel: fitnessLevelSchema,
  goal: goalSchema,
  activityLevel: activityLevelSchema,
  daysPerWeek: z.coerce
    .number()
    .int()
    .min(1, "Select at least 1 training day per week.")
    .max(7, "You cannot train more than 7 days per week."),
  workoutDurationMin: z.coerce
    .number()
    .int()
    .min(15, "Workouts must be at least 15 minutes.")
    .max(180, "Workouts must be at most 180 minutes."),
  preferredTrainingDays: z
    .array(z.string())
    .min(1, "Select at least one preferred training day.")
    .max(7),
  equipment: z
    .array(equipmentSchema)
    .min(1, "Select at least one equipment option."),
  preferences: z
    .array(z.enum(preferenceOptions))
    .min(1, "Select at least one preference."),
});

export const progressRecordSchema = z.object({
  weightKg: z.coerce.number().positive().max(500).optional().nullable(),
  bodyFatPct: z.coerce.number().positive().max(80).optional().nullable(),
  waistCm: z.coerce.number().positive().max(300).optional().nullable(),
  chestCm: z.coerce.number().positive().max(300).optional().nullable(),
  hipCm: z.coerce.number().positive().max(300).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

// ===================== AI output =====================

export const aiExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().positive().max(10),
  reps: z.number().int().positive().max(200),
  restSeconds: z.number().int().positive().max(600),
});

export const aiWorkoutDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  name: z.string().trim().min(1).max(80),
  focus: z.string().trim().min(1).max(120),
  durationMinutes: z.number().int().min(10).max(240),
  warmup: z.array(z.string()).max(12),
  exercises: z.array(aiExerciseSchema).min(1).max(12),
  cooldown: z.array(z.string()).max(12),
});

export const aiPlanSchema = z.object({
  planName: z.string().trim().min(1).max(120),
  durationWeeks: z.number().int().min(2).max(16),
  days: z.array(aiWorkoutDaySchema).min(1).max(7),
});

export const aiInsightSchema = z.object({
  summary: z.string().trim().min(1).max(600),
  highlights: z.array(z.string().trim().min(1).max(200)).max(6),
  recommendations: z.array(z.string().trim().min(1).max(300)).max(6),
});

export type AiPlan = z.infer<typeof aiPlanSchema>;
export type AiWorkoutDay = z.infer<typeof aiWorkoutDaySchema>;
export type AiExercise = z.infer<typeof aiExerciseSchema>;
export type AiInsight = z.infer<typeof aiInsightSchema>;

// ===================== Workout completion =====================

export const trackedSetSchema = z.object({
  weightKg: z.coerce.number().nonnegative().max(500).optional().nullable(),
  reps: z.coerce
    .number()
    .int("Reps must be a whole number.")
    .positive("Reps must be at least 1.")
    .max(200)
    .optional()
    .nullable(),
  completed: z.boolean().default(true),
});

export const trackedExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.array(trackedSetSchema).min(1).max(12),
  rpe: z.coerce.number().int().min(1).max(10).optional().nullable(),
  completed: z.boolean().default(true),
});

export const completeWorkoutSchema = z.object({
  exercises: z.array(trackedExerciseSchema).min(1),
  notes: z.string().trim().max(1000).optional().nullable(),
  durationSeconds: z.coerce
    .number()
    .int()
    .min(0)
    .max(4 * 3600)
    .optional(),
  completionPercentage: z.coerce.number().min(0).max(100).optional(),
});

export interface PlanSafety {
  validExerciseIds: Set<string> | null;
  exerciseDifficultyMap: Map<string, string> | null;
  maxSets: number;
  maxReps: number;
  maxRestSeconds: number;
  maxWorkoutMinutes: number;
  maxDays: number;
  minDays: number;
}