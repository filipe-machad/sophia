import { redirect } from "next/navigation";
import { serverApi } from "../_lib/server-api";
import AgendaClient, { type Appointment, type AgendaClientRecord } from "./agenda-client";

type AgendaPageProps = {
  searchParams: Promise<{ demo?: string; month?: string }>;
};

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

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const params = await searchParams;
  const demo = params.demo === "1";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "") ? params.month! : currentMonthInSaoPaulo();

  if (demo) return <AgendaClient demo initialAppointments={[]} initialClients={[]} month={month} />;

  const [appointmentsResponse, clientsResponse] = await Promise.all([
    serverApi("/appointments?month=" + month),
    serverApi("/clients?status=all"),
  ]);

  if (appointmentsResponse.status === 401 || clientsResponse.status === 401) redirect("/");

  if (!appointmentsResponse.ok || !clientsResponse.ok) {
    return <AgendaClient demo={false} initialAppointments={[]} initialClients={[]} initialError="Não foi possível carregar a agenda." month={month} />;
  }

  const appointmentsBody = await appointmentsResponse.json() as { appointments: Appointment[] };
  const clientsBody = await clientsResponse.json() as { clients: AgendaClientRecord[] };

  return (
    <AgendaClient
      demo={false}
      initialAppointments={appointmentsBody.appointments}
      initialClients={clientsBody.clients}
      month={month}
    />
  );
}
