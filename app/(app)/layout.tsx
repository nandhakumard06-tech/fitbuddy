import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const metadata = {
  title: "FitBuddy",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      user={{ id: user.id, name: user.name, email: user.email, xp: user.xp }}
    >
      {children}
    </AppShell>
  );
}