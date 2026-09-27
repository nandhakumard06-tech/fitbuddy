"use client";

import { useEffect, useState } from "react";
import { Flame, Sparkles, TrendingUp } from "lucide-react";
import type { InsightResponse } from "@/lib/client-types";
import { Card } from "@/components/ui";

export function AIInsightCard() {
  const [insight, setInsight] = useState<InsightResponse["insight"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadInsight() {
      try {
        const res = await fetch("/api/ai/insights", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!res.ok) {
          return;
        }

        const payload = (await res.json()) as InsightResponse;
        if (!cancelled) {
          setInsight(payload.insight ?? null);
        }
      } catch {
        if (!cancelled) {
          setInsight(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInsight();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!insight && !loading) return null;

  if (!insight) {
    return (
      <Card className="border-brand-500/30 bg-brand-600/10">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Sparkles className="h-5 w-5 text-brand-300" /> AI Coach Insights
        </h2>
        <p className="mt-2 text-sm text-slate-300">Loading your personalized coaching insights…</p>
      </Card>
    );
  }

  return (
    <Card className="border-brand-500/30 bg-brand-600/10">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
        <Sparkles className="h-5 w-5 text-brand-300" /> AI Coach Insights
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">{insight.summary}</p>

      {insight.highlights.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Highlights
            </div>
            <ul className="space-y-1.5 text-sm text-slate-300">
              {insight.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-white/5 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">
              Recommendations
            </div>
            <ul className="space-y-1.5 text-sm text-slate-300">
              {insight.recommendations.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
