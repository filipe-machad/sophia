"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarRange, Check, ChevronLeft, ChevronRight, CircleCheckBig, HandCoins, LogOut, MoreHorizontal, Plus, UserRoundX } from "lucide-react";
import { AppSidebar } from "../_components/app-sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
const TIME_ZONE = "America/Sao_Paulo";

export type User = { professionalName: string; email: string };
export type DashboardAppointment = {
  id: string;
  clientId: string;
  clientName: string;
  startsAt: string;
  durationMinutes: number;
  mode: "online" | "in_person";
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  absenceJustified: boolean | null;
  paymentStatus: "pending" | "paid" | "waived";
  amount: string;
  paidAt: string | null;
};

type DashboardClientProps = {
  appointments: DashboardAppointment[];
  demo: boolean;
  expectedSessions: number;
  month: string;
  nowIso: string;
  user: User;
};

function demoAppointments(month: string): DashboardAppointment[] {
  return [
    { id: "demo-dashboard-1", clientId: "demo-1", clientName: "Ana Martins", startsAt: month + "-05T09:00:00-03:00", durationMinutes: 50, mode: "online", status: "completed", absenceJustified: null, paymentStatus: "paid", amount: "180.00", paidAt: month + "-05T14:00:00.000Z" },
    { id: "demo-dashboard-2", clientId: "demo-3", clientName: "Rafael Costa", startsAt: month + "-11T11:30:00-03:00", durationMinutes: 50, mode: "in_person", status: "no_show", absenceJustified: true, paymentStatus: "waived", amount: "160.00", paidAt: null },
    { id: "demo-dashboard-3", clientId: "demo-2", clientName: "Luísa Barros", startsAt: month + "-19T15:00:00-03:00", durationMinutes: 50, mode: "online", status: "scheduled", absenceJustified: null, paymentStatus: "pending", amount: "200.00", paidAt: null },
  ];
}

function shiftMonth(month: string, offset: number) {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + offset, 1));
  return String(date.getUTCFullYear()).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
}

export default function DashboardClient({ appointments, demo, expectedSessions, month, nowIso, user }: DashboardClientProps) {
  const router = useRouter();
  const records = demo ? demoAppointments(month) : appointments;
  const agendaHref = "/agenda?month=" + month + (demo ? "&demo=1" : "");
  const previousMonthHref = "/agenda?month=" + shiftMonth(month, -1) + (demo ? "&demo=1" : "");
  const nextMonthHref = "/agenda?month=" + shiftMonth(month, 1) + (demo ? "&demo=1" : "");

  async function logout() {
    await fetch(API_URL + "/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/");
  }

  const label = demo ? "Ambiente de demonstração" : user.professionalName;
  const initials = user.professionalName.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const now = new Date(nowIso);
  const hour = Number(new Intl.DateTimeFormat("en", { hour: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE }).format(now));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: TIME_ZONE }).format(now).toUpperCase();
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: TIME_ZONE }).format(new Date(month + "-15T12:00:00-03:00"));
  const monthLabelUpper = monthLabel.toUpperCase();

  const completed = records.filter(item => item.status === "completed").length;
  const absences = records.filter(item => item.status === "no_show");
  const justified = absences.filter(item => item.absenceJustified).length;
  const pending = records.filter(item => item.paymentStatus === "pending");
  const pendingValue = pending.reduce((total, item) => total + Number(item.amount), 0);
  const remaining = Math.max(expectedSessions - records.length, 0);
  const progress = expectedSessions > 0 ? Math.min((records.length / expectedSessions) * 100, 100) : 0;
  const attendanceBase = completed + absences.length;
  const attendance = attendanceBase > 0 ? (completed / attendanceBase) * 100 : 0;
  const upcoming = records.filter(item => item.status === "scheduled").slice(0, 3);
  const markedDays = new Set(records.map(item => Number(new Intl.DateTimeFormat("en", { day: "2-digit", timeZone: TIME_ZONE }).format(new Date(item.startsAt)))));
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const nowParts = new Intl.DateTimeFormat("en", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TIME_ZONE }).formatToParts(now);
  const currentMonth = (nowParts.find(part => part.type === "year")?.value ?? "") + "-" + (nowParts.find(part => part.type === "month")?.value ?? "");
  const today = currentMonth === month ? Number(nowParts.find(part => part.type === "day")?.value) : -1;

  return (
    <main className="shell">
      <AppSidebar
        active="overview"
        demo={demo}
        footer={<div className="profile"><i>{initials}</i><span><b>{label}</b><small>{demo ? "Dados fictícios" : user.email}</small></span>{!demo ? <button aria-label="Sair" onClick={logout} style={{marginLeft:"auto",border:0,background:"none",color:"#7d8983",cursor:"pointer"}} type="button"><LogOut size={16}/></button> : null}</div>}
      />

      <section className="content" id="inicio">
        <header>
          <div><p className="eyebrow">{dateLabel}</p><h1>{greeting + ", " + user.professionalName.split(" ")[0] + "."}</h1><p>Aqui está o ritmo do consultório hoje.</p></div>
          <Link className="primary" href={agendaHref} style={{display:"flex",alignItems:"center",gap:7,textDecoration:"none"}}><Plus size={17}/> Nova sessão</Link>
        </header>

        <section className="metrics" aria-label="Resumo do mês">
          <article className="metric feature">
            <span className="metricLabel" style={{display:"flex",alignItems:"center",gap:8}}><CalendarRange size={15} strokeWidth={1.8}/> {"SESSÕES EM " + monthLabelUpper}</span>
            <div><strong>{records.length}</strong><em>{Math.round(progress)}%</em></div>
            <p>{"de " + expectedSessions + " sessões previstas"}</p>
            <span className="progress"><i style={{width:progress + "%"}}/></span>
            <small>{remaining + (remaining === 1 ? " sessão restante" : " sessões restantes")}</small>
          </article>

          <article className="metric">
            <span className="metricLabel" style={{display:"flex",alignItems:"center",gap:8}}><CircleCheckBig size={15} strokeWidth={1.8}/> REALIZADAS</span>
            <strong>{completed}</strong>
            <p>{attendance.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "% de presença"}</p>
            <div className="bars"><i/><i/><i/><i/><i/><i/></div>
          </article>

          <article className="metric">
            <span className="metricLabel" style={{display:"flex",alignItems:"center",gap:8}}><UserRoundX size={15} strokeWidth={1.8}/> FALTAS</span>
            <strong>{absences.length}</strong>
            <p>{justified + (justified === 1 ? " justificada" : " justificadas")}</p>
            <div className="legend"><span>● Justificadas <b>{justified}</b></span><span>● Não justificadas <b>{absences.length - justified}</b></span></div>
          </article>

          <article className="metric" id="financeiro">
            <span className="metricLabel" style={{display:"flex",alignItems:"center",gap:8}}><HandCoins size={15} strokeWidth={1.8}/> A RECEBER</span>
            <strong className="money">{pendingValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
            <p>{pending.length + (pending.length === 1 ? " sessão pendente" : " sessões pendentes")}</p>
            <small className="note">Pagamentos aguardando registro</small>
          </article>
        </section>

        <section className="lower">
          <article className="panel" id="agenda">
            <div className="panel-title"><div><p className="eyebrow">PRÓXIMOS ENCONTROS</p><h2>Agenda do mês</h2></div><Link style={{display:"flex",alignItems:"center",gap:5}} href={agendaHref}>Ver agenda completa <ArrowRight size={13}/></Link></div>
            {upcoming.length === 0 ? <div className="dashboard-empty"><p>Nenhuma sessão agendada neste mês.</p><Link href={agendaHref}>Criar uma sessão</Link></div> : upcoming.map(item => {
              const date = new Date(item.startsAt);
              const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }).format(date);
              const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: TIME_ZONE }).format(date).replace(".", "");
              const itemInitials = item.clientName.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
              return <div className="session" key={item.id}>
                <time>{time}</time><i className="avatar">{itemInitials}</i>
                <span><b>{item.clientName}</b><small>{day + " · " + (item.mode === "online" ? "Online" : "Presencial") + " · " + item.durationMinutes + " min"}</small></span>
                <em className="ok" style={{display:"flex",alignItems:"center",gap:4}}><Check size={11}/>Agendada</em>
                <Link aria-label={"Abrir sessão de " + item.clientName} href={agendaHref}><MoreHorizontal size={17}/></Link>
              </div>;
            })}
          </article>

          <aside className="panel calendar">
            <div className="panel-title"><div><p className="eyebrow">VISÃO DO MÊS</p><h2 style={{textTransform:"capitalize"}}>{monthLabel}</h2></div><span style={{display:"flex",gap:4}}><Link aria-label="Mês anterior" href={previousMonthHref}><ChevronLeft size={16}/></Link><Link aria-label="Próximo mês" href={nextMonthHref}><ChevronRight size={16}/></Link></span></div>
            <div className="week"><b>S</b><b>T</b><b>Q</b><b>Q</b><b>S</b><b>S</b><b>D</b></div>
            <div className="days">{Array.from({ length: daysInMonth }, (_, index) => index + 1).map(day => <span className={day === today ? "today" : markedDays.has(day) ? "marked" : ""} key={day}>{day}</span>)}</div>
            <footer><span>{"● " + records.length + (records.length === 1 ? " sessão registrada" : " sessões registradas")}</span><Link aria-label="Nova sessão" href={agendaHref}><Plus size={15}/></Link></footer>
          </aside>
        </section>
      </section>
    </main>
  );
}
