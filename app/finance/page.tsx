import { redirect } from "next/navigation";
import { serverApi } from "../_lib/server-api";
import FinanceClient, { type FinanceAppointment } from "./finance-client";

type FinancePageProps = {
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

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const params = await searchParams;
  const demo = params.demo === "1";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "") ? params.month! : currentMonthInSaoPaulo();

  if (demo) return <FinanceClient demo initialAppointments={[]} month={month} />;

  const response = await serverApi("/appointments?month=" + month);
  if (response.status === 401) redirect("/");
  if (!response.ok) {
    return <FinanceClient demo={false} initialAppointments={[]} initialError="Não foi possível carregar o financeiro." month={month} />;
  }

  const body = await response.json() as { appointments: FinanceAppointment[] };
  return <FinanceClient demo={false} initialAppointments={body.appointments} month={month} />;
}
