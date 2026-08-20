import { redirect } from "next/navigation";
import { serverApi } from "../_lib/server-api";
import DashboardClient, { type DashboardAppointment, type User } from "./dashboard-client";

type DashboardPageProps = { searchParams: Promise<{ demo?: string }> };
const demoUser: User = { professionalName: "Artemis", email: "demo@sophia.local" };

function currentMonthInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find(part => part.type === "year")?.value;
  const month = parts.find(part => part.type === "month")?.value;
  return year && month ? year + "-" + month : "2026-08";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { demo: demoParam } = await searchParams;
  const demo = demoParam === "1";
  const month = currentMonthInSaoPaulo();
  const nowIso = new Date().toISOString();

  if (demo) {
    return <DashboardClient appointments={[]} demo expectedSessions={12} month={month} nowIso={nowIso} user={demoUser} />;
  }

  const [userResponse, appointmentsResponse, clientsResponse] = await Promise.all([
    serverApi("/auth/me"),
    serverApi("/appointments?month=" + month),
    serverApi("/clients"),
  ]);

  if (userResponse.status === 401 || appointmentsResponse.status === 401 || clientsResponse.status === 401) redirect("/");
  if (!userResponse.ok || !appointmentsResponse.ok || !clientsResponse.ok) throw new Error("Não foi possível carregar o dashboard.");

  const { user } = await userResponse.json() as { user: User };
  const { appointments } = await appointmentsResponse.json() as { appointments: DashboardAppointment[] };
  const clientsBody = await clientsResponse.json() as { clients: Array<{ sessionsPerMonth: number }> };
  const expectedSessions = clientsBody.clients.reduce((total, client) => total + client.sessionsPerMonth, 0);

  return (
    <DashboardClient
      appointments={appointments}
      demo={false}
      expectedSessions={expectedSessions}
      month={month}
      nowIso={nowIso}
      user={user}
    />
  );
}
