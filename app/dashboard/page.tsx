import { redirect } from "next/navigation";
import { serverApi } from "../_lib/server-api";
import DashboardClient, { type User } from "./dashboard-client";

type DashboardPageProps = { searchParams: Promise<{ demo?: string }> };
const demoUser: User = { professionalName: "Artemis", email: "demo@sophia.local" };

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { demo: demoParam } = await searchParams;
  if (demoParam === "1") return <DashboardClient demo user={demoUser} />;

  const response = await serverApi("/auth/me");
  if (response.status === 401) redirect("/");
  if (!response.ok) throw new Error("Não foi possível carregar a sessão.");

  const { user } = await response.json() as { user: User };
  return <DashboardClient demo={false} user={user} />;
}
