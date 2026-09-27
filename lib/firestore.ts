import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type WhereFilterOp,
  type WriteBatch,
} from "firebase-admin/firestore";
import { firestore } from "@/lib/firebase";

export { FieldValue, firestore };
export type { WhereFilterOp, WriteBatch };

// =============================================================
// Entity types (mirror the previous Prisma models)
// =============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  xp: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string; // tokenHash
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Profile {
  id: string; // userId
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
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FitnessAssessment {
  id: string; // userId
  userId: string;
  bmi: number;
  bmiCategory: string;
  weeklyTargetMinutes: number;
  trainingVolumeTarget: number;
  consistencyScore: number;
  form: unknown | null;
  createdAt: Date;
}

export interface Exercise {
  id: string;
  code: string;
  name: string;
  description: string;
  muscleGroup: string;
  secondaryMuscles: string[];
  equipment: string[];
  difficulty: string;
  movementType: string;
  instructions: string[];
  safetyNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FitnessPlan {
  id: string;
  userId: string;
  name: string;
  goal: string;
  durationWeeks: number;
  source: "AI" | "TEMPLATE" | "ADAPTED";
  status: "ACTIVE" | "ARCHIVED" | "PENDING";
  isActive: boolean;
  planJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workout {
  id: string;
  planId: string;
  userId: string;
  dayNumber: number;
  orderIndex: number;
  name: string;
  focus: string;
  durationMinutes: number;
  warmup: string[];
  cooldown: string[];
  createdAt: Date;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  sets: number;
  reps: number;
  restSeconds: number;
  orderIndex: number;
}

export interface WorkoutCompletion {
  id: string;
  userId: string;
  workoutId: string;
  startedAt: Date;
  completedAt: Date | null;
  durationSeconds: number;
  completionPct: number;
  exercisesCompleted: number;
  setsCompleted: number;
  totalExercises: number;
  totalSets: number;
  notes: string | null;
  xpEarned: number;
  createdAt: Date;
}

export interface ExercisePerformance {
  id: string;
  userId: string;
  exerciseId: string;
  completionId: string | null;
  date: Date;
  sets: number[];
  reps: number[];
  weights: number[];
  bestWeight: number | null;
  bestVolume: number | null;
  rpe: number | null;
  notes: string | null;
  createdAt: Date;
}

export interface ProgressRecord {
  id: string;
  userId: string;
  date: Date;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipCm: number | null;
  notes: string | null;
  createdAt: Date;
}

export interface Achievement {
  id: string; // key
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  createdAt: Date;
}

export interface UserAchievement {
  id: string; // `${userId}_${key}`
  userId: string;
  achievementKey: string;
  achievementId: string; // key
  earnedAt: Date;
}

export interface AIGeneration {
  id: string;
  userId: string;
  type: "PLAN" | "ADAPTATION" | "INSIGHT";
  model: string;
  input: unknown;
  output: unknown;
  success: boolean;
  error: string | null;
  createdAt: Date;
}

// =============================================================
// Collection names
// =============================================================

export const COLLECTIONS = {
  users: "users",
  emails: "emails",
  sessions: "sessions",
  profiles: "profiles",
  assessments: "assessments",
  exercises: "exercises",
  achievements: "achievements",
  plans: "plans",
  workouts: "workouts",
  completions: "completions",
  performances: "performances",
  progress: "progress",
  userAchievements: "userAchievements",
  aiGenerations: "aiGenerations",
} as const;

export function workoutExercisesPath(workoutId: string): string {
  return `${COLLECTIONS.workouts}/${workoutId}/exercises`;
}

// =============================================================
// Serialization helpers
// =============================================================

function toEntity<T>(id: string, data: DocumentData): T {
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (value instanceof Timestamp) {
      data[key] = value.toDate();
    } else if (Array.isArray(value)) {
      data[key] = value.map((item) =>
        item instanceof Timestamp ? item.toDate() : item
      );
    }
  }
  return { id, ...data } as T;
}

// =============================================================
// Low-level helpers
// =============================================================

export function increment(amount: number): FieldValue {
  return FieldValue.increment(amount);
}

/** Returns a fresh, Firestore-safe document id (not yet persisted). */
export function newId(collection: string): string {
  return firestore.collection(collection).doc().id;
}

export async function getById<T>(path: string, id: string): Promise<T | null> {
  const snap = await firestore.doc(`${path}/${id}`).get();
  return snap.exists ? toEntity<T>(snap.id, snap.data() as DocumentData) : null;
}

export async function setDoc(
  path: string,
  id: string,
  data: Record<string, unknown>,
  merge = true
): Promise<void> {
  await firestore.doc(`${path}/${id}`).set(data, { merge });
}

export async function addDoc<T>(
  path: string,
  data: Record<string, unknown>
): Promise<T | null> {
  const ref = await firestore.collection(path).add(data);
  const snap = await ref.get();
  return snap.exists ? toEntity<T>(snap.id, snap.data() as DocumentData) : null;
}

export async function deleteDoc(path: string, id: string): Promise<void> {
  await firestore.doc(`${path}/${id}`).delete();
}

// =============================================================
// Query helpers
// =============================================================

export interface WhereClause {
  field: string;
  op: WhereFilterOp;
  value: unknown;
}

export interface QueryOptions {
  orderBy?: {
    field: string;
    direction?: "asc" | "desc";
  };
  limit?: number;
}

function buildQuery(path: string, where: WhereClause | WhereClause[]) {
  const clauses = Array.isArray(where) ? where : [where];
  let query:
    | FirebaseFirestore.Query
    | FirebaseFirestore.CollectionReference = firestore.collection(path);

  for (const clause of clauses) {
    query = query.where(clause.field, clause.op, clause.value);
  }

  return query;
}

export async function queryWhere<T>(
  path: string,
  where: WhereClause | WhereClause[],
  options: QueryOptions = {}
): Promise<T[]> {
  let query = buildQuery(path, where);

  if (options.orderBy) {
    query = query.orderBy(
      options.orderBy.field,
      options.orderBy.direction === "desc" ? "desc" : "asc"
    );
  }
  if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const snap = await query.get();
  return snap.docs.map((doc) => toEntity<T>(doc.id, doc.data()));
}

export async function findFirst<T>(
  path: string,
  where: WhereClause | WhereClause[],
  options: QueryOptions = {}
): Promise<T | null> {
  const rows = await queryWhere<T>(path, where, { ...options, limit: 1 });
  return rows[0] ?? null;
}

export async function countWhere(
  path: string,
  where: WhereClause | WhereClause[]
): Promise<number> {
  const snap = await buildQuery(path, where).get();
  return snap.size;
}

/** Fetches many documents by id and returns them keyed by id. */
export async function getItemsByIds<T>(
  path: string,
  ids: string[]
): Promise<Map<string, T>> {
  const unique = [...new Set(ids)].filter(Boolean);
  const result = new Map<string, T>();

  if (unique.length === 0) return result;

  // Firestore `in` queries are limited to 10 values per call.
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const snap = await firestore
      .collection(path)
      .where("__name__", "in", chunk)
      .get();
    for (const doc of snap.docs) {
      result.set(doc.id, toEntity<T>(doc.id, doc.data()));
    }
  }

  return result;
}

// =============================================================
// Batch helpers
// =============================================================

export async function runBatch(
  op: (batch: WriteBatch) => void
): Promise<void> {
  const batch = firestore.batch();
  op(batch);
  await batch.commit();
}

export function docRef(path: string, id: string) {
  return firestore.doc(`${path}/${id}`);
}