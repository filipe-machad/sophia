"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, Laptop, MapPin, Plus, Settings2, UserRoundX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "../_components/app-sidebar";
import styles from "./agenda.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
const TIME_ZONE = "America/Sao_Paulo";

type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";
type PaymentStatus = "pending" | "paid" | "waived";

export type Appointment = {
  id: string;
  clientId: string;
  clientName: string;
  startsAt: string;
  durationMinutes: number;
  mode: "online" | "in_person";
  status: AppointmentStatus;
  absenceJustified: boolean | null;
  paymentStatus: PaymentStatus;
  amount: string;
  paidAt: string | null;
};

export type AgendaClientRecord = {
  id: string;
  name: string;
  sessionPrice: string;
};

type AgendaClientProps = {
  demo: boolean;
  initialAppointments: Appointment[];
  initialClients: AgendaClientRecord[];
  initialError?: string | null;
  month: string;
};

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  cancelled: "Cancelada",
  no_show: "Falta",
};

const paymentLabels: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  waived: "Não cobrada",
};

const demoClients: AgendaClientRecord[] = [
  { id: "demo-1", name: "Ana Martins", sessionPrice: "180.00" },
  { id: "demo-2", name: "Luísa Barros", sessionPrice: "200.00" },
  { id: "demo-3", name: "Rafael Costa", sessionPrice: "160.00" },
];

function demoAppointments(month: string): Appointment[] {
  return [
    { id: "session-1", clientId: "demo-1", clientName: "Ana Martins", startsAt: month + "-05T09:00:00-03:00", durationMinutes: 50, mode: "online", status: "completed", absenceJustified: null, paymentStatus: "paid", amount: "180.00", paidAt: month + "-05T14:00:00.000Z" },
    { id: "session-2", clientId: "demo-3", clientName: "Rafael Costa", startsAt: month + "-11T11:30:00-03:00", durationMinutes: 50, mode: "in_person", status: "no_show", absenceJustified: true, paymentStatus: "waived", amount: "160.00", paidAt: null },
    { id: "session-3", clientId: "demo-2", clientName: "Luísa Barros", startsAt: month + "-19T15:00:00-03:00", durationMinutes: 50, mode: "online", status: "scheduled", absenceJustified: null, paymentStatus: "pending", amount: "200.00", paidAt: null },
  ];
}

function sortAppointments(items: Appointment[]) {
  return [...items].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

function formatCurrency(value: string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AgendaClient({ demo, initialAppointments, initialClients, initialError = null, month }: AgendaClientProps) {
  const router = useRouter();
  const clients = demo ? demoClients : initialClients;
  const [appointments, setAppointments] = useState<Appointment[]>(demo ? demoAppointments(month) : initialAppointments);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Appointment | null>(null);
  const [nextStatus, setNextStatus] = useState<AppointmentStatus>("scheduled");
  const [absenceJustified, setAbsenceJustified] = useState(false);
  const [charge, setCharge] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(initialError);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!createOpen && !statusTarget) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCreateOpen(false);
      setStatusTarget(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    const frame = createOpen ? requestAnimationFrame(() => firstFieldRef.current?.focus()) : 0;
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [createOpen, statusTarget]);

  const monthLabel = useMemo(() => new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(month + "-15T12:00:00-03:00")), [month]);

  const summary = useMemo(() => ({
    total: appointments.length,
    completed: appointments.filter(item => item.status === "completed").length,
    absences: appointments.filter(item => item.status === "no_show").length,
    pending: appointments.filter(item => item.paymentStatus === "pending").reduce((sum, item) => sum + Number(item.amount), 0),
  }), [appointments]);

  function navigateMonth(offset: number) {
    const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + offset, 1));
    const nextMonth = String(date.getUTCFullYear()).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
    router.push("/agenda?month=" + nextMonth + (demo ? "&demo=1" : ""));
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const clientId = String(data.get("clientId"));
    const date = String(data.get("date"));
    const time = String(data.get("time"));
    const durationMinutes = Number(data.get("duration"));
    const mode = String(data.get("mode")) as Appointment["mode"];
    const client = clients.find(item => item.id === clientId);

    if (!client) {
      setMessage("Selecione um cliente ativo.");
      setSaving(false);
      return;
    }

    if (demo) {
      const appointment: Appointment = {
        id: "demo-session-" + Date.now(),
        clientId,
        clientName: client.name,
        startsAt: new Date(date + "T" + time + ":00-03:00").toISOString(),
        durationMinutes,
        mode,
        status: "scheduled",
        absenceJustified: null,
        paymentStatus: "pending",
        amount: client.sessionPrice,
        paidAt: null,
      };
      setAppointments(current => sortAppointments([...current, appointment]));
      setCreateOpen(false);
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(API_URL + "/appointments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          startsAt: new Date(date + "T" + time + ":00-03:00").toISOString(),
          durationMinutes,
          mode,
        }),
      });
      if (!response.ok) throw new Error();
      const body = await response.json() as { appointment: Appointment };
      setAppointments(current => sortAppointments([...current, body.appointment]));
      setCreateOpen(false);
    } catch {
      setMessage("Não foi possível criar a sessão.");
    } finally {
      setSaving(false);
    }
  }

  function openStatus(appointment: Appointment) {
    setStatusTarget(appointment);
    setNextStatus(appointment.status);
    setAbsenceJustified(appointment.absenceJustified ?? false);
    setCharge(appointment.paymentStatus !== "waived");
  }

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!statusTarget) return;
    setSaving(true);
    setMessage(null);

    const payload = {
      status: nextStatus,
      ...(nextStatus === "no_show" ? { absenceJustified } : {}),
      charge: nextStatus === "scheduled" || nextStatus === "completed" ? true : charge,
    };
    const paymentStatus: PaymentStatus = payload.charge
      ? statusTarget.paymentStatus === "waived" ? "pending" : statusTarget.paymentStatus
      : "waived";

    if (statusTarget.paymentStatus === "paid" && !payload.charge) {
      setMessage("Uma sessão paga não pode ser marcada como não cobrada. Altere o pagamento para pendente primeiro.");
      setSaving(false);
      return;
    }

    if (demo) {
      setAppointments(current => current.map(item => item.id === statusTarget.id ? {
        ...item,
        status: nextStatus,
        absenceJustified: nextStatus === "no_show" ? absenceJustified : null,
        paymentStatus,
      } : item));
      setStatusTarget(null);
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(API_URL + "/appointments/" + statusTarget.id + "/status", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        if (response.status === 409 && body.error === "paid_payment_cannot_be_waived") {
          throw new Error("paid");
        }
        throw new Error();
      }
      const body = await response.json() as { appointment: Pick<Appointment, "id" | "status" | "absenceJustified" | "paymentStatus"> };
      setAppointments(current => current.map(item => item.id === body.appointment.id ? { ...item, ...body.appointment } : item));
      setStatusTarget(null);
    } catch (error) {
      setMessage(error instanceof Error && error.message === "paid"
        ? "Uma sessão paga não pode ser marcada como não cobrada."
        : "Não foi possível alterar o estado da sessão.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePayment(appointment: Appointment) {
    const status: "pending" | "paid" = appointment.paymentStatus === "paid" ? "pending" : appointment.paymentStatus === "waived" ? "pending" : "paid";
    setMessage(null);

    if (demo) {
      setAppointments(current => current.map(item => item.id === appointment.id ? {
        ...item,
        paymentStatus: status,
        paidAt: status === "paid" ? new Date().toISOString() : null,
      } : item));
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
      setAppointments(current => current.map(item => item.id === appointment.id ? { ...item, ...body.payment } : item));
    } catch {
      setMessage("Não foi possível alterar o pagamento.");
    }
  }

  return (
    <main className={styles.shell}>
      <AppSidebar active="agenda" demo={demo} />

      <section className={styles.content}>
        <header className={styles.header}>
          <div><p>ROTINA DO CONSULTÓRIO</p><h1>Agenda</h1><span>Organize encontros, presenças e cobranças por sessão.</span></div>
          <button disabled={clients.length === 0} onClick={() => setCreateOpen(true)} type="button"><Plus size={17}/> Nova sessão</button>
        </header>

        <div className={styles.monthBar}>
          <button aria-label="Mês anterior" onClick={() => navigateMonth(-1)} type="button"><ChevronLeft size={18}/></button>
          <h2>{monthLabel}</h2>
          <button aria-label="Próximo mês" onClick={() => navigateMonth(1)} type="button"><ChevronRight size={18}/></button>
        </div>

        <section aria-label="Resumo do mês" className={styles.summary}>
          <article><CalendarDays size={18}/><span><small>Sessões</small><strong>{summary.total}</strong></span></article>
          <article><Check size={18}/><span><small>Realizadas</small><strong>{summary.completed}</strong></span></article>
          <article><UserRoundX size={18}/><span><small>Faltas</small><strong>{summary.absences}</strong></span></article>
          <article><CircleDollarSign size={18}/><span><small>A receber</small><strong>{summary.pending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></span></article>
        </section>

        {message ? <p className={styles.message} role="alert">{message}</p> : null}
        {clients.length === 0 ? <p className={styles.notice}>Cadastre um cliente ativo antes de criar a primeira sessão.</p> : null}

        {appointments.length === 0 ? (
          <div className={styles.empty}><span><CalendarDays size={26}/></span><h2>Nenhuma sessão neste mês</h2><p>Crie um encontro para começar a acompanhar presença e pagamento.</p>{clients.length > 0 ? <button onClick={() => setCreateOpen(true)} type="button"><Plus size={16}/> Criar primeira sessão</button> : null}</div>
        ) : (
          <section className={styles.list} aria-label="Sessões do mês">
            {appointments.map(appointment => {
              const startsAt = new Date(appointment.startsAt);
              return <article className={styles.session} key={appointment.id}>
                <time><strong>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: TIME_ZONE }).format(startsAt)}</strong><small>{new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: TIME_ZONE }).format(startsAt).replace(".", "")}</small></time>
                <div className={styles.sessionMain}>
                  <div><h3>{appointment.clientName}</h3><span><Clock3 size={13}/>{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }).format(startsAt)} · {appointment.durationMinutes} min</span></div>
                  <span className={styles.mode}>{appointment.mode === "online" ? <Laptop size={14}/> : <MapPin size={14}/>} {appointment.mode === "online" ? "Online" : "Presencial"}</span>
                </div>
                <div className={styles.state}>
                  <button onClick={() => openStatus(appointment)} type="button"><Settings2 size={14}/>{statusLabels[appointment.status]}</button>
                  {appointment.status === "no_show" ? <small>{appointment.absenceJustified ? "Justificada" : "Não justificada"}</small> : null}
                </div>
                <div className={styles.payment}>
                  <span><small>{paymentLabels[appointment.paymentStatus]}</small><strong>{formatCurrency(appointment.amount)}</strong></span>
                  <button className={appointment.paymentStatus === "paid" ? styles.paid : undefined} onClick={() => void togglePayment(appointment)} type="button">{appointment.paymentStatus === "paid" ? "Desfazer" : appointment.paymentStatus === "waived" ? "Cobrar" : "Marcar pago"}</button>
                </div>
              </article>;
            })}
          </section>
        )}
      </section>

      {createOpen ? <div className={styles.overlay}>
        <button aria-label="Fechar nova sessão" className={styles.backdrop} onClick={() => setCreateOpen(false)} type="button"/>
        <section aria-labelledby="new-session-title" aria-modal="true" className={styles.drawer} role="dialog">
          <div className={styles.drawerHead}><div><p>NOVO ENCONTRO</p><h2 id="new-session-title">Criar sessão</h2></div><button aria-label="Fechar" onClick={() => setCreateOpen(false)} type="button"><X size={19}/></button></div>
          <p className={styles.helper}>O valor atual do cliente será registrado nesta sessão e não mudará depois.</p>
          <form onSubmit={createAppointment}>
            <label>Cliente<select ref={firstFieldRef} name="clientId" required defaultValue=""><option disabled value="">Selecione um cliente</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name} · {formatCurrency(client.sessionPrice)}</option>)}</select></label>
            <div className={styles.formGrid}><label>Data<input defaultValue={month + "-01"} min={month + "-01"} name="date" required type="date"/></label><label>Horário<input defaultValue="09:00" name="time" required type="time"/></label></div>
            <div className={styles.formGrid}><label>Modalidade<select defaultValue="online" name="mode"><option value="online">Online</option><option value="in_person">Presencial</option></select></label><label>Duração<select defaultValue="50" name="duration"><option value="30">30 minutos</option><option value="50">50 minutos</option><option value="60">60 minutos</option><option value="90">90 minutos</option></select></label></div>
            <div className={styles.formActions}><button onClick={() => setCreateOpen(false)} type="button">Cancelar</button><button disabled={saving} type="submit">{saving ? "Criando…" : "Criar sessão"}</button></div>
          </form>
        </section>
      </div> : null}

      {statusTarget ? <div className={styles.overlay}>
        <button aria-label="Fechar alteração de estado" className={styles.backdrop} onClick={() => setStatusTarget(null)} type="button"/>
        <section aria-labelledby="status-title" aria-modal="true" className={styles.statusDialog} role="dialog">
          <div className={styles.drawerHead}><div><p>ACOMPANHAMENTO</p><h2 id="status-title">Estado da sessão</h2></div><button aria-label="Fechar" onClick={() => setStatusTarget(null)} type="button"><X size={19}/></button></div>
          <p className={styles.statusClient}>{statusTarget.clientName}</p>
          <form onSubmit={updateStatus}>
            <label>Estado<select onChange={event => setNextStatus(event.target.value as AppointmentStatus)} value={nextStatus}><option value="scheduled">Agendada</option><option value="completed">Realizada</option><option value="cancelled">Cancelada</option><option value="no_show">Falta do cliente</option></select></label>
            {nextStatus === "no_show" ? <label className={styles.check}><input checked={absenceJustified} onChange={event => setAbsenceJustified(event.target.checked)} type="checkbox"/><span>Falta justificada</span></label> : null}
            {nextStatus === "no_show" || nextStatus === "cancelled" ? <label className={styles.check}><input checked={charge} onChange={event => setCharge(event.target.checked)} type="checkbox"/><span>Esta sessão deve ser cobrada</span></label> : null}
            <div className={styles.formActions}><button onClick={() => setStatusTarget(null)} type="button">Cancelar</button><button disabled={saving} type="submit">{saving ? "Salvando…" : "Salvar estado"}</button></div>
          </form>
        </section>
      </div> : null}
    </main>
  );
}
