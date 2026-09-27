export interface PublicUser {
  id: string;
  name: string;
  email: string;
  xp: number;
}

export interface Profile {
  id: string;
  userId: string;
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  fitnessLevel: string;
  goal: string;
  activityLevel: string;
  daysPerWeek: number;
  workoutDurationMin: number;
  preferredTrainingDays: string[];
  equipment: string[];
  preferences: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseLite {
  id: string;
  name: string;
  description: string;
  muscleGroup: string;
  equipment: string[];
  difficulty: string;
}

export interface FullExercise extends ExerciseLite {
  code: string;
  secondaryMuscles: string[];
  movementType: string;
  instructions: string[];
  safetyNotes: string | null;
}

export interface WorkoutExerciseItem {
  id: string;
  workoutId: string;
  exerciseId: string;
  sets: number;
  reps: number;
  restSeconds: number;
  orderIndex: number;
  exercise: ExerciseLite | FullExercise;
}

export interface Workout {
  id: string;
  planId: string;
  dayNumber: number;
  orderIndex: number;
  name: string;
  focus: string;
  durationMinutes: number;
  warmup: string[];
  cooldown: string[];
  exercises: WorkoutExerciseItem[];
  scheduledFor?: string;
  plan?: { userId: string };
}

export interface FitnessPlan {
  id: string;
  userId: string;
  name: string;
  goal: string;
  durationWeeks: number;
  source: string;
  status: string;
  isActive: boolean;
  planJson?: unknown;
  createdAt: string;
  updatedAt?: string;
  workouts?: Workout[];
  _count?: { workouts: number };
}

export interface CurrentPlanResponse {
  plan: FitnessPlan | null;
  needsProfile: boolean;
  needsPlan: boolean;
}

export interface WorkoutCompletion {
  id: string;
  userId: string;
  workoutId: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number;
  completionPct: number;
  exercisesCompleted: number;
  setsCompleted: number;
  totalExercises: number;
  totalSets: number;
  notes: string | null;
  xpEarned: number;
  workout?: Workout;
}

export interface TodaysWorkoutResponse {
  plan?: FitnessPlan | null;
  workout?: Workout | null;
  activeSession?: WorkoutCompletion | null;
}

export interface OverviewPayload {
  overview: {
    totalWorkouts: number;
    completionRate: number;
    currentStreak: number;
    weeklyGoal: number;
    workoutsThisWeek: number;
    weeklyGoalMet: boolean;
    averageDurationSeconds: number;
    totalVolume: number;
    thisWeekVolume: number;
    xp: number;
    achievements: number;
    averageCompletionPct: number;
  };
  consistency: {
    completed: number;
    planned: number;
    percentage: number;
  };
}

export interface FrequencyPoint {
  week: string;
  count: number;
}

export interface MusclePoint {
  name: string;
  value: number;
}

export interface VolumePoint {
  date: string;
  volume: number;
}

export interface StrengthRecord {
  exercise: string;
  muscleGroup: string;
  bestWeight: number;
  date: string;
}

export interface StrengthPoint {
  exercise: string;
  data: { date: string; weight: number }[];
}

export interface StrengthResponse {
  records: StrengthRecord[];
  strength: StrengthPoint[];
}

export interface Insight {
  summary: string;
  highlights: string[];
  recommendations: string[];
}

export interface InsightResponse {
  insight: Insight;
}

export interface ProgressRecordApi {
  id: string;
  userId: string;
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipCm: number | null;
  notes: string | null;
  createdAt: string;
}

export interface MetricSummary {
  profile: (Profile & { user?: PublicUser }) | null;
  assessment: {
    id: string;
    userId: string;
    bmi: number;
    bmiCategory: string;
    weeklyTargetMinutes: number;
    trainingVolumeTarget: number;
    consistencyScore: number;
    form: unknown;
    createdAt: string;
  } | null;
  totalCompletedWorkouts: number;
  workoutsThisWeek: number;
  weeklyGoal: number | null;
}

export interface CompleteWorkoutRequest {
  exercises: {
    exerciseId: string;
    sets: { weightKg?: number | null; reps?: number | null; completed: boolean }[];
    rpe?: number | null;
    completed: boolean;
  }[];
  notes?: string | null;
  durationSeconds?: number;
  completionPercentage?: number;
}

export interface CompleteWorkoutResponse {
  completion: {
    id: string;
    completionPct: number;
    exercisesCompleted: number;
    setsCompleted: number;
    totalExercises: number;
    totalSets: number;
    durationSeconds: number;
    xpEarned: number;
  };
  personalRecords: number;
  completedAt: string;
}