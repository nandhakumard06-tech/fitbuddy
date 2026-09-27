import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarCheck,
  Dumbbell,
  ShieldCheck,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "FitBuddy | AI Fitness Plan Generator",
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const features = [
    {
      icon: BrainCircuit,
      title: "AI-Generated Plans",
      text: "Gemini builds a personalized weekly plan from your goals, level, and equipment.",
    },
    {
      icon: CalendarCheck,
      title: "Structured Workouts",
      text: "Clear sets, reps, rest and warm-up guidance for every session.",
    },
    {
      icon: BarChart3,
      title: "Smart Analytics",
      text: "Track volume, strength PRs, consistency streaks and muscle balance.",
    },
    {
      icon: ShieldCheck,
      title: "Safety First",
      text: "Plans are validated against your fitness level and equipment library.",
    },
  ];

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">FitBuddy</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              AI Fitness
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="btn-primary !px-5 py-2.5"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-600/10 px-3 py-1 text-xs font-medium text-brand-300">
            Powered by Gemini AI
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Your personal{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              AI fitness coach
            </span>{" "}
            in your pocket.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-slate-400">
            Answer a few questions and get a structured, personalized training
            plan. Log workouts, hit personal records, and watch your progress.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/register" className="btn-primary px-6 py-3 text-base">
              Create your plan <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="btn-ghost px-6 py-3 text-base"
            >
              Sign in
            </Link>
          </div>
        </div>
        <div className="hidden justify-end md:flex">
          <div className="w-full max-w-sm space-y-4">
            {features.map((f) => (
              <div key={f.title} className="card flex items-start gap-4 p-5">
                <div className="rounded-lg bg-brand-600/15 p-2.5 text-brand-300">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-100">{f.title}</div>
                  <p className="mt-0.5 text-sm text-slate-400">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card flex flex-col gap-2 p-5">
              <f.icon className="h-6 w-6 text-brand-300" />
              <div className="font-semibold text-slate-100">{f.title}</div>
              <p className="text-sm text-slate-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}