import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Dumbbell,
  History,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { serverApi } from "@/lib/server-api";
import type {
  CurrentPlanResponse,
  FitnessPlan,
} from "@/lib/client-types";
import { formatMinutes, labelFor, GOAL_LABELS, PLAN_SOURCE_LABELS } from "@/lib/labels";
import { Badge, Card, EmptyState } from "@/components/ui";
import { AdaptPlanButton, GeneratePlanButton } from "@/components/plan-actions";

export const metadata = { title: "Plan" };

interface PlansResponse {
  plans: FitnessPlan[];
}

interface ReviewResponse {
  pending: FitnessPlan | null;
}

export default async function PlansPage() {
  const [currentData, plansData, reviewData] = await Promise.all([
    serverApi<CurrentPlanResponse>("/api/plans/current").catch(() => null),
    serverApi<PlansResponse>("/api/plans").catch(() => null),
    serverApi<ReviewResponse>("/api/plans/review").catch(() => null),
  ]);

  const current = currentData?.plan ?? null;
  const needsProfile = currentData?.needsProfile ?? false;
  const history = plansData?.plans ?? [];
  const pending = reviewData?.pending ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">My Plan</h1>
          <p className="mt-1 text-sm text-slate-400">
            Your personalized AI training program.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {current ? <AdaptPlanButton /> : null}
          {!needsProfile ? <GeneratePlanButton hasActivePlan={Boolean(current)} /> : null}
        </div>
      </div>

      {needsProfile ? (
        <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-slate-100">Complete your profile first</div>
            <p className="text-sm text-slate-400">
              We need your fitness details to build the right plan.
            </p>
          </div>
          <Link href="/onboarding" className="btn-primary">
            Set up profile <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      ) : null}

      {pending ? (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <RefreshCcw className="h-5 w-5 text-amber-300" />
              <div>
                <div className="font-semibold text-amber-200">
                  Pending AI adaptation
                </div>
                <p className="text-sm text-amber-200/70">
                  Review your adapted plan before switching to it.
                </p>
              </div>
            </div>
            <Link href="/plans/review" className="btn-primary !bg-amber-500 !text-navy-950 hover:!bg-amber-400">
              Review changes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      ) : null}

      {current ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                <Sparkles className="h-5 w-5 text-brand-300" />
                {current.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Dumbbell className="h-4 w-4" />
                  {current.workouts?.length ?? 0} workouts / week
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {current.durationWeeks} weeks
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge tone="brand">{labelFor(GOAL_LABELS, current.goal)}</Badge>
              <Badge tone={current.source === "TEMPLATE" ? "amber" : "green"}>
                {labelFor(PLAN_SOURCE_LABELS, current.source)}
              </Badge>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {current.workouts?.map((w) => (
              <Link
                key={w.id}
                href={`/workouts/${w.id}`}
                className="group rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-brand-500/40 hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Day {w.dayNumber}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:text-brand-300" />
                </div>
                <div className="mt-1 font-semibold text-slate-100">{w.name}</div>
                <div className="text-xs text-slate-400">{w.focus}</div>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatMinutes(w.durationMinutes)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {w.exercises.length} exercises
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ) : (
        <EmptyState
          title={needsProfile ? "No plan yet" : "No active plan"}
          description={
            needsProfile
              ? "Complete your profile to generate a plan."
              : "Your AI plan will appear here after generation."
          }
        />
      )}

      {history.length > 0 ? (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <History className="h-5 w-5 text-brand-300" /> Plan history
          </h2>
          <Card className="divide-y divide-white/5 !p-0">
            {history.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <div className="font-medium text-slate-100">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {labelFor(GOAL_LABELS, p.goal)} · {p.durationWeeks} weeks ·{" "}
                    {new Date(p.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={p.status === "ARCHIVED" ? "neutral" : "green"}>
                    {p.status}
                  </Badge>
                  <Badge tone={p.source === "TEMPLATE" ? "amber" : "brand"}>
                    {labelFor(PLAN_SOURCE_LABELS, p.source)}
                  </Badge>
                </div>
              </div>
            ))}
          </Card>
        </div>
      ) : null}
    </div>
  );
}