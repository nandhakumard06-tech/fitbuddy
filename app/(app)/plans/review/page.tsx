import Link from "next/link";
import { ArrowLeft, GitCompareArrows, Plus, Minus } from "lucide-react";
import { serverApi } from "@/lib/server-api";
import type {
  CurrentPlanResponse,
  FitnessPlan,
  Workout,
} from "@/lib/client-types";
import { labelFor, GOAL_LABELS, PLAN_SOURCE_LABELS } from "@/lib/labels";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ReviewActions } from "@/components/review-actions";

export const metadata = { title: "Review Adaptation" };

interface ReviewResponse {
  pending: FitnessPlan | null;
}

function diffDay(current: Workout | undefined, updated: Workout) {
  const currentNames = new Set(
    (current?.exercises ?? []).map((e) => e.exercise.name.toLowerCase())
  );
  const updatedNames = new Set(
    updated.exercises.map((e) => e.exercise.name.toLowerCase())
  );
  const added = updated.exercises.filter(
    (e) => !currentNames.has(e.exercise.name.toLowerCase())
  );
  const removed = (current?.exercises ?? []).filter(
    (e) => !updatedNames.has(e.exercise.name.toLowerCase())
  );
  return { added, removed, same: added.length === 0 && removed.length === 0 };
}

export default async function ReviewPage() {
  const [reviewData, currentData] = await Promise.all([
    serverApi<ReviewResponse>("/api/plans/review").catch(() => null),
    serverApi<CurrentPlanResponse>("/api/plans/current").catch(() => null),
  ]);

  const pending = reviewData?.pending ?? null;
  const current = currentData?.plan ?? null;

  if (!pending) {
    return (
      <EmptyState
        title="Nothing to review"
        description="You don't have a pending AI adaptation right now."
        action={
          <Link href="/plans" className="btn-primary">
            <ArrowLeft className="h-4 w-4" /> Back to plan
          </Link>
        }
      />
    );
  }

  const currentByDay = new Map(
    (current?.workouts ?? []).map((w) => [w.dayNumber, w])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/plans"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Plan
          </Link>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Review adaptation
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Compare the AI&apos;s proposed changes before switching.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone="green">{labelFor(GOAL_LABELS, pending.goal)}</Badge>
          <Badge tone="brand">{labelFor(PLAN_SOURCE_LABELS, pending.source)}</Badge>
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-slate-100">{pending.name}</div>
          <p className="text-sm text-slate-400">
            {pending.durationWeeks} weeks · {pending.workouts?.length ?? 0} workouts
          </p>
        </div>
        <ReviewActions planId={pending.id} />
      </Card>

      <div className="space-y-4">
        {pending.workouts?.map((w) => {
          const diff = diffDay(currentByDay.get(w.dayNumber), w);
          return (
            <Card key={w.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Day {w.dayNumber}
                    </span>
                    {diff.same ? (
                      <Badge tone="neutral">unchanged</Badge>
                    ) : (
                      <Badge tone="brand">
                        <GitCompareArrows className="h-3 w-3" /> {diff.added.length} added ·{" "}
                        {diff.removed.length} removed
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 font-semibold text-slate-100">{w.name}</div>
                  <div className="text-xs text-slate-400">{w.focus}</div>
                </div>
              </div>

              {diff.added.length > 0 || diff.removed.length > 0 ? (
                <div className="mt-4 space-y-1.5 text-sm">
                  {diff.added.map((e) => (
                    <div key={`a-${e.id}`} className="flex items-center gap-2 text-emerald-300">
                      <Plus className="h-4 w-4 shrink-0" />
                      <span>{e.exercise.name}</span>
                      <span className="text-xs text-slate-500">
                        {e.sets}×{e.reps}
                      </span>
                    </div>
                  ))}
                  {diff.removed.map((e) => (
                    <div key={`r-${e.id}`} className="flex items-center gap-2 text-rose-300">
                      <Minus className="h-4 w-4 shrink-0" />
                      <span>{e.exercise.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-500">
                  {w.exercises.length} exercises
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}