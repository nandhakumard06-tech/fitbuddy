import { progressRecordSchema } from "@/lib/validation";
import type { ProgressRecordInput } from "./types";
import { weekStart, getCompletedCompletions } from "./achievements.service";
import {
  COLLECTIONS,
  addDoc,
  findFirst,
  queryWhere,
  type ProgressRecord,
} from "@/lib/firestore";

export async function recordProgress(
  userId: string,
  input: ProgressRecordInput
) {
  const data = progressRecordSchema.parse(input);
  const now = new Date();

  return addDoc<ProgressRecord>(COLLECTIONS.progress, {
    userId,
    date: now,
    weightKg: data.weightKg ?? null,
    bodyFatPct: data.bodyFatPct ?? null,
    waistCm: data.waistCm ?? null,
    chestCm: data.chestCm ?? null,
    hipCm: data.hipCm ?? null,
    notes: data.notes ?? null,
    createdAt: now,
  });
}

export async function getProgress(userId: string, limit = 100) {
  const records = await queryWhere<ProgressRecord>(
    COLLECTIONS.progress,
    [{ field: "userId", op: "==", value: userId }],
    { orderBy: { field: "date", direction: "desc" }, limit: Math.min(Math.max(limit, 1), 500) }
  );

  return records.map((record) => ({
    ...record,
    date: record.date.toISOString(),
  }));
}

export async function getWeightTrend(userId: string, weeks = 12) {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const records = await queryWhere<ProgressRecord>(
    COLLECTIONS.progress,
    [{ field: "userId", op: "==", value: userId }],
    { orderBy: { field: "date", direction: "asc" } }
  );

  return records
    .filter((r) => r.date >= since && r.weightKg != null)
    .map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      weightKg: Number(r.weightKg),
    }));
}

/** Latest body metrics snapshot for the dashboard. */
export async function getLatestMetrics(userId: string) {
  const latest = await findFirst<ProgressRecord>(
    COLLECTIONS.progress,
    [{ field: "userId", op: "==", value: userId }],
    { orderBy: { field: "date", direction: "desc" } }
  );
  if (!latest) return null;

  const start = weekStart();
  const thisWeek = (await getCompletedCompletions(userId)).filter(
    (c) => c.startedAt && c.startedAt >= start
  ).length;

  return {
    latest,
    thisWeek,
  };
}