import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Clock,
  Dumbbell,
  Flame,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import type {
  CurrentPlanResponse,
  InsightResponse,
  OverviewPayload,
  TodaysWorkoutResponse,
} from "@/lib/client-types";
import { formatMinutes, labelFor, GOAL_LABELS } from "@/lib/labels";
import {
  Badge,
  Card,
  EmptyState,
  ProgressBar,
  StatCard,
} from "@/components/ui";
import { AIInsightCard } from "@/components/ai-insight-card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.profile) redirect("/onboarding");

  const [overviewData, todayData, planData] = await Promise.all([
    serverApi<OverviewPayload>("/api/analytics/overview").catch(() => null),
    serverApi<TodaysWorkoutResponse>("/api/workouts/today").catch(() => null),
    serverApi<CurrentPlanResponse>("/api/plans/current").catch(() => null),
  ]);

  const overview = overviewData?.overview;
  const consistency = overviewData?.consistency;
  const workout = todayData?.workout ?? null;
  const planNeeded = planData?.needsPlan ?? false;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {greeting}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {user.profile.goal ? (
          <Badge tone="brand">{labelFor(GOAL_LABELS, user.profile.goal)}</Badge>
        ) : null}
      </div>

      {planNeeded ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 bg-brand-gradient !border-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-white">Ready for your first plan?</div>
              <p className="text-sm text-white/80">
                Generate a personalized AI training plan in seconds.
              </p>
            </div>
          </div>
          <Link href="/plans" className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-50">
            Generate plan <ArrowRight className="inline h-4 w-4" />
          </Link>
        </Card>
      ) : null}

      {overview ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="XP"
            value={overview.xp.toLocaleString()}
            hint="Total experience"
            icon={<Flame className="h-5 w-5" />}
          />
          <StatCard
            label="Workouts"
            value={overview.totalWorkouts}
            hint="All time"
            icon={<Dumbbell className="h-5 w-5" />}
          />
          <StatCard
            label="Current streak"
            value={`${overview.currentStreak} d`}
            hint={overview.currentStreak > 0 ? "Keep it going!" : "Start a streak"}
            icon={<Flame className="h-5 w-5" />}
          />
          <StatCard
            label="Completion rate"
            value={`${overview.completionRate}%`}
            hint="Last 6 weeks"
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {workout ? (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">{workout.name}</h2>
                  <p className="text-sm text-slate-400">{workout.focus}</p>
                </div>
                <Badge tone="green">{workout.dayNumber} of plan week</Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {formatMinutes(workout.durationMinutes)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Dumbbell className="h-4 w-4" /> {workout.exercises.length} exercises
                </span>
                {workout.scheduledFor ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    Next: {new Date(workout.scheduledFor).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href={`/workouts/${workout.id}`} className="btn-primary">
                  {workout.scheduledFor ? "View workout" : "View today's workout"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/plans" className="btn-ghost">View plan</Link>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No workout scheduled today"
              description="Your plan will show today's session here. Generate a plan to get started."
            />
          )}
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Award className="h-5 w-5 text-brand-300" /> This week
          </h2>
          {consistency ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-slate-400">Weekly goal</span>
                  <span className="font-medium text-slate-200">
                    {consistency.completed}/{consistency.planned} workouts
                  </span>
                </div>
                <ProgressBar value={consistency.completed} max={consistency.planned} />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-slate-400">Consistency</span>
                  <span className="font-medium text-slate-200">{consistency.percentage}%</span>
                </div>
                <ProgressBar value={consistency.percentage} tone="green" />
              </div>
              <p className="text-xs text-slate-500">
                {overview?.workoutsThisWeek ?? 0} workout{overview?.workoutsThisWeek === 1 ? "" : "s"} completed this week
                {overview?.weeklyGoalMet ? " — goal met! 🎉" : ""}
              </p>
            </div>
          ) : null}
        </Card>
      </div>

      <AIInsightCard />
    </div>
  );
}