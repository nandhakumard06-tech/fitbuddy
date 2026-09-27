import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Dumbbell,
  Play,
} from "lucide-react";
import { serverApi } from "@/lib/server-api";
import type { TodaysWorkoutResponse } from "@/lib/client-types";
import { formatMinutes } from "@/lib/labels";
import { Badge, Card, EmptyState } from "@/components/ui";
import { StartWorkoutButton } from "@/components/workout-actions";

export const metadata = { title: "Today's Workout" };

export default async function TodayPage() {
  const data = await serverApi<TodaysWorkoutResponse>("/api/workouts/today").catch(
    () => null
  );

  const workout = data?.workout ?? null;
  const activeSession = data?.activeSession ?? null;

  const isScheduled =
    workout && typeof workout.scheduledFor === "string" && workout.scheduledFor !== "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Today&apos;s Workout</h1>
        <p className="mt-1 text-sm text-slate-400">
          {isScheduled ? "Your next session." : "Your session for today."}
        </p>
      </div>

      {activeSession?.workout ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-emerald-500/30 bg-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <Play className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-emerald-100">Workout in progress</div>
              <p className="text-sm text-emerald-200/70">
                {activeSession.workout.name} ·{" "}
                {activeSession.workout.exercises.length} exercises
              </p>
            </div>
          </div>
          <Link
            href={`/workouts/${activeSession.workout.id}/track`}
            className="btn-primary !bg-emerald-500 !text-navy-950 hover:!bg-emerald-400"
          >
            Resume session <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      ) : null}

      {workout ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white">{workout.name}</h2>
                {isScheduled ? (
                  <Badge tone="amber">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(workout.scheduledFor as string).toLocaleDateString(
                      "en-US",
                      { weekday: "long", month: "short", day: "numeric" }
                    )}
                  </Badge>
                ) : (
                  <Badge tone="green">Today</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-400">{workout.focus}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatMinutes(workout.durationMinutes)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Dumbbell className="h-4 w-4" />
                  {workout.exercises.length} exercises
                </span>
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <StartWorkoutButton workoutId={workout.id} label={isScheduled ? "Preview & start" : "Start workout"} />
            </div>
          </div>

          {workout.warmup.length > 0 ? (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Warm up
              </div>
              <ul className="space-y-1 text-sm text-slate-300">
                {workout.warmup.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-5 divide-y divide-white/5">
            {workout.exercises.map((we, i) => (
              <div key={we.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-slate-300">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-medium text-slate-100">
                      {we.exercise.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {we.sets} sets × {we.reps} reps · rest {we.restSeconds}s ·{" "}
                      {we.exercise.muscleGroup}
                    </div>
                  </div>
                </div>
                <Badge tone="neutral">{we.exercise.muscleGroup}</Badge>
              </div>
            ))}
          </div>

          {workout.cooldown.length > 0 ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cool down
              </div>
              <ul className="space-y-1 text-sm text-slate-300">
                {workout.cooldown.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : (
        <EmptyState
          title="No workout scheduled"
          description="Generate a plan first and your daily sessions will show up here."
          action={
            <Link href="/plans" className="btn-primary">
              Generate plan <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      )}
    </div>
  );
}