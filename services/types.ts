import { z } from "zod";
import {
  onboardingSchema,
  registerSchema,
  loginSchema,
  aiPlanSchema,
  aiInsightSchema,
  progressRecordSchema,
} from "@/lib/validation";

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type RegisterInput = z.infer<typeof registerSchema> & {
  confirmPassword: string;
};
export type LoginInput = z.infer<typeof loginSchema>;
export type AiPlanInput = z.infer<typeof aiPlanSchema>;
export type AiInsightInput = z.infer<typeof aiInsightSchema>;
export type ProgressRecordInput = z.infer<typeof progressRecordSchema>;

export type {
  AiPlan,
  AiWorkoutDay,
  AiExercise,
} from "@/lib/validation";