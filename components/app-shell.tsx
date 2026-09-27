"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Scale,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import { postJson } from "@/lib/http";
import type { PublicUser } from "@/lib/client-types";
import { useState } from "react";
import { Spinner } from "@/components/ui";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workouts/today", label: "Today's Workout", icon: CalendarDays },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/plans", label: "Plan", icon: Sparkles },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/progress", label: "Progress", icon: Scale },
  { href: "/profile", label: "Profile", icon: UserCircle2 },
];

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={active ? "nav-link-active" : "nav-link"}
          >
            <item.icon className="h-4.5 w-4.5 h-[18px] w-[18px] shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await postJson("/api/auth/logout");
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-white/10 bg-navy-950 px-4 py-6 lg:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold text-white">FitBuddy</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              AI Fitness
            </div>
          </div>
        </Link>

        <nav className="flex-1 space-y-1">
          <NavLinks pathname={pathname} />
        </nav>

        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-sm font-bold text-brand-300">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-100">
                {user.name}
              </div>
              <div className="text-xs text-slate-500">{user.xp} XP</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-slate-500 transition hover:text-slate-200"
              disabled={loggingOut}
            >
              {loggingOut ? <Spinner /> : <LogOut className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-navy-950/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white">
            <Activity className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-white">FitBuddy</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-600/20 px-2.5 py-1 text-xs font-semibold text-brand-300">
            {user.xp} XP
          </span>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-slate-500 transition hover:text-slate-200"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="px-4 pb-24 pt-6 lg:ml-60 lg:px-8 lg:pb-10 lg:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between border-t border-white/10 bg-navy-950/95 px-2 py-2 backdrop-blur lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition ${
                active ? "text-brand-300" : "text-slate-500"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label.split("'")[0].split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}