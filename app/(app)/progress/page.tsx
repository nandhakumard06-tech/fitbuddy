import { Dumbbell, LineChart as LineChartIcon, Scale } from "lucide-react";
import { serverApi } from "@/lib/server-api";
import type { ProgressRecordApi } from "@/lib/client-types";
import { Card, EmptyState } from "@/components/ui";
import { AddProgressForm } from "@/components/progress-form";
import { ProgressTrendChart } from "@/components/progress-chart";

export const metadata = { title: "Progress" };

interface ProgressResponse {
  records: ProgressRecordApi[];
  trend: { date: string; weightKg: number }[];
}

export default async function ProgressPage() {
  const data = await serverApi<ProgressResponse>("/api/progress?limit=100").catch(
    () => null
  );

  const records = data?.records ?? [];
  const trend = data?.trend ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Progress</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track your body metrics over time.
          </p>
        </div>
        <AddProgressForm />
      </div>

      {trend.length > 1 ? (
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <LineChartIcon className="h-5 w-5 text-brand-300" /> Weight trend
          </h2>
          <div className="mt-4">
            <ProgressTrendChart trend={trend} />
          </div>
        </Card>
      ) : null}

      {records.length > 0 ? (
        <Card className="divide-y divide-white/5 !p-0">
          {records.slice(0, 20).map((r) => {
            const fields: { label: string; value: number | null }[] = [
              { label: "Weight", value: r.weightKg },
              { label: "BF%", value: r.bodyFatPct },
              { label: "Waist", value: r.waistCm },
              { label: "Chest", value: r.chestCm },
              { label: "Hip", value: r.hipCm },
            ];
            const measurable = fields.filter((f) => f.value != null);
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-400">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-100">
                      {new Date(r.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    {r.notes ? (
                      <div className="text-xs text-slate-500">{r.notes}</div>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-right">
                  {measurable.length > 0 ? (
                    measurable.map((f) => (
                      <div key={f.label}>
                        <div className="text-sm font-semibold text-slate-100">
                          {f.value}{" "}
                          <span className="text-xs font-normal text-slate-500">{f.label}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-slate-600">No measurements</span>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        <EmptyState
          title="No progress entries yet"
          description="Log your weight and measurements to start tracking changes."
          action={<AddProgressForm />}
        />
      )}

      {records.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Dumbbell className="h-3.5 w-3.5" />
          Showing latest {Math.min(records.length, 20)} of {records.length} entries.
        </p>
      ) : null}
    </div>
  );
}