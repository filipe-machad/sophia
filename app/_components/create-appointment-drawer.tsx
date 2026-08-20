"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import styles from "./create-appointment-drawer.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
const TIME_ZONE = "America/Sao_Paulo";

export type AppointmentClient = {
  id: string;
  name: string;
  sessionPrice: string;
};

export type CreatedAppointment = {
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

type CreateAppointmentDrawerProps = {
  clients: AppointmentClient[];
  demo: boolean;
  month: string;
  onClose: () => void;
  onCreated: (appointment: CreatedAppointment) => void;
};

function formatCurrency(value: string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function defaultDateForMonth(selectedMonth: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  const day = parts.year + "-" + parts.month === selectedMonth ? parts.day : "01";
  return day + "/" + selectedMonth.slice(5, 7) + "/" + selectedMonth.slice(0, 4);
}

function maskBrazilianDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
}

function parseBrazilianDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, dayPart, monthPart, yearPart] = match;
  if (!dayPart || !monthPart || !yearPart) return null;
  const day = Number(dayPart);
  const month = Number(monthPart);
  const year = Number(yearPart);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return yearPart + "-" + monthPart + "-" + dayPart;
}

export function CreateAppointmentDrawer({ clients, demo, month, onClose, onCreated }: CreateAppointmentDrawerProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const frame = requestAnimationFrame(() => firstFieldRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(frame);
    };
  }, [onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const clientId = String(data.get("clientId"));
    const date = parseBrazilianDate(String(data.get("date")));
    const time = String(data.get("time"));
    const durationMinutes = Number(data.get("duration"));
    const mode = String(data.get("mode")) as CreatedAppointment["mode"];
    const client = clients.find(item => item.id === clientId);

    if (!client) {
      setMessage("Selecione um cliente ativo.");
      setSaving(false);
      return;
    }
    if (!date) {
      setMessage("Informe uma data válida no formato DD/MM/YYYY.");
      setSaving(false);
      return;
    }

    const startsAt = new Date(date + "T" + time + ":00-03:00").toISOString();

    if (demo) {
      onCreated({
        id: "demo-session-" + clientId + "-" + startsAt,
        clientId,
        clientName: client.name,
        startsAt,
        durationMinutes,
        mode,
        status: "scheduled",
        absenceJustified: null,
        paymentStatus: "pending",
        amount: client.sessionPrice,
        paidAt: null,
      });
      onClose();
      return;
    }

    try {
      const response = await fetch(API_URL + "/appointments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, startsAt, durationMinutes, mode }),
      });
      if (!response.ok) throw new Error();
      const body = await response.json() as { appointment: CreatedAppointment };
      onCreated(body.appointment);
      onClose();
    } catch {
      setMessage("Não foi possível criar a sessão.");
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <button aria-label="Fechar nova sessão" className={styles.backdrop} onClick={onClose} type="button"/>
      <section aria-labelledby="dashboard-new-session-title" aria-modal="true" className={styles.drawer} role="dialog">
        <div className={styles.head}><div><p>NOVO ENCONTRO</p><h2 id="dashboard-new-session-title">Criar sessão</h2></div><button aria-label="Fechar" onClick={onClose} type="button"><X size={19}/></button></div>
        <p className={styles.helper}>O valor atual do cliente será registrado nesta sessão e não mudará depois.</p>
        {message ? <p className={styles.message} role="alert">{message}</p> : null}
        <form onSubmit={submit}>
          <label>Cliente<select defaultValue="" name="clientId" ref={firstFieldRef} required><option disabled value="">Selecione um cliente</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name} · {formatCurrency(client.sessionPrice)}</option>)}</select></label>
          <div className={styles.grid}><label>Data<input autoComplete="off" defaultValue={defaultDateForMonth(month)} inputMode="numeric" maxLength={10} name="date" onInput={event => { event.currentTarget.value = maskBrazilianDate(event.currentTarget.value); }} pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" placeholder="DD/MM/YYYY" required type="text"/></label><label>Horário<input defaultValue="09:00" name="time" required type="time"/></label></div>
          <div className={styles.grid}><label>Modalidade<select defaultValue="online" name="mode"><option value="online">Online</option><option value="in_person">Presencial</option></select></label><label>Duração<select defaultValue="50" name="duration"><option value="30">30 minutos</option><option value="50">50 minutos</option><option value="60">60 minutos</option><option value="90">90 minutos</option></select></label></div>
          <div className={styles.actions}><button onClick={onClose} type="button">Cancelar</button><button disabled={saving} type="submit">{saving ? "Criando…" : "Criar sessão"}</button></div>
        </form>
      </section>
    </div>
  );
}
