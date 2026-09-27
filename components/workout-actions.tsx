"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Play } from "lucide-react";
import { postJson, ApiRequestError } from "@/lib/http";
import { Button, ErrorNotice } from "@/components/ui";

/**
 * Starts a workout session (idempotent) and navigates to the tracking view.
 * Works for any workout id via the /api/workouts/today start endpoint.
 */
export function StartWorkoutButton({
  workoutId,
  label = "Start workout",
  fullWidth = false,
}: {
  workoutId: string;
  label?: string;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/workouts/today", { workoutId });
      router.push(`/workouts/${workoutId}/track`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleStart} loading={loading} fullWidth={fullWidth}>
        <Play className="h-4 w-4" /> {label}
      </Button>
      {error ? <ErrorNotice message={error} /> : null}
    </div>
  );
}