import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, House, UsersRound, WalletCards } from "lucide-react";
import styles from "./app-sidebar.module.css";

type AppSidebarProps = {
  active: "overview" | "agenda" | "clients" | "finance";
  demo: boolean;
  footer?: ReactNode;
};

const iconProps = { size: 18, strokeWidth: 1.8 };

export function AppSidebar({ active, demo, footer }: AppSidebarProps) {
  const dashboardHref = demo ? "/dashboard?demo=1" : "/dashboard";
  const clientsHref = demo ? "/clients?demo=1" : "/clients";
  const agendaHref = demo ? "/agenda?demo=1" : "/agenda";
  const financeHref = demo ? "/finance?demo=1" : "/finance";

  return (
    <aside className={styles.sidebar}>
      <Link className={styles.brand} href={dashboardHref}>
        <span>S</span> Sophia
      </Link>
      <nav aria-label="Navegação principal">
        <Link className={active === "overview" ? styles.active : undefined} href={dashboardHref}>
          <House {...iconProps} /><span>Visão geral</span>
        </Link>
        <Link className={active === "agenda" ? styles.active : undefined} href={agendaHref}>
          <CalendarDays {...iconProps} /><span>Agenda</span>
        </Link>
        <Link className={active === "clients" ? styles.active : undefined} href={clientsHref}>
          <UsersRound {...iconProps} /><span>Clientes</span>
        </Link>
        <Link className={active === "finance" ? styles.active : undefined} href={financeHref}>
          <WalletCards {...iconProps} /><span>Financeiro</span>
        </Link>
      </nav>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </aside>
  );
}
