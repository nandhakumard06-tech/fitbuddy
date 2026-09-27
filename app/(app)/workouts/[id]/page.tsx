import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Dumbbell,
  Info,
  Timer,
} from "lucide-react";
import { serverApi } from "@/lib/server-api";
import type { FullExercise, Workout } from "@/lib/client-types";
import { formatMinutes } from "@/lib/labels";
import { Badge, Card } from "@/components/ui";
import { StartWorkoutButton } from "@/components/workout-actions";

export const metadata = { title: "Workout" };

interface WorkoutResponse {
  workout: Omit<Workout, "exercises"> & {
    exercises: {
      id: string;
      workoutId: string;
      exerciseId: string;
      sets: number;
      reps: number;
      restSeconds: number;
      orderIndex: number;
      exercise: FullExercise;
    }[];
  };
}

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await serverApi<WorkoutResponse>(`/api/workouts/${id}`).catch(
    () => null
  );
  if (!data?.workout) notFound();

  const workout = data.workout;

  return (
    <div className="space-y-6">
      <Link
        href="/workouts"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Workouts
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{workout.name}</h1>
          <p className="mt-1 text-sm text-slate-400">{workout.focus}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {formatMinutes(workout.durationMinutes)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Dumbbell className="h-4 w-4" /> {workout.exercises.length} exercises
            </span>
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <StartWorkoutButton workoutId={workout.id} label="Start workout" />
        </div>
      </div>

      {workout.warmup.length > 0 ? (
        <Card>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-300">
            <Timer className="h-4 w-4" /> Warm up
          </div>
          <ul className="space-y-1 text-sm text-slate-300">
            {workout.warmup.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="space-y-4">
        {workout.exercises.map((we, i) => (
          <Card key={we.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-slate-300">
                  {i + 1}
                </span>
                <div>
                  <div className="font-semibold text-slate-100">
                    {we.exercise.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {we.exercise.muscleGroup}
                  </div>
                </div>
              </div>
              <Badge tone="brand">
                {we.sets} × {we.reps} · rest {we.restSeconds}s
              </Badge>
            </div>

            {we.exercise.instructions?.length ? (
              <div className="mt-3 rounded-lg bg-navy-900 p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Info className="h-3.5 w-3.5" /> Technique
                </div>
                <ul className="space-y-1 text-sm text-slate-300">
                  {we.exercise.instructions.slice(0, 5).map((step, si) => (
                    <li key={`${step}-${si}`} className="flex items-start gap-2">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {we.exercise.safetyNotes ? (
              <p className="mt-3 text-xs text-amber-300/80">
                ⚠ {we.exercise.safetyNotes}
              </p>
            ) : null}
          </Card>
        ))}
      </div>

      {workout.cooldown.length > 0 ? (
        <Card>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-300">
            <Timer className="h-4 w-4" /> Cool down
          </div>
          <ul className="space-y-1 text-sm text-slate-300">
            {workout.cooldown.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}