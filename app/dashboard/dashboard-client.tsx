"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, CalendarRange, Check, ChevronLeft, ChevronRight, CircleCheckBig, HandCoins, LogOut, MoreHorizontal, Plus, TrendingUp, UserRoundX } from "lucide-react";
import { AppSidebar } from "../_components/app-sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
const sessions = [
  { time: "09:00", initials: "AM", name: "Ana Martins", detail: "Online · 50 min", status: "Confirmada" },
  { time: "11:30", initials: "RC", name: "Rafael Costa", detail: "Presencial · 50 min", status: "A confirmar" },
  { time: "15:00", initials: "LB", name: "Luísa Barros", detail: "Online · 50 min", status: "Confirmada" },
];
export type User = { professionalName: string; email: string };

type DashboardClientProps = { demo: boolean; user: User };

export default function DashboardClient({ demo, user }: DashboardClientProps) {
  const router = useRouter();

  async function logout() {
    await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
    router.replace("/");
  }

  const label = demo ? "Ambiente de demonstração" : user.professionalName;
  const initials = user.professionalName.split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase();

  return (
    <main className="shell">
      <AppSidebar
        active="overview"
        demo={demo}
        footer={<div className="profile"><i>{initials}</i><span><b>{label}</b><small>{demo ? "Dados fictícios" : user.email}</small></span>{!demo ? <button aria-label="Sair" onClick={logout} style={{marginLeft:"auto",border:0,background:"none",color:"#7d8983",cursor:"pointer"}} type="button"><LogOut size={16}/></button> : null}</div>}
      />

      <section className="content" id="inicio">
        <header><div><p className="eyebrow">QUARTA-FEIRA, 19 DE AGOSTO</p><h1>{`Bom dia, ${user.professionalName.split(" ")[0]}.`}</h1><p>Aqui está o ritmo do consultório hoje.</p></div><button className="primary" style={{display:"flex",alignItems:"center",gap:7}} type="button"><Plus size={17} /> Nova sessão</button></header>
        <section className="metrics" aria-label="Resumo do mês">
          <article className="metric feature"><span className="metricLabel" style={{display:"flex",alignItems:"center",gap:8}}><CalendarRange size={15} strokeWidth={1.8}/> SESSÕES EM AGOSTO</span><div><strong>28</strong><em style={{display:"flex",alignItems:"center",gap:3}}><TrendingUp size={11}/> 12%</em></div><p>de 36 sessões previstas</p><span className="progress"><i /></span><small>8 sessões restantes</small></article>
          <article className="metric"><span className="metricLabel" style={{display:"flex",alignItems:"center",gap:8}}><CircleCheckBig size={15} strokeWidth={1.8}/> REALIZADAS</span><strong>24</strong><p>85,7% de presença</p><div className="bars"><i/><i/><i/><i/><i/><i/></div></article>
          <article className="metric"><span className="metricLabel" style={{display:"flex",alignItems:"center",gap:8}}><UserRoundX size={15} strokeWidth={1.8}/> FALTAS</span><strong>4</strong><p>2 justificadas</p><div className="legend"><span>● Justificadas <b>2</b></span><span>● Não justificadas <b>2</b></span></div></article>
          <article className="metric"><span className="metricLabel" style={{display:"flex",alignItems:"center",gap:8}}><HandCoins size={15} strokeWidth={1.8}/> A RECEBER</span><strong className="money">R$ 960</strong><p>4 sessões pendentes</p><small className="note">Pagamentos aguardando registro</small></article>
        </section>
        <section className="lower">
          <article className="panel" id="agenda"><div className="panel-title"><div><p className="eyebrow">AGENDA DE HOJE</p><h2>Próximos encontros</h2></div><a style={{display:"flex",alignItems:"center",gap:5}} href="#agenda">Ver agenda completa <ArrowRight size={13}/></a></div>
            {sessions.map(session => <div className="session" key={session.time}><time>{session.time}</time><i className="avatar">{session.initials}</i><span><b>{session.name}</b><small>{session.detail}</small></span><em style={{display:"flex",alignItems:"center",gap:4}} className={session.status === "Confirmada" ? "ok" : "wait"}>{session.status === "Confirmada" ? <Check size={11}/> : null}{session.status}</em><button aria-label={`Opções para ${session.name}`} type="button"><MoreHorizontal size={17}/></button></div>)}
          </article>
          <aside className="panel calendar"><div className="panel-title"><div><p className="eyebrow">VISÃO DO MÊS</p><h2>Agosto</h2></div><span style={{display:"flex",gap:4}}><ChevronLeft size={16}/><ChevronRight size={16}/></span></div><div className="week"><b>S</b><b>T</b><b>Q</b><b>Q</b><b>S</b><b>S</b><b>D</b></div><div className="days">{Array.from({ length: 31 }, (_, index) => index + 1).map(day => <span className={day === 19 ? "today" : [4,6,11,13,18,20,25,27].includes(day) ? "marked" : ""} key={day}>{day}</span>)}</div><footer><span>● 12 sessões agendadas</span><button aria-label="Nova sessão" type="button"><Plus size={15}/></button></footer></aside>
        </section>
      </section>
    </main>
  );
}
