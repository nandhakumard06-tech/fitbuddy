import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Dumbbell, Sparkles } from "lucide-react";
import { serverApi } from "@/lib/server-api";
import type { CurrentPlanResponse } from "@/lib/client-types";
import { formatMinutes } from "@/lib/labels";
import { Badge, Card, EmptyState } from "@/components/ui";

export const metadata = { title: "Workouts" };

export default async function WorkoutsPage() {
  const data = await serverApi<CurrentPlanResponse>("/api/plans/current").catch(
    () => null
  );
  const plan = data?.plan ?? null;

  if (!plan) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Workouts</h1>
          <p className="mt-1 text-sm text-slate-400">Your weekly training schedule.</p>
        </div>
        <EmptyState
          title="No plan yet"
          description="Generate an AI plan and your weekly workouts will appear here."
          action={
            <Link href="/plans" className="btn-primary">
              Generate plan <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>
    );
  }

  const workoutCount = plan.workouts?.length ?? 0;
  const todayNumber = new Date().getDay() === 0 ? 7 : new Date().getDay();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Workouts</h1>
        <p className="mt-1 text-sm text-slate-400">
          {plan.name} · {workoutCount} sessions a week.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plan.workouts?.map((w) => {
          const isToday = w.dayNumber === todayNumber;
          return (
            <Link
              key={w.id}
              href={`/workouts/${w.id}`}
              className="group card p-5 transition hover:border-brand-500/40 hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Day {w.dayNumber}
                </span>
                {isToday ? <Badge tone="green">Today</Badge> : <CalendarDays className="h-4 w-4 text-slate-600" />}
              </div>
              <div className="mt-1.5 font-semibold text-slate-100">{w.name}</div>
              <div className="text-xs text-slate-400">{w.focus}</div>
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatMinutes(w.durationMinutes)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Dumbbell className="h-3.5 w-3.5" />
                  {w.exercises.length} exercises
                </span>
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-300 opacity-0 transition group-hover:opacity-100">
                View workout <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {plan.goal ? (
        <Card className="flex items-center gap-3 !border-transparent bg-brand-gradient">
          <Sparkles className="h-5 w-5 text-white" />
          <p className="text-sm text-white">
            <span className="font-semibold">{plan.name}</span> — {plan.durationWeeks} week
            program. Consistency beats intensity.
          </p>
        </Card>
      ) : null}
    </div>
  );
}