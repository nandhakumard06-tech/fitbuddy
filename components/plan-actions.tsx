"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical, Sparkles } from "lucide-react";
import { postJson, ApiRequestError } from "@/lib/http";
import { Button, ErrorNotice } from "@/components/ui";

export function GeneratePlanButton({
  hasActivePlan,
}: {
  hasActivePlan: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/plans/generate");
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
      <Button
        onClick={handleGenerate}
        loading={loading}
        className="px-5 py-2.5"
      >
        <Sparkles className="h-4 w-4" />
        {hasActivePlan ? "Regenerate plan" : "Generate my plan"}
      </Button>
      {error ? <ErrorNotice message={error} /> : null}
    </div>
  );
}

export function AdaptPlanButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdapt() {
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/plans/adapt", { feedback: feedback.trim() });
      router.push("/plans/review");
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
      <Button variant="ghost" onClick={() => setOpen((o) => !o)}>
        <FlaskConical className="h-4 w-4" />
        Adapt with AI
      </Button>
      {open ? (
        <div className="space-y-2 rounded-lg border border-white/10 bg-navy-900 p-3">
          <textarea
            className="input min-h-[72px]"
            placeholder="e.g. Add more leg volume, shorten rest times, less cardio…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleAdapt} loading={loading} className="flex-1">
              Generate adaptation
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
          {error ? <ErrorNotice message={error} /> : null}
        </div>
      ) : null}
    </div>
  );
}