"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Circle,
  Clock,
  Trophy,
  X,
} from "lucide-react";
import { api, postJson, ApiRequestError } from "@/lib/http";
import type {
  CompleteWorkoutResponse,
  Workout,
} from "@/lib/client-types";
import { Button, Card, ErrorNotice, Spinner } from "@/components/ui";

interface WorkoutResponse {
  workout: Workout;
}

interface SessionResponse {
  session: { startedAt: string };
}

type ExerciseState = {
  completed: boolean;
  rpe: string;
  sets: { weight: string; reps: string; completed: boolean }[];
};

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function TrackWorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [states, setStates] = useState<Record<string, ExerciseState>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<CompleteWorkoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [w, session] = await Promise.all([
          api<WorkoutResponse>(`/api/workouts/${id}`),
          postJson<SessionResponse>(`/api/workouts/${id}/start`),
        ]);
        if (cancelled) return;
        const workout = w.workout;
        setWorkout(workout);
        setStartedAt(new Date(session.session.startedAt).getTime());
        setStates(
          Object.fromEntries(
            workout.exercises.map((we) => [
              we.exerciseId,
              {
                completed: true,
                rpe: "",
                sets: Array.from({ length: we.sets }, () => ({
                  weight: "",
                  reps: String(we.reps),
                  completed: true,
                })),
              },
            ])
          )
        );
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiRequestError
              ? err.message
              : "Could not load this workout."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;

  function updateSet(
    exerciseId: string,
    setIndex: number,
    patch: Partial<ExerciseState["sets"][number]>
  ) {
    setStates((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        sets: prev[exerciseId].sets.map((s, i) =>
          i === setIndex ? { ...s, ...patch } : s
        ),
      },
    }));
  }

  function updateExercise(
    exerciseId: string,
    patch: Partial<Omit<ExerciseState, "sets">>
  ) {
    setStates((prev) => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], ...patch },
    }));
  }

  async function handleComplete() {
    if (!workout) return;
    setError(null);
    setSubmitting(true);
    try {
      const exercises = workout.exercises.map((we) => {
        const st = states[we.exerciseId];
        return {
          exerciseId: we.exerciseId,
          completed: st.completed,
          rpe: st.rpe ? Number(st.rpe) : null,
          sets: st.sets.map((s) => ({
            weightKg: s.weight ? Number(s.weight) : undefined,
            reps: s.reps ? Number(s.reps) : undefined,
            completed: s.completed,
          })),
        };
      });

      const res = await postJson<CompleteWorkoutResponse>(
        `/api/workouts/${id}/complete`,
        {
          exercises,
          notes: notes.trim() || null,
          durationSeconds: elapsed,
          completionPercentage:
            Math.round(
              (workout.exercises.filter((we) => states[we.exerciseId]?.completed)
                .length /
                workout.exercises.length) *
                100
            ),
        }
      );
      setSummary(res);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return <ErrorNotice message={loadError} />;
  }

  if (!workout) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (summary) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Workout complete!</h1>
          <p className="mt-1 text-sm text-slate-400">
            {summary.completion.completionPct}% of exercises ·{" "}
            {formatDuration(summary.completion.durationSeconds)}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-2xl font-bold text-brand-300">
                +{summary.completion.xpEarned}
              </div>
              <div className="text-xs text-slate-500">XP earned</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-2xl font-bold text-amber-300">
                {summary.personalRecords}
              </div>
              <div className="text-xs text-slate-500">PRs</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-2xl font-bold text-emerald-300">
                {summary.completion.setsCompleted}
                <span className="text-sm text-slate-500">/{summary.completion.totalSets}</span>
              </div>
              <div className="text-xs text-slate-500">Sets</div>
            </div>
          </div>

          {summary.personalRecords > 0 ? (
            <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-amber-300">
              <Trophy className="h-4 w-4" /> New personal record
              {summary.personalRecords > 1 ? "s" : ""}!
            </p>
          ) : null}

          <div className="mt-6 flex justify-center gap-3">
            <Link href="/workouts" className="btn-primary">
              Back to workouts
            </Link>
            <Link href="/analytics" className="btn-ghost">
              <BarChart3 className="h-4 w-4" /> Analytics
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const completedCount = workout.exercises.filter(
    (we) => states[we.exerciseId]?.completed
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/workouts/${workout.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {workout.name}
        </Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 font-mono text-lg font-semibold text-slate-100">
            <Clock className="h-4 w-4 text-brand-300" />
            {formatDuration(elapsed)}
          </span>
          <span className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-slate-400">
            {completedCount}/{workout.exercises.length} done
          </span>
        </div>
      </div>

      {error ? <div><ErrorNotice message={error} /></div> : null}

      <div className="space-y-4">
        {workout.exercises.map((we, i) => {
          const st = states[we.exerciseId];
          return (
            <Card key={we.exerciseId} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-slate-300">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-100">
                      {we.exercise.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {we.exercise.muscleGroup} · target {we.sets} × {we.reps}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    st && updateExercise(we.exerciseId, { completed: !st.completed })
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    st?.completed
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/5 text-slate-400"
                  }`}
                >
                  {st?.completed ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                  {st?.completed ? "Done" : "Skipped"}
                </button>
              </div>

              {st ? (
                <div className="mt-4 space-y-2">
                  <div className="grid grid-cols-[2rem_1fr_1fr_1.5rem] items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:grid-cols-[2rem_1fr_1fr_2.5rem_1.5rem]">
                    <span>Set</span>
                    <span>Weight (kg)</span>
                    <span>Reps</span>
                    <span className="hidden sm:block">RPE</span>
                    <span className="text-right">Done</span>
                  </div>
                  {st.sets.map((s, si) => (
                    <div
                      key={si}
                      className={`grid grid-cols-[2rem_1fr_1fr_1.5rem] items-center gap-2 sm:grid-cols-[2rem_1fr_1fr_2.5rem_1.5rem]`}
                    >
                      <span className="text-center text-sm font-semibold text-slate-400">
                        {si + 1}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="–"
                        value={s.weight}
                        onChange={(e) =>
                          updateSet(we.exerciseId, si, { weight: e.target.value })
                        }
                        className="input !py-1.5 text-center"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        value={s.reps}
                        onChange={(e) =>
                          updateSet(we.exerciseId, si, { reps: e.target.value })
                        }
                        className="input !py-1.5 text-center"
                      />
                      {si === 0 ? (
                        <input
                          type="number"
                          min={1}
                          max={10}
                          placeholder="–"
                          value={st.rpe}
                          onChange={(e) =>
                            updateExercise(we.exerciseId, { rpe: e.target.value })
                          }
                          className="input hidden !py-1.5 text-center sm:block"
                        />
                      ) : (
                        <span className="hidden sm:block" />
                      )}
                      <button
                        onClick={() =>
                          updateSet(we.exerciseId, si, { completed: !s.completed })
                        }
                        className={`ml-auto flex h-6 w-6 items-center justify-center rounded-md border transition ${
                          s.completed
                            ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                            : "border-white/15 text-slate-600"
                        }`}
                        title={s.completed ? "Mark set complete" : "Skip set"}
                      >
                        {s.completed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="mb-2 text-sm font-semibold text-slate-300">Notes</div>
        <textarea
          className="input"
          placeholder="How did it feel? Any notes on the session…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          onClick={handleComplete}
          loading={submitting}
          fullWidth
          className="mt-4 !py-3"
        >
          Complete workout
        </Button>
        <p className="mt-2 text-center text-xs text-slate-500">
          Timer: {formatDuration(elapsed)}
        </p>
      </Card>
    </div>
  );
}