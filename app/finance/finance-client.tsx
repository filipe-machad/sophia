"use client";

import { useMemo, useState } from "react";
import { Banknote, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign, ReceiptText, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "../_components/app-sidebar";
import styles from "./finance.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
const TIME_ZONE = "America/Sao_Paulo";

type PaymentStatus = "pending" | "paid" | "waived";
type FinanceFilter = "all" | PaymentStatus;

export type FinanceAppointment = {
  id: string;
  clientId: string;
  clientName: string;
  startsAt: string;
  durationMinutes: number;
  mode: "online" | "in_person";
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  absenceJustified: boolean | null;
  paymentStatus: PaymentStatus;
  amount: string;
  paidAt: string | null;
};

type FinanceClientProps = {
  demo: boolean;
  initialAppointments: FinanceAppointment[];
  initialError?: string | null;
  month: string;
};

const paymentLabels: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  waived: "Não cobrada",
};

const sessionLabels: Record<FinanceAppointment["status"], string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  cancelled: "Cancelada",
  no_show: "Falta",
};

function demoAppointments(month: string): FinanceAppointment[] {
  return [
    { id: "finance-1", clientId: "demo-1", clientName: "Ana Martins", startsAt: month + "-05T09:00:00-03:00", durationMinutes: 50, mode: "online", status: "completed", absenceJustified: null, paymentStatus: "paid", amount: "180.00", paidAt: month + "-05T14:00:00-03:00" },
    { id: "finance-2", clientId: "demo-2", clientName: "Luísa Barros", startsAt: month + "-12T15:00:00-03:00", durationMinutes: 50, mode: "online", status: "completed", absenceJustified: null, paymentStatus: "pending", amount: "200.00", paidAt: null },
    { id: "finance-3", clientId: "demo-3", clientName: "Rafael Costa", startsAt: month + "-18T11:30:00-03:00", durationMinutes: 50, mode: "in_person", status: "no_show", absenceJustified: true, paymentStatus: "waived", amount: "160.00", paidAt: null },
    { id: "finance-4", clientId: "demo-1", clientName: "Ana Martins", startsAt: month + "-24T09:00:00-03:00", durationMinutes: 50, mode: "online", status: "scheduled", absenceJustified: null, paymentStatus: "pending", amount: "180.00", paidAt: null },
  ];
}

function formatCurrency(value: number | string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function shiftMonth(month: string, offset: number) {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + offset, 1));
  return String(date.getUTCFullYear()).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
}

export default function FinanceClient({ demo, initialAppointments, initialError = null, month }: FinanceClientProps) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<FinanceAppointment[]>(demo ? demoAppointments(month) : initialAppointments);
  const [filter, setFilter] = useState<FinanceFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(initialError);

  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: TIME_ZONE,
    year: "numeric",
  }).format(new Date(month + "-15T12:00:00-03:00"));

  const summary = useMemo(() => {
    const charged = appointments.filter(item => item.paymentStatus !== "waived");
    const paid = appointments.filter(item => item.paymentStatus === "paid");
    const pending = appointments.filter(item => item.paymentStatus === "pending");
    const waived = appointments.filter(item => item.paymentStatus === "waived");
    return {
      charged: charged.reduce((total, item) => total + Number(item.amount), 0),
      paid: paid.reduce((total, item) => total + Number(item.amount), 0),
      pending: pending.reduce((total, item) => total + Number(item.amount), 0),
      pendingCount: pending.length,
      waived: waived.reduce((total, item) => total + Number(item.amount), 0),
    };
  }, [appointments]);

  const visibleAppointments = useMemo(
    () => filter === "all" ? appointments : appointments.filter(item => item.paymentStatus === filter),
    [appointments, filter],
  );

  function navigateMonth(offset: number) {
    const nextMonth = shiftMonth(month, offset);
    router.push("/finance?month=" + nextMonth + (demo ? "&demo=1" : ""));
  }

  async function updatePayment(appointment: FinanceAppointment) {
    const status: "pending" | "paid" = appointment.paymentStatus === "paid" ? "pending" : appointment.paymentStatus === "waived" ? "pending" : "paid";
    setUpdatingId(appointment.id);
    setMessage(null);

    if (demo) {
      setAppointments(current => current.map(item => item.id === appointment.id ? {
        ...item,
        paymentStatus: status,
        paidAt: status === "paid" ? new Date().toISOString() : null,
      } : item));
      setUpdatingId(null);
      return;
    }

    try {
      const response = await fetch(API_URL + "/appointments/" + appointment.id + "/payment", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error();
      const body = await response.json() as { payment: { status: PaymentStatus; paidAt: string | null } };
      setAppointments(current => current.map(item => item.id === appointment.id ? { ...item, paymentStatus: body.payment.status, paidAt: body.payment.paidAt } : item));
    } catch {
      setMessage("Não foi possível atualizar este pagamento.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className={styles.shell}>
      <AppSidebar active="finance" demo={demo} />
      <section className={styles.content}>
        <header className={styles.header}>
          <div><p>CONTROLE ADMINISTRATIVO</p><h1>Financeiro</h1><span>Acompanhe cobranças e recebimentos por sessão.</span></div>
          <div className={styles.monthPicker}>
            <button aria-label="Mês anterior" onClick={() => navigateMonth(-1)} type="button"><ChevronLeft size={17}/></button>
            <strong>{monthLabel}</strong>
            <button aria-label="Próximo mês" onClick={() => navigateMonth(1)} type="button"><ChevronRight size={17}/></button>
          </div>
        </header>

        <section aria-label="Resumo financeiro do mês" className={styles.summary}>
          <article><span><ReceiptText size={18}/></span><div><small>COBRADO NO MÊS</small><strong>{formatCurrency(summary.charged)}</strong><p>{appointments.filter(item => item.paymentStatus !== "waived").length} sessões cobradas</p></div></article>
          <article className={styles.received}><span><CheckCircle2 size={18}/></span><div><small>RECEBIDO</small><strong>{formatCurrency(summary.paid)}</strong><p>Pagamentos confirmados</p></div></article>
          <article className={styles.pending}><span><CircleDollarSign size={18}/></span><div><small>A RECEBER</small><strong>{formatCurrency(summary.pending)}</strong><p>{summary.pendingCount} {summary.pendingCount === 1 ? "sessão pendente" : "sessões pendentes"}</p></div></article>
          <article><span><Banknote size={18}/></span><div><small>NÃO COBRADO</small><strong>{formatCurrency(summary.waived)}</strong><p>Cancelamentos e acordos</p></div></article>
        </section>

        {message ? <p className={styles.message} role="alert">{message}</p> : null}

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div><p>LANÇAMENTOS</p><h2>Sessões de {monthLabel}</h2></div>
            <div aria-label="Filtrar pagamentos" className={styles.filters}>
              {(["all", "pending", "paid", "waived"] as const).map(value => (
                <button aria-pressed={filter === value} key={value} onClick={() => setFilter(value)} type="button">
                  {value === "all" ? "Todos" : paymentLabels[value]}
                </button>
              ))}
            </div>
          </div>

          {visibleAppointments.length === 0 ? (
            <div className={styles.empty}><WalletCards size={25}/><h3>Nenhum lançamento aqui</h3><p>{appointments.length === 0 ? "As sessões criadas na agenda aparecerão automaticamente." : "Não há pagamentos com este estado no mês."}</p></div>
          ) : (
            <div className={styles.tableWrap}>
              <div className={styles.tableHead}><span>DATA</span><span>CLIENTE</span><span>SESSÃO</span><span>VALOR</span><span>PAGAMENTO</span><span>AÇÃO</span></div>
              {visibleAppointments.map(appointment => {
                const startsAt = new Date(appointment.startsAt);
                return <article className={styles.row} key={appointment.id}>
                  <time><strong>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: TIME_ZONE }).format(startsAt).replace(".", "")}</strong><small>{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }).format(startsAt)}</small></time>
                  <div className={styles.client}><span>{appointment.clientName.slice(0, 1).toUpperCase()}</span><strong>{appointment.clientName}</strong></div>
                  <div><span className={styles.sessionStatus} data-status={appointment.status}>{sessionLabels[appointment.status]}</span><small className={styles.secondary}>{appointment.mode === "online" ? "Online" : "Presencial"} · {appointment.durationMinutes} min</small></div>
                  <strong className={styles.amount}>{formatCurrency(appointment.amount)}</strong>
                  <div><span className={styles.paymentStatus} data-status={appointment.paymentStatus}>{paymentLabels[appointment.paymentStatus]}</span>{appointment.paidAt ? <small className={styles.secondary}>em {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIME_ZONE }).format(new Date(appointment.paidAt))}</small> : null}</div>
                  <button disabled={updatingId === appointment.id} onClick={() => void updatePayment(appointment)} type="button">{updatingId === appointment.id ? "Salvando…" : appointment.paymentStatus === "paid" ? "Desfazer" : appointment.paymentStatus === "waived" ? "Cobrar" : "Marcar pago"}</button>
                </article>;
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
