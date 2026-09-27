import {
  Activity,
  Award,
  BarChart3,
  CalendarCheck,
  Dumbbell,
  Flame,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { serverApi } from "@/lib/server-api";
import type {
  FrequencyPoint,
  InsightResponse,
  MusclePoint,
  OverviewPayload,
  StrengthResponse,
  VolumePoint,
} from "@/lib/client-types";
import { Card, EmptyState, StatCard } from "@/components/ui";
import {
  FrequencyChart,
  MuscleChart,
  StrengthChart,
  VolumeChart,
} from "@/components/charts";
import { AIInsightCard } from "@/components/ai-insight-card";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const [overviewData, frequency, volume, muscles, strength] =
    await Promise.all([
      serverApi<OverviewPayload>("/api/analytics/overview").catch(() => null),
      serverApi<{ data: FrequencyPoint[] }>("/api/analytics/frequency?weeks=12").catch(
        () => null
      ),
      serverApi<{ data: VolumePoint[] }>("/api/analytics/volume?days=90").catch(
        () => null
      ),
      serverApi<{ data: MusclePoint[] }>("/api/analytics/muscles").catch(() => null),
      serverApi<StrengthResponse>("/api/analytics/strength").catch(() => null),
    ]);

  const overview = overviewData?.overview;
  const frequencyData = frequency?.data ?? [];
  const volumeData = volume?.data ?? [];
  const muscleData = muscles?.data ?? [];
  const strengthData = strength?.strength ?? [];
  const strengthRecords = strength?.records ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-slate-400">
          Trends, volume, strength and consistency.
        </p>
      </div>

      {overview ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Workouts" value={overview.totalWorkouts} icon={<Dumbbell className="h-5 w-5" />} />
          <StatCard label="Completion" value={`${overview.averageCompletionPct}%`} icon={<Activity className="h-5 w-5" />} />
          <StatCard label="Total volume" value={`${Math.round(overview.totalVolume).toLocaleString()} kg`} icon={<BarChart3 className="h-5 w-5" />} />
          <StatCard label="Streak" value={`${overview.currentStreak} d`} icon={<Flame className="h-5 w-5" />} />
        </div>
      ) : null}

      <AIInsightCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <BarChart3 className="h-5 w-5 text-brand-300" /> Volume (90 days)
          </h2>
          {volumeData.length > 0 ? (
            <div className="mt-4">
              <VolumeChart data={volumeData} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No volume data yet. Complete workouts to see trends.</p>
          )}
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <CalendarCheck className="h-5 w-5 text-brand-300" /> Training frequency
          </h2>
          {frequencyData.length > 0 ? (
            <div className="mt-4">
              <FrequencyChart data={frequencyData} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No frequency data yet.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Dumbbell className="h-5 w-5 text-brand-300" /> Muscle balance
          </h2>
          {muscleData.length > 0 ? (
            <div className="mt-4">
              <MuscleChart data={muscleData} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No muscle data yet.</p>
          )}
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <TrendingUp className="h-5 w-5 text-brand-300" /> Strength progression
          </h2>
          {strengthData.length > 0 ? (
            <div className="mt-4">
              <StrengthChart data={strengthData} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Complete a workout to record lifts.</p>
          )}
        </Card>
      </div>

      {strengthRecords.length > 0 ? (
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Award className="h-5 w-5 text-amber-300" /> Personal records
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {strengthRecords.map((r) => (
              <div
                key={r.exercise}
                className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
              >
                <div>
                  <div className="font-medium text-slate-100">{r.exercise}</div>
                  <div className="text-xs text-slate-500">
                    {r.muscleGroup} · {new Date(r.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="text-lg font-bold text-amber-300">
                  {r.bestWeight} kg
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {!overview && !frequencyData.length && !volumeData.length ? (
        <EmptyState title="No data yet" description="Start logging workouts to see analytics." />
      ) : null}
    </div>
  );
}