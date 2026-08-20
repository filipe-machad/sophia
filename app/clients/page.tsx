import { redirect } from "next/navigation";
import { serverApi } from "../_lib/server-api";
import ClientsClient, { type Client } from "./clients-client";

type ClientsPageProps = { searchParams: Promise<{ demo?: string }> };

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const { demo: demoParam } = await searchParams;
  if (demoParam === "1") return <ClientsClient demo initialClients={[]} />;

  const response = await serverApi("/clients");
  if (response.status === 401) redirect("/");
  if (!response.ok) return <ClientsClient demo={false} initialClients={[]} initialError="Não foi possível carregar os clientes." />;

  const { clients } = await response.json() as { clients: Client[] };
  return <ClientsClient demo={false} initialClients={clients} />;
}
