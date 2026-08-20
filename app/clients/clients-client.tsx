"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Archive, CalendarDays, House, Plus, Search, UserRound, UsersRound, WalletCards, X } from "lucide-react";
import styles from "./clients.module.css";
import confirmStyles from "./confirm.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
export type Client = { id: string; name: string; email: string | null; phone: string | null; sessionPrice: string; sessionsPerMonth: number; active: boolean };
const demoClients: Client[] = [
  { id: "demo-1", name: "Ana Martins", email: "ana@exemplo.com", phone: "(11) 99999-1201", sessionPrice: "180.00", sessionsPerMonth: 4, active: true },
  { id: "demo-2", name: "Luísa Barros", email: "luisa@exemplo.com", phone: "(11) 98888-2440", sessionPrice: "200.00", sessionsPerMonth: 4, active: true },
  { id: "demo-3", name: "Rafael Costa", email: null, phone: "(11) 97777-3180", sessionPrice: "160.00", sessionsPerMonth: 2, active: true },
];

type ClientsClientProps = { demo: boolean; initialClients: Client[]; initialError?: string | null };

export default function ClientsClient({ demo, initialClients, initialError = null }: ClientsClientProps) {
  const [clients, setClients] = useState<Client[]>(demo ? demoClients : initialClients);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(initialError);
  const [pendingArchive, setPendingArchive] = useState<Client | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open && !pendingArchive) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setPendingArchive(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    const frame = open ? requestAnimationFrame(() => nameInputRef.current?.focus()) : 0;
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [open, pendingArchive]);

  const filtered = useMemo(() => clients.filter(client => client.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))), [clients, query]);

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(null);
    const data = new FormData(event.currentTarget);
    const payload = { name: String(data.get("name")), email: String(data.get("email")), phone: String(data.get("phone")), sessionPrice: Number(data.get("price")), sessionsPerMonth: Number(data.get("frequency")) };
    if (demo) { setClients(current => [...current, { id: `demo-${Date.now()}`, ...payload, sessionPrice: payload.sessionPrice.toFixed(2), active: true }]); setOpen(false); setSaving(false); return; }
    try {
      const response = await fetch(`${API_URL}/clients`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error();
      const body = await response.json() as { client: Client };
      setClients(current => [...current, body.client].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))); setOpen(false);
    } catch { setMessage("Não foi possível cadastrar o cliente. Revise os dados."); }
    finally { setSaving(false); }
  }

  async function archiveClient(client: Client) {
    if (!demo) {
      const response = await fetch(`${API_URL}/clients/${client.id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) { setMessage("Não foi possível arquivar o cliente."); return; }
    }
    setClients(current => current.filter(item => item.id !== client.id)); setPendingArchive(null);
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href={demo ? "/dashboard?demo=1" : "/dashboard"}><span>S</span> Sophia</Link>
        <nav aria-label="Navegação principal">
          <Link href={demo ? "/dashboard?demo=1" : "/dashboard"}><House size={18}/><span>Visão geral</span></Link>
          <a href="#agenda"><CalendarDays size={18}/><span>Agenda</span></a>
          <Link className={styles.active} href={demo ? "/clients?demo=1" : "/clients"}><UsersRound size={18}/><span>Clientes</span></Link>
          <a href="#financeiro"><WalletCards size={18}/><span>Financeiro</span></a>
        </nav>
        <div className={styles.privacy}><UserRound size={17}/><span><b>Dados administrativos</b><small>Sem informações clínicas</small></span></div>
      </aside>

      <section className={styles.content}>
        <header className={styles.header}><div><p>GESTÃO DO CONSULTÓRIO</p><h1>Clientes</h1><span>Acompanhe frequência e valores combinados.</span></div><button onClick={() => setOpen(true)} type="button"><Plus size={17}/> Novo cliente</button></header>
        <div className={styles.toolbar}><label><Search size={16}/><input aria-label="Buscar clientes" onChange={event => setQuery(event.target.value)} placeholder="Buscar por nome" value={query}/></label><span>{clients.length} {clients.length === 1 ? "cliente ativo" : "clientes ativos"}</span></div>
        {message ? <p className={styles.message} role="alert">{message}</p> : null}
        {filtered.length === 0 ? (
          <div className={styles.empty}><span><UsersRound size={25}/></span><h2>{query ? "Nenhum cliente encontrado" : "Seu espaço começa aqui"}</h2><p>{query ? "Tente buscar usando outro nome." : "Cadastre o primeiro cliente para organizar sessões e pagamentos."}</p>{!query ? <button onClick={() => setOpen(true)} type="button"><Plus size={16}/> Cadastrar primeiro cliente</button> : null}</div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHead}><span>CLIENTE</span><span>CONTATO</span><span>FREQUÊNCIA</span><span>VALOR / SESSÃO</span><span>AÇÃO</span></div>
            {filtered.map(client => <article className={styles.row} key={client.id}>
              <div className={styles.person}><i>{client.name.split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase()}</i><span><b>{client.name}</b><small>Ativo</small></span></div>
              <div className={styles.contact}><span>{client.email || "E-mail não informado"}</span><small>{client.phone || "Telefone não informado"}</small></div>
              <span className={styles.frequency}>{client.sessionsPerMonth}× por mês</span><strong className={styles.price}>{Number(client.sessionPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
              <button className={confirmStyles.archiveButton} aria-label={`Arquivar ${client.name}`} onClick={() => setPendingArchive(client)} type="button"><Archive size={15}/><span>Arquivar</span></button>
            </article>)}
          </div>
        )}
      </section>

      {open ? <div className={styles.overlay}><button aria-label="Fechar cadastro" className={styles.backdrop} onClick={() => setOpen(false)} type="button" /><section aria-labelledby="new-client-title" aria-modal="true" className={styles.drawer} role="dialog">
        <div className={styles.drawerHead}><div><p>NOVO CADASTRO</p><h2 id="new-client-title">Adicionar cliente</h2></div><button aria-label="Fechar" onClick={() => setOpen(false)} type="button"><X size={19}/></button></div>
        <p className={styles.helper}>Somente informações administrativas. Dados clínicos terão um espaço separado futuramente.</p>
        <form onSubmit={createClient}><label>Nome completo<input ref={nameInputRef} name="name" required minLength={2} placeholder="Nome do cliente"/></label><div className={styles.formGrid}><label>E-mail <small>(opcional)</small><input name="email" type="email" placeholder="cliente@exemplo.com"/></label><label>Telefone <small>(opcional)</small><input name="phone" placeholder="(00) 00000-0000"/></label></div><div className={styles.formGrid}><label>Valor por sessão<input min="1" name="price" required step="0.01" type="number" placeholder="180,00"/></label><label>Sessões por mês<select defaultValue="4" name="frequency"><option value="1">1 sessão</option><option value="2">2 sessões</option><option value="4">4 sessões</option><option value="8">8 sessões</option></select></label></div><div className={styles.actions}><button onClick={() => setOpen(false)} type="button">Cancelar</button><button disabled={saving} type="submit">{saving ? "Salvando…" : "Salvar cliente"}</button></div></form>
      </section></div> : null}

      {pendingArchive ? <div className={confirmStyles.overlay}><button aria-label="Cancelar arquivamento" className={confirmStyles.backdrop} onClick={() => setPendingArchive(null)} type="button" /><section aria-labelledby="archive-title" aria-modal="true" className={confirmStyles.dialog} role="alertdialog">
        <span className={confirmStyles.icon}><Archive size={22}/></span><h2 id="archive-title">Arquivar cliente?</h2><p><strong>{pendingArchive.name}</strong> deixará de aparecer na lista de clientes ativos. Sessões e pagamentos anteriores serão preservados.</p>
        <div className={confirmStyles.actions}><button onClick={() => setPendingArchive(null)} type="button">Cancelar</button><button onClick={() => void archiveClient(pendingArchive)} type="button"><Archive size={15}/> Arquivar cliente</button></div>
      </section></div> : null}
    </main>
  );
}
