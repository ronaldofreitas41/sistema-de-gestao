"use client";

import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { formatDate, getToken } from "@/lib/utils";
import type { ApiResponse, NavItem, Usuario } from "@/lib/types";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CarFront,
  CircleDollarSign,
  Database,
  FileText,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { navGroups } from "@/lib/common";

type RecordData = Record<string, unknown>;
type Booking = { id: string; client: string; vehicle: string; date: string; status: string };

async function fetcher(url: string): Promise<ApiResponse> {
  const token = getToken();
  const response = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Não foi possível carregar os dados.");
  return data;
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function currency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function shortDate(value: unknown) {
  if (!value) return "Sem data";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("pt-BR");
}

function paid(status: unknown) {
  return ["pago", "paga", "quitado", "quitada", "concluido", "concluída"].includes(String(status ?? "").toLowerCase());
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function MetricCard({ label, value, detail, icon: Icon, negative = false }: { label: string; value: string; detail: string; icon: React.ComponentType<{ className?: string }>; negative?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><div className="rounded-xl bg-accent p-2.5 text-accent-foreground"><Icon className="h-4 w-4" /></div></div>
      <p className="text-2xl font-bold tracking-tight text-card-foreground">{value}</p>
      <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${negative ? "text-red-600" : "text-primary"}`}>
        {negative ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
        {detail}
      </div>
    </div>
  );
}

function DashboardHome({ onNavigate }: { onNavigate: (label: string) => void }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const contas = useSWR<ApiResponse>("/api/contas-receber?page=1&limit=10000", fetcher, { revalidateOnFocus: false });
  const despesas = useSWR<ApiResponse>("/api/despesas?page=1&limit=10000", fetcher, { revalidateOnFocus: false });
  const equipamentos = useSWR<ApiResponse>("/api/equipamentos?page=1&limit=10000", fetcher, { revalidateOnFocus: false });
  const contratos = useSWR<ApiResponse>("/api/contratos?page=1&limit=10000", fetcher, { revalidateOnFocus: false });
  const clientes = useSWR<ApiResponse>("/api/clientes?page=1&limit=10000", fetcher, { revalidateOnFocus: false });
  const vendas = useSWR<ApiResponse>("/api/vendas?page=1&limit=10000", fetcher, { revalidateOnFocus: false });

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("mh3_usuario");
      if (saved) setUsuario(JSON.parse(saved));
    } catch (error) { console.error("Erro ao carregar usuário:", error); }
  }, []);

  const dataRows = (result: { data?: ApiResponse }) => (result.data?.data as RecordData[] | undefined) ?? [];
  const contaRows = dataRows(contas);
  const despesaRows = dataRows(despesas);
  const equipamentoRows = dataRows(equipamentos);
  const contratoRows = dataRows(contratos);
  const clienteRows = dataRows(clientes);
  const vendaRows = dataRows(vendas);
  const clienteById = new Map(clienteRows.map((row) => [String(row.id), row]));
  const equipamentoById = new Map(equipamentoRows.map((row) => [String(row.id), row]));
  const receber = contaRows.filter((row) => !paid(row.status)).reduce((sum, row) => sum + numberValue(row.valor_total), 0);
  const pagar = despesaRows.filter((row) => !paid(row.status_disp)).reduce((sum, row) => sum + numberValue(row.valor), 0);
  const disponiveis = equipamentoRows.filter((row) => ["ativo", "disponivel", "disponível", "livre"].includes(String(row.status ?? "").toLowerCase())).length;
  const disponibilidade = equipamentoRows.length ? `${((disponiveis / equipamentoRows.length) * 100).toFixed(1).replace(".", ",")}%` : "0,0%";
  const now = new Date();
  const vendasDoMes = vendaRows.filter((row) => { const date = new Date(String(row.data ?? "")); return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(); });
  const receita = vendasDoMes.reduce((sum, row) => sum + numberValue(row.total), 0);
  const chart = Array.from({ length: 7 }, (_, index) => { const date = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1); const total = vendaRows.filter((row) => monthKey(new Date(String(row.data ?? ""))) === monthKey(date)).reduce((sum, row) => sum + numberValue(row.total), 0); return { label: monthLabel(date), total }; });
  const maxChart = Math.max(...chart.map((item) => item.total), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const booking = (row: RecordData): Booking => { const client = clienteById.get(String(row.cliente_id)); const equipment = equipamentoById.get(String(row.equipamento_id)); return { id: String(row.numero ?? row.id), client: String(client?.nome ?? row.descricao ?? "Cliente não informado"), vehicle: `${String(equipment?.modelo ?? equipment?.tipo ?? "Equipamento não informado")}${equipment?.placa ? ` · ${equipment.placa}` : ""}`, date: shortDate(row.data_inicio), status: String(row.status ?? "Sem status") }; };
  const nextBookings = contratoRows.filter((row) => { const date = new Date(String(row.data_inicio ?? "")); return !Number.isNaN(date.getTime()) && date >= today && date <= tomorrow; }).slice(0, 3).map(booking);
  const recentBookings = contratoRows.slice(0, 5).map(booking);
  const loading = [contas, despesas, equipamentos, contratos, vendas].some((result) => result.isLoading);
  const hasError = [contas, despesas, equipamentos, contratos].some((result) => result.error);
  const name = usuario?.nome || usuario?.login || "Usuário";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-1 text-sm font-medium text-primary">Resumo da operação</p><h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Visão geral</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Olá, {name.split(" ")[0]}. Acompanhe o que está acontecendo na sua locadora.</p></div><button type="button" onClick={() => onNavigate("Contratos")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Novo contrato</button></div>
      {hasError && <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">Não foi possível carregar todos os dados do dashboard.</div>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="A receber" value={contas.data ? currency(receber) : "..."} detail={`${contaRows.length} conta(s) em aberto`} icon={CircleDollarSign} /><MetricCard label="A pagar" value={despesas.data ? currency(pagar) : "..."} detail={`${despesaRows.length} despesa(s) em aberto`} icon={WalletCards} negative /><MetricCard label="Veículos disponíveis" value={equipamentos.data ? disponibilidade : "..."} detail={`${disponiveis} de ${equipamentoRows.length} veículos`} icon={CarFront} /><MetricCard label="Receita do mês" value={vendas.data ? currency(receita) : "..."} detail={`${vendasDoMes.length} venda(s) no mês`} icon={CircleDollarSign} /></section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]"><div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6"><div className="mb-6"><h3 className="font-semibold text-card-foreground">Receita dos últimos 7 meses</h3><p className="mt-1 text-xs text-muted-foreground">Valores baseados nas vendas registradas</p></div><div className="flex h-56 items-end gap-2 border-b border-border px-1 sm:gap-5">{chart.map((month, index) => <div key={`${month.label}-${index}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3"><div className={`w-full max-w-10 rounded-t-lg ${index === chart.length - 1 ? "bg-primary" : "bg-accent"}`} style={{ height: `${month.total ? Math.max((month.total / maxChart) * 100, 4) : 0}%` }} /><span className="pb-3 text-[11px] text-muted-foreground">{month.label}</span></div>)}</div></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6"><div className="mb-5"><h3 className="font-semibold text-card-foreground">Próximas retiradas</h3><p className="mt-1 text-xs text-muted-foreground">Contratos com início hoje ou amanhã</p></div><div className="flex flex-col gap-1">{loading ? <p className="p-3 text-sm text-muted-foreground">Carregando...</p> : nextBookings.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Nenhuma retirada prevista.</p> : nextBookings.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent"><CalendarDays className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.client}</p><p className="truncate text-xs text-muted-foreground">{item.vehicle}</p></div><div className="text-right"><p className="text-xs font-semibold">{item.date}</p><span className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">{item.status}</span></div></div>)}</div></div></section>
      <section className="rounded-2xl border border-border bg-card shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-border p-5 sm:flex-row sm:items-center md:p-6"><div><h3 className="font-semibold text-card-foreground">Contratos recentes</h3><p className="mt-1 text-xs text-muted-foreground">Últimos contratos cadastrados</p></div><button type="button" onClick={() => onNavigate("Contratos")} className="w-fit text-xs font-semibold text-primary">Ver todos</button></div><div className="overflow-x-auto"><table className="w-full min-w-175 text-left text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr>{["Contrato", "Cliente", "Veículo", "Data", "Status", ""].map((head) => <th key={head} className="px-6 py-3 font-medium">{head}</th>)}</tr></thead><tbody>{recentBookings.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">Nenhum contrato cadastrado.</td></tr> : recentBookings.map((item) => <tr key={item.id} className="border-t border-border"><td className="px-6 py-4 font-mono text-xs font-semibold">{item.id}</td><td className="px-6 py-4 font-medium">{item.client}</td><td className="px-6 py-4 text-muted-foreground">{item.vehicle}</td><td className="px-6 py-4 text-muted-foreground">{item.date}</td><td className="px-6 py-4"><span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">{item.status}</span></td><td className="px-6 py-4 text-right"><MoreHorizontal className="ml-auto h-4 w-4 text-muted-foreground" /></td></tr>)}</tbody></table></div></section>
    </div>
  );
}

function ModulePage({ item }: { item: NavItem }) {
  const [search, setSearch] = useState("");
  const endpoint = item.resource ? `/api/${item.resource}?page=1&limit=50${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}` : null;
  const { data, error, isLoading } = useSWR<ApiResponse>(endpoint, fetcher, { revalidateOnFocus: false });
  const rows = Array.isArray(data?.data) ? data.data : [];
  const columns = useMemo(() => rows.length ? Object.keys(rows[0]).filter((key) => !["senha", "created_at", "updated_at", "criado_em", "atualizado_em"].includes(key)).slice(0, 8) : [], [rows]);
  return <div className="flex flex-col gap-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-1 text-sm font-medium text-primary">MH3 Rental / {item.label}</p><h2 className="text-3xl font-bold tracking-tight text-foreground">{item.label}</h2><p className="mt-2 text-sm text-muted-foreground">Gestão completa de {item.label.toLowerCase()} integrada ao banco de dados.</p></div><button type="button" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Adicionar registro</button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><MetricCard label="Registros encontrados" value={isLoading ? "..." : String(rows.length)} detail="Consulta atual" icon={Database} /><MetricCard label="Status da conexão" value={error ? "Atenção" : data?.configured === false ? "Configurar" : "Online"} detail="API Next.js" icon={ShieldCheck} negative={Boolean(error)} /><MetricCard label="Última sincronização" value={isLoading ? "..." : "Agora"} detail="Dados protegidos" icon={Activity} /></div><div className="rounded-2xl border border-border bg-card shadow-sm"><div className="flex flex-col gap-4 border-b border-border p-5 md:p-6"><div><h3 className="font-semibold text-card-foreground">Dados de {item.label}</h3><p className="mt-1 text-xs text-muted-foreground">Registros carregados pela API autenticada do Next.js</p></div><div className="relative w-full md:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar registros..." className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none" /></div></div>{isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">Carregando dados...</div> : error ? <div className="p-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div> : rows.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</div> : <div className="overflow-x-auto"><table className="w-full min-w-190 text-left text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr>{columns.map((column) => <th key={column} className="px-6 py-3 font-medium">{column.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? index)} className="border-t border-border">{columns.map((column) => <td key={column} className="max-w-60 truncate px-6 py-4 text-muted-foreground">{column.includes("data") || column.endsWith("_em") ? formatDate(row[column]) : displayValue(row[column])}</td>)}</tr>)}</tbody></table></div>}</div></div>;
}

export function RentalDashboard() {
  const [active, setActive] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const allItems = navGroups.flatMap((group) => group.items) as NavItem[];
  const activeItem = allItems.find((item) => item.label.trim() === active) || { href: "/", label: "Dashboard", resource: undefined, icon: FileText };
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return <div className="min-h-screen bg-background text-foreground"><div className="fixed inset-y-0 left-0 z-40 hidden md:flex"><Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} /></div>{menuOpen && <div className="fixed inset-0 z-50 flex md:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} /><div className="relative z-10 flex h-full"><Sidebar onClose={() => setMenuOpen(false)} /><button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-card p-2"><X className="h-5 w-5" /></button></div></div>}<div className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}><header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-9"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" className="rounded-xl border border-border bg-card p-2 md:hidden"><Menu className="h-5 w-5" /></button><div className="min-w-0"><p className="truncate text-xs capitalize text-muted-foreground sm:text-sm">{today}</p><h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-2xl">Olá, seja bem-vindo!</h1></div></div><button type="button" aria-label="Notificações" className="relative rounded-xl border border-border bg-card p-2.5"><Bell className="h-4 w-4" /></button></header><main className="mx-auto w-full max-w-375 p-4 sm:p-6 lg:p-9">{active === "Dashboard" ? <DashboardHome onNavigate={setActive} /> : <ModulePage item={activeItem} />}</main></div></div>;
}

export default RentalDashboard;
