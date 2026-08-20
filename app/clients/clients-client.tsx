"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Archive, Pencil, Plus, RotateCcw, Search, UserRound, UsersRound, X } from "lucide-react";
import { AppSidebar } from "../_components/app-sidebar";
import styles from "./clients.module.css";
import confirmStyles from "./confirm.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  sessionPrice: string;
  sessionsPerMonth: number;
  active: boolean;
};

const demoClients: Client[] = [
  { id: "demo-1", name: "Ana Martins", email: "ana@exemplo.com", phone: "(11) 99999-1201", sessionPrice: "180.00", sessionsPerMonth: 4, active: true },
  { id: "demo-2", name: "Luísa Barros", email: "luisa@exemplo.com", phone: "(11) 98888-2440", sessionPrice: "200.00", sessionsPerMonth: 4, active: true },
  { id: "demo-3", name: "Rafael Costa", email: null, phone: "(11) 97777-3180", sessionPrice: "160.00", sessionsPerMonth: 2, active: true },
];

const demoArchivedClients: Client[] = [
  { id: "demo-4", name: "Marina Nogueira", email: "marina@exemplo.com", phone: null, sessionPrice: "190.00", sessionsPerMonth: 4, active: false },
];

type ClientView = "active" | "archived";
type ClientsClientProps = { demo: boolean; initialClients: Client[]; initialError?: string | null };

function sortClients(items: Client[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export default function ClientsClient({ demo, initialClients, initialError = null }: ClientsClientProps) {
  const [clients, setClients] = useState<Client[]>(demo ? demoClients : initialClients);
  const [view, setView] = useState<ClientView>("active");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
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

  const filtered = useMemo(
    () => clients.filter(client => client.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))),
    [clients, query],
  );

  function openCreate() {
    setEditingClient(null);
    setOpen(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setOpen(true);
  }

  function closeDrawer() {
    setOpen(false);
    setEditingClient(null);
  }

  async function changeView(nextView: ClientView) {
    if (nextView === view) return;
    setView(nextView);
    setQuery("");
    setMessage(null);

    if (demo) {
      setClients(nextView === "active" ? demoClients : demoArchivedClients);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_URL + "/clients?status=" + nextView, { credentials: "include" });
      if (response.status === 401) {
        window.location.assign("/");
        return;
      }
      if (!response.ok) throw new Error();
      const body = await response.json() as { clients: Client[] };
      setClients(body.clients);
    } catch {
      setClients([]);
      setMessage("Não foi possível carregar esta lista.");
    } finally {
      setLoading(false);
    }
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name")),
      email: String(data.get("email")),
      phone: String(data.get("phone")),
      sessionPrice: Number(data.get("price")),
      sessionsPerMonth: Number(data.get("frequency")),
    };

    if (demo) {
      if (editingClient) {
        setClients(current => sortClients(current.map(client => client.id === editingClient.id
          ? { ...client, ...payload, sessionPrice: payload.sessionPrice.toFixed(2) }
          : client)));
      } else {
        setClients(current => sortClients([...current, {
          id: "demo-" + Date.now(),
          ...payload,
          sessionPrice: payload.sessionPrice.toFixed(2),
          active: true,
        }]));
      }
      closeDrawer();
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(editingClient ? API_URL + "/clients/" + editingClient.id : API_URL + "/clients", {
        method: editingClient ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error();
      const body = await response.json() as { client: Client };
      setClients(current => sortClients(editingClient
        ? current.map(client => client.id === body.client.id ? body.client : client)
        : [...current, body.client]));
      closeDrawer();
    } catch {
      setMessage(editingClient
        ? "Não foi possível salvar as alterações."
        : "Não foi possível cadastrar o cliente. Revise os dados.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveClient(client: Client) {
    if (!demo) {
      const response = await fetch(API_URL + "/clients/" + client.id, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage("Não foi possível arquivar o cliente.");
        return;
      }
    }
    setClients(current => current.filter(item => item.id !== client.id));
    setPendingArchive(null);
  }

  async function restoreClient(client: Client) {
    setMessage(null);
    if (!demo) {
      const response = await fetch(API_URL + "/clients/" + client.id + "/restore", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage("Não foi possível restaurar o cliente.");
        return;
      }
    }
    setClients(current => current.filter(item => item.id !== client.id));
  }

  const countLabel = clients.length + " " + (view === "active"
    ? clients.length === 1 ? "cliente ativo" : "clientes ativos"
    : clients.length === 1 ? "cliente arquivado" : "clientes arquivados");

  return (
    <main className={styles.shell}>
      <AppSidebar
        active="clients"
        demo={demo}
        footer={<div className={styles.privacy}><UserRound size={17}/><span><b>Dados administrativos</b><small>Sem informações clínicas</small></span></div>}
      />

      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <p>GESTÃO DO CONSULTÓRIO</p>
            <h1>Clientes</h1>
            <span>Acompanhe frequência e valores combinados.</span>
          </div>
          {view === "active" ? <button onClick={openCreate} type="button"><Plus size={17}/> Novo cliente</button> : null}
        </header>

        <div className={styles.viewBar}>
          <div aria-label="Filtrar clientes por situação" className={styles.tabs} role="group">
            <button aria-pressed={view === "active"} onClick={() => void changeView("active")} type="button">Ativos</button>
            <button aria-pressed={view === "archived"} onClick={() => void changeView("archived")} type="button">Arquivados</button>
          </div>
          <span>{countLabel}</span>
        </div>

        <div className={styles.toolbar}>
          <label><Search size={16}/><input aria-label="Buscar clientes" onChange={event => setQuery(event.target.value)} placeholder="Buscar por nome" value={query}/></label>
        </div>

        {message ? <p className={styles.message} role="alert">{message}</p> : null}

        {loading ? (
          <div className={styles.empty}><span className={styles.loader}/><h2>Carregando clientes…</h2></div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <span><UsersRound size={25}/></span>
            <h2>{query ? "Nenhum cliente encontrado" : view === "active" ? "Seu espaço começa aqui" : "Nenhum cliente arquivado"}</h2>
            <p>{query
              ? "Tente buscar usando outro nome."
              : view === "active"
                ? "Cadastre o primeiro cliente para organizar sessões e pagamentos."
                : "Quando você arquivar alguém, o cadastro aparecerá aqui e poderá ser restaurado."}</p>
            {!query && view === "active" ? <button onClick={openCreate} type="button"><Plus size={16}/> Cadastrar primeiro cliente</button> : null}
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHead}><span>CLIENTE</span><span>CONTATO</span><span>FREQUÊNCIA</span><span>VALOR / SESSÃO</span><span>AÇÕES</span></div>
            {filtered.map(client => <article className={styles.row} key={client.id}>
              <div className={styles.person}>
                <i>{client.name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</i>
                <span><b>{client.name}</b><small>{view === "active" ? "Ativo" : "Arquivado"}</small></span>
              </div>
              <div className={styles.contact}><span>{client.email || "E-mail não informado"}</span><small>{client.phone || "Telefone não informado"}</small></div>
              <span className={styles.frequency}>{client.sessionsPerMonth}× por mês</span>
              <strong className={styles.price}>{Number(client.sessionPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
              <div className={styles.rowActions}>
                {view === "active" ? <>
                  <button className={styles.actionButton} onClick={() => openEdit(client)} type="button"><Pencil size={14}/><span>Editar</span></button>
                  <button className={confirmStyles.archiveButton} onClick={() => setPendingArchive(client)} type="button"><Archive size={14}/><span>Arquivar</span></button>
                </> : <button className={styles.restoreButton} onClick={() => void restoreClient(client)} type="button"><RotateCcw size={14}/><span>Restaurar</span></button>}
              </div>
            </article>)}
          </div>
        )}
      </section>

      {open ? <div className={styles.overlay}>
        <button aria-label="Fechar cadastro" className={styles.backdrop} onClick={closeDrawer} type="button" />
        <section aria-labelledby="client-form-title" aria-modal="true" className={styles.drawer} role="dialog">
          <div className={styles.drawerHead}>
            <div><p>{editingClient ? "EDITAR CADASTRO" : "NOVO CADASTRO"}</p><h2 id="client-form-title">{editingClient ? "Editar cliente" : "Adicionar cliente"}</h2></div>
            <button aria-label="Fechar" onClick={closeDrawer} type="button"><X size={19}/></button>
          </div>
          <p className={styles.helper}>Somente informações administrativas. Dados clínicos terão um espaço separado futuramente.</p>
          <form key={editingClient?.id ?? "new"} onSubmit={saveClient}>
            <label>Nome completo<input defaultValue={editingClient?.name ?? ""} ref={nameInputRef} name="name" required minLength={2} placeholder="Nome do cliente"/></label>
            <div className={styles.formGrid}>
              <label>E-mail <small>(opcional)</small><input defaultValue={editingClient?.email ?? ""} name="email" type="email" placeholder="cliente@exemplo.com"/></label>
              <label>Telefone <small>(opcional)</small><input defaultValue={editingClient?.phone ?? ""} name="phone" placeholder="(00) 00000-0000"/></label>
            </div>
            <div className={styles.formGrid}>
              <label>Valor por sessão<input defaultValue={editingClient?.sessionPrice ?? ""} min="1" name="price" required step="0.01" type="number" placeholder="180,00"/></label>
              <label>Sessões por mês<select defaultValue={String(editingClient?.sessionsPerMonth ?? 4)} name="frequency"><option value="1">1 sessão</option><option value="2">2 sessões</option><option value="4">4 sessões</option><option value="8">8 sessões</option></select></label>
            </div>
            <div className={styles.actions}><button onClick={closeDrawer} type="button">Cancelar</button><button disabled={saving} type="submit">{saving ? "Salvando…" : editingClient ? "Salvar alterações" : "Salvar cliente"}</button></div>
          </form>
        </section>
      </div> : null}

      {pendingArchive ? <div className={confirmStyles.overlay}>
        <button aria-label="Cancelar arquivamento" className={confirmStyles.backdrop} onClick={() => setPendingArchive(null)} type="button" />
        <section aria-labelledby="archive-title" aria-modal="true" className={confirmStyles.dialog} role="alertdialog">
          <span className={confirmStyles.icon}><Archive size={22}/></span>
          <h2 id="archive-title">Arquivar cliente?</h2>
          <p><strong>{pendingArchive.name}</strong> deixará de aparecer na lista de clientes ativos. Sessões e pagamentos anteriores serão preservados.</p>
          <div className={confirmStyles.actions}><button onClick={() => setPendingArchive(null)} type="button">Cancelar</button><button onClick={() => void archiveClient(pendingArchive)} type="button"><Archive size={15}/> Arquivar cliente</button></div>
        </section>
      </div> : null}
    </main>
  );
}
