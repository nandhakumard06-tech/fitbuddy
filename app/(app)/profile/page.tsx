import Link from "next/link";
import {
  Activity,
  CalendarCheck,
  Flame,
  Pencil,
  Scale,
} from "lucide-react";
import { serverApi } from "@/lib/server-api";
import type { MetricSummary, Profile, PublicUser } from "@/lib/client-types";
import {
  ACTIVITY_LABELS,
  DAY_LABELS,
  EQUIPMENT_LABELS,
  GENDER_LABELS,
  GOAL_LABELS,
  LEVEL_LABELS,
  PREFERENCE_LABELS,
  labelFor,
} from "@/lib/labels";
import { Badge, Card, EmptyState, StatCard } from "@/components/ui";

export const metadata = { title: "Profile" };

interface ProfileResponse {
  profile: Profile & { user?: PublicUser };
}

export default async function ProfilePage() {
  const [profileData, metricsData] = await Promise.all([
    serverApi<ProfileResponse>("/api/profile").catch(() => null),
    serverApi<MetricSummary>("/api/fitness/metrics").catch(() => null),
  ]);

  const profile = profileData?.profile ?? null;
  const metrics = metricsData;

  if (!profile) {
    return (
      <EmptyState
        title="No profile yet"
        description="Set up your profile to get a personalized plan."
        action={
          <Link href="/onboarding" className="btn-primary">Set up profile</Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Profile</h1>
          <p className="mt-1 text-sm text-slate-400">Your details at a glance.</p>
        </div>
        <Link href="/onboarding" className="btn-ghost">
          <Pencil className="h-4 w-4" /> Update profile
        </Link>
      </div>

      <Card className="flex flex-wrap items-center gap-4 p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-xl font-bold text-white">
          {profile.user?.name?.charAt(0).toUpperCase() ?? "F"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-white">{profile.user?.name ?? "You"}</div>
          <div className="text-sm text-slate-400">{profile.user?.email ?? "—"}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="brand">{labelFor(GOAL_LABELS, profile.goal)}</Badge>
          <Badge tone="green">{labelFor(LEVEL_LABELS, profile.fitnessLevel)}</Badge>
        </div>
      </Card>

      {metrics ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="XP" value={profile.user?.xp ?? 0} icon={<Flame className="h-5 w-5" />} />
          <StatCard label="BMI" value={metrics.assessment?.bmi ?? "—"} hint={metrics.assessment?.bmiCategory} icon={<Scale className="h-5 w-5" />} />
          <StatCard label="Workouts" value={metrics.totalCompletedWorkouts} icon={<Activity className="h-5 w-5" />} />
          <StatCard
            label="This week"
            value={`${metrics.workoutsThisWeek}/${metrics.weeklyGoal ?? "—"}`}
            hint="Weekly goal"
            icon={<CalendarCheck className="h-5 w-5" />}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-white">Body</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              { label: "Age", value: profile.age },
              { label: "Gender", value: labelFor(GENDER_LABELS, profile.gender) },
              { label: "Height", value: `${profile.heightCm} cm` },
              { label: "Weight", value: `${profile.weightKg} kg` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-white/5 pb-2">
                <dt className="text-slate-400">{row.label}</dt>
                <dd className="font-medium text-slate-100">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white">Training</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              { label: "Goal", value: labelFor(GOAL_LABELS, profile.goal) },
              { label: "Level", value: labelFor(LEVEL_LABELS, profile.fitnessLevel) },
              { label: "Activity", value: labelFor(ACTIVITY_LABELS, profile.activityLevel) },
              { label: "Days / week", value: profile.daysPerWeek },
              { label: "Session length", value: `${profile.workoutDurationMin} min` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-white/5 pb-2">
                <dt className="text-slate-400">{row.label}</dt>
                <dd className="font-medium text-slate-100">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-white">Preferences</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Training days
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.preferredTrainingDays.length > 0 ? (
                profile.preferredTrainingDays.map((d) => (
                  <Badge key={d} tone="brand">{DAY_LABELS[d] ?? d}</Badge>
                ))
              ) : (
                <span className="text-xs text-slate-600">None</span>
              )}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Equipment
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.equipment.map((eq) => (
                <Badge key={eq} tone="neutral">{labelFor(EQUIPMENT_LABELS, eq)}</Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Interests
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.preferences.map((p) => (
                <Badge key={p} tone="green">{labelFor(PREFERENCE_LABELS, p)}</Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/plans" className="btn-primary">
          View my plan
        </Link>
        <Link href="/analytics" className="btn-ghost">View analytics</Link>
      </div>
    </div>
  );
}