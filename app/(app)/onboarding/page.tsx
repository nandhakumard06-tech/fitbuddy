"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { postJson, ApiRequestError } from "@/lib/http";
import { onboardingSchema } from "@/lib/validation";
import {
  ACTIVITY_LABELS,
  DAYS,
  DAY_LABELS,
  EQUIPMENT_LABELS,
  GENDER_LABELS,
  GOAL_LABELS,
  LEVEL_LABELS,
  PREFERENCE_LABELS,
} from "@/lib/labels";
import type { Profile } from "@/lib/client-types";
import {
  Button,
  Card,
  Checkcard,
  ErrorNotice,
  Field,
  Input,
  Select,
} from "@/components/ui";

const preferenceOptions = [
  "STRENGTH_TRAINING",
  "CARDIO",
  "MOBILITY",
  "BODYWEIGHT",
  "HIIT",
  "HOME_WORKOUTS",
  "GYM_WORKOUTS",
] as const;

const goals = Object.keys(GOAL_LABELS);
const levels = Object.keys(LEVEL_LABELS);
const activityLevels = Object.keys(ACTIVITY_LABELS);
const equipmentOptions = Object.keys(EQUIPMENT_LABELS);
const genders = Object.keys(GENDER_LABELS);

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);

  const [form, setForm] = useState({
    age: "",
    gender: "",
    heightCm: "",
    weightKg: "",
    fitnessLevel: "",
    goal: "",
    activityLevel: "",
    daysPerWeek: "",
    workoutDurationMin: "",
    preferredTrainingDays: [] as string[],
    equipment: [] as string[],
    preferences: [] as string[],
  });

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const profile = data?.data?.profile as Profile | undefined;
        if (!profile) return;
        setPrefilled(true);
        setForm({
          age: String(profile.age),
          gender: profile.gender,
          heightCm: String(profile.heightCm),
          weightKg: String(profile.weightKg),
          fitnessLevel: profile.fitnessLevel,
          goal: profile.goal,
          activityLevel: profile.activityLevel,
          daysPerWeek: String(profile.daysPerWeek),
          workoutDurationMin: String(profile.workoutDurationMin),
          preferredTrainingDays: profile.preferredTrainingDays,
          equipment: profile.equipment,
          preferences: profile.preferences,
        });
      })
      .catch(() => undefined);
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function toggle(list: "preferredTrainingDays" | "equipment" | "preferences", value: string) {
    set(
      list,
      form[list].includes(value)
        ? form[list].filter((v) => v !== value)
        : [...form[list], value]
    );
  }

  const parsed = onboardingSchema.safeParse({ ...form });

  function validateStep(_stepIndex: number): boolean {
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    }
    return true;
  }

  function next() {
    if (step === 0) {
      const required = ["age", "gender", "heightCm", "weightKg"];
      const missing = required.filter((k) => !form[k as keyof typeof form]);
      if (missing.length > 0) {
        const errors: Record<string, string> = {};
        for (const k of missing) errors[k] = "Required.";
        setFieldErrors(errors);
        return;
      }
    }
    if (step === 1) {
      const required = ["fitnessLevel", "goal", "activityLevel", "daysPerWeek", "workoutDurationMin"];
      const missing = required.filter((k) => !form[k as keyof typeof form]);
      if (missing.length > 0) {
        const errors: Record<string, string> = {};
        for (const k of missing) errors[k] = "Required.";
        setFieldErrors(errors);
        return;
      }
    }
    if (step === 2) {
      const missing: string[] = [];
      if (form.preferredTrainingDays.length === 0) missing.push("preferredTrainingDays");
      if (form.equipment.length === 0) missing.push("equipment");
      if (form.preferences.length === 0) missing.push("preferences");
      if (missing.length > 0) {
        const errors: Record<string, string> = {};
        for (const k of missing) errors[k] = "Select at least one.";
        setFieldErrors(errors);
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 2));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    setError(null);
    if (!validateStep(2)) return;
    setLoading(true);
    try {
      await postJson("/api/fitness/assessment", {
        age: Number(form.age),
        gender: form.gender,
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        fitnessLevel: form.fitnessLevel,
        goal: form.goal,
        activityLevel: form.activityLevel,
        daysPerWeek: Number(form.daysPerWeek),
        workoutDurationMin: Number(form.workoutDurationMin),
        preferredTrainingDays: form.preferredTrainingDays,
        equipment: form.equipment,
        preferences: form.preferences,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const steps = ["Basics", "Fitness", "Preferences"];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">
          {prefilled ? "Update your profile" : "Set up your profile"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          This powers your personalized AI plan.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i <= step ? "bg-brand-600 text-white" : "bg-white/10 text-slate-500"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs ${
                  i === step ? "text-slate-200" : "text-slate-500"
                } ${i === steps.length - 1 ? "mr-0" : "hidden sm:inline"}`}
              >
                {label}
              </span>
              {i < steps.length - 1 ? (
                <div className="ml-2 h-px w-6 bg-white/10" />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <Card className="p-6 sm:p-8">
        {error ? <div className="mb-4"><ErrorNotice message={error} /></div> : null}

        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Age" error={fieldErrors.age}>
              <Input
                type="number"
                min={13}
                max={100}
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
                placeholder="25"
              />
            </Field>
            <Field label="Gender" error={fieldErrors.gender}>
              <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="" disabled>Select…</option>
                {genders.map((g) => (
                  <option key={g} value={g}>{GENDER_LABELS[g]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Height (cm)" error={fieldErrors.heightCm}>
              <Input
                type="number"
                step="0.1"
                min={90}
                max={260}
                value={form.heightCm}
                onChange={(e) => set("heightCm", e.target.value)}
                placeholder="175"
              />
            </Field>
            <Field label="Weight (kg)" error={fieldErrors.weightKg}>
              <Input
                type="number"
                step="0.1"
                min={30}
                max={400}
                value={form.weightKg}
                onChange={(e) => set("weightKg", e.target.value)}
                placeholder="80"
              />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <Field label="Fitness level" error={fieldErrors.fitnessLevel}>
              <Select
                value={form.fitnessLevel}
                onChange={(e) => set("fitnessLevel", e.target.value)}
              >
                <option value="" disabled>Select…</option>
                {levels.map((l) => (
                  <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Primary goal" error={fieldErrors.goal}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {goals.map((g) => (
                  <Checkcard
                    key={g}
                    label={GOAL_LABELS[g]}
                    selected={form.goal === g}
                    onClick={() => set("goal", form.goal === g ? "" : g)}
                  />
                ))}
              </div>
            </Field>
            <Field label="Activity level" error={fieldErrors.activityLevel}>
              <Select
                value={form.activityLevel}
                onChange={(e) => set("activityLevel", e.target.value)}
              >
                <option value="" disabled>Select…</option>
                {activityLevels.map((a) => (
                  <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Days per week" error={fieldErrors.daysPerWeek}>
                <Select
                  value={form.daysPerWeek}
                  onChange={(e) => set("daysPerWeek", e.target.value)}
                >
                  <option value="" disabled>Select…</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Workout duration (min)" error={fieldErrors.workoutDurationMin}>
                <Select
                  value={form.workoutDurationMin}
                  onChange={(e) => set("workoutDurationMin", e.target.value)}
                >
                  <option value="" disabled>Select…</option>
                  {[15, 30, 45, 60, 75, 90, 120, 150, 180].map((d) => (
                    <option key={d} value={d}>{d} minutes</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <Field
              label="Preferred training days"
              error={fieldErrors.preferredTrainingDays}
            >
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day) => (
                  <Checkcard
                    key={day}
                    label={DAY_LABELS[day]}
                    selected={form.preferredTrainingDays.includes(day)}
                    onClick={() => toggle("preferredTrainingDays", day)}
                  />
                ))}
              </div>
            </Field>
            <Field label="Available equipment" error={fieldErrors.equipment}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {equipmentOptions.map((eq) => (
                  <Checkcard
                    key={eq}
                    label={EQUIPMENT_LABELS[eq]}
                    selected={form.equipment.includes(eq)}
                    onClick={() => toggle("equipment", eq)}
                  />
                ))}
              </div>
            </Field>
            <Field label="Training preferences" error={fieldErrors.preferences}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {preferenceOptions.map((p) => (
                  <Checkcard
                    key={p}
                    label={PREFERENCE_LABELS[p]}
                    selected={form.preferences.includes(p)}
                    onClick={() => toggle("preferences", p)}
                  />
                ))}
              </div>
            </Field>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={back}
            disabled={step === 0}
            className={step === 0 ? "invisible" : ""}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < 2 ? (
            <Button onClick={next}>
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={loading}>
              {prefilled ? "Save changes" : "Generate my plan"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}