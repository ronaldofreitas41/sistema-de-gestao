"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { formatDate, getToken } from "@/lib/utils";
import type { Usuario, ApiResponse, Booking, NavItem } from "@/lib/types";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CarFront,
  ChevronDown,
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



const dashboardBookings: Booking[] = [
  {
    id: "CTR-2026-084",
    client: "Mariana Alves",
    vehicle: "Toyota Corolla · RZT-4H21",
    date: "Hoje, 14:30",
    status: "Em andamento",
  },
  {
    id: "CTR-2026-083",
    client: "Grupo Conecta Ltda.",
    vehicle: "Fiat Toro · GHF-8A02",
    date: "Hoje, 16:00",
    status: "Aguardando retirada",
  },
  {
    id: "CTR-2026-082",
    client: "Rafael Nogueira",
    vehicle: "Jeep Compass · BXE-1C91",
    date: "Amanhã, 09:00",
    status: "Reservado",
  },
];

async function fetcher(url: string): Promise<ApiResponse> {
  const token = getToken();

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Não foi possível carregar os dados.");
  }

  return data;
}


function getDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function MetricCard({
  label,
  value,
  delta,
  icon: Icon,
  negative = false,
}: {
  label: string;
  value: string;
  delta: string;
  icon: React.ComponentType<{ className?: string }>;
  negative?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>

        <div className="rounded-xl bg-accent p-2.5 text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="text-2xl font-bold tracking-tight text-card-foreground">
        {value}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`flex items-center gap-1 font-semibold ${
            negative ? "text-red-600" : "text-primary"
          }`}
        >
          {negative ? (
            <ArrowDownRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5" />
          )}

          {delta}
        </span>

        <span className="text-muted-foreground">vs. mês anterior</span>
      </div>
    </div>
  );
}

function DashboardHome({
  onNavigate,
}: {
  onNavigate: (label: string) => void;
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useState(() => {
    if (typeof window === "undefined") return;

    try {
      const usuarioSalvo = sessionStorage.getItem("mh3_usuario");

      if (usuarioSalvo) {
        setUsuario(JSON.parse(usuarioSalvo));
      }
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
    }
  });

  const nome = usuario?.nome || usuario?.login || "Usuário";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">
            Resumo da operação
          </p>

          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Visão geral
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Olá, {nome.split(" ")[0]}. Acompanhe o que está acontecendo na sua
            locadora.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("Contratos")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Novo contrato
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="A receber"
          value="R$ 84.920,00"
          delta="18,4%"
          icon={CircleDollarSign}
        />

        <MetricCard
          label="A pagar"
          value="R$ 48.000,00"
          delta="12,5%"
          icon={WalletCards}
          negative
        />

        <MetricCard
          label="Veículos disponíveis"
          value="76,8%"
          delta="4,2%"
          icon={CarFront}
        />

        <MetricCard
          label="Receita do mês"
          value="R$ 12.480,00"
          delta="8,1%"
          icon={CircleDollarSign}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h3 className="font-semibold text-card-foreground">
                Receita e contratos
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Desempenho dos últimos 7 meses
              </p>
            </div>

            <button
              type="button"
              className="flex w-fit items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground"
            >
              Últimos 7 meses
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          <div className="flex h-56 items-end gap-2 border-b border-border px-1 sm:gap-5">
            {[
              ["Abr", "55%"],
              ["Mai", "68%"],
              ["Jun", "59%"],
              ["Jul", "78%"],
              ["Ago", "72%"],
              ["Set", "92%"],
              ["Out", "84%"],
            ].map(([month, height], index) => (
              <div
                key={month}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3"
              >
                <div
                  className={`w-full max-w-10 rounded-t-lg ${
                    index === 5 ? "bg-primary" : "bg-accent"
                  }`}
                  style={{ height }}
                />

                <span className="pb-3 text-[11px] text-muted-foreground">
                  {month}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-card-foreground">
                Próximas retiradas
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Agenda para hoje e amanhã
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("Agenda")}
              className="text-xs font-semibold text-primary"
            >
              Ver agenda
            </button>
          </div>

          <div className="flex flex-col gap-1">
            {dashboardBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-accent"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                  <CalendarDays className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {booking.client}
                  </p>

                  <p className="truncate text-xs text-muted-foreground">
                    {booking.vehicle}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold">{booking.date}</p>

                  <span className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-border p-5 sm:flex-row sm:items-center md:p-6">
          <div>
            <h3 className="font-semibold text-card-foreground">
              Contratos recentes
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              Últimas movimentações da operação
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("Contratos")}
            className="w-fit text-xs font-semibold text-primary"
          >
            Ver todos
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-175 text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                {["Contrato", "Cliente", "Veículo", "Data", "Status", ""].map(
                  (head) => (
                    <th key={head} className="px-6 py-3 font-medium">
                      {head}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {dashboardBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-t border-border transition hover:bg-accent/40"
                >
                  <td className="px-6 py-4 font-mono text-xs font-semibold">
                    {booking.id}
                  </td>

                  <td className="px-6 py-4 font-medium">
                    {booking.client}
                  </td>

                  <td className="px-6 py-4 text-muted-foreground">
                    {booking.vehicle}
                  </td>

                  <td className="px-6 py-4 text-muted-foreground">
                    {booking.date}
                  </td>

                  <td className="px-6 py-4">
                    <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
                      {booking.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <MoreHorizontal className="ml-auto h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ModulePage({ item }: { item: NavItem }) {
  const [search, setSearch] = useState("");

  const endpoint = item.resource
    ? `/api/${item.resource}?page=1&limit=50${
        search.trim()
          ? `&search=${encodeURIComponent(search.trim())}`
          : ""
      }`
    : null;

  const { data, error, isLoading } = useSWR<ApiResponse>(
    endpoint,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const rows = Array.isArray(data?.data) ? data.data : [];

  const columns = useMemo(() => {
    if (!rows.length) return [];

    return Object.keys(rows[0])
      .filter(
        (key) =>
          ![
            "senha",
            "created_at",
            "updated_at",
            "criado_em",
            "atualizado_em",
          ].includes(key)
      )
      .slice(0, 8);
  }, [rows]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">
            MH3 Rental / {item.label}
          </p>

          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {item.label}
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Gestão completa de {item.label.toLowerCase()} integrada ao banco
            de dados.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Adicionar registro
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Registros encontrados"
          value={isLoading ? "..." : String(rows.length)}
          delta="Atualizado agora"
          icon={Database}
        />

        <MetricCard
          label="Status da conexão"
          value={error ? "Atenção" : data?.configured === false ? "Configurar" : "Online"}
          delta="API Next.js"
          icon={ShieldCheck}
          negative={Boolean(error)}
        />

        <MetricCard
          label="Última sincronização"
          value={isLoading ? "..." : "Agora"}
          delta="Dados protegidos"
          icon={Activity}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border p-5 md:p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h3 className="font-semibold text-card-foreground">
                Dados de {item.label}
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Registros carregados pela API autenticada do Next.js
              </p>
            </div>

            <button
              type="button"
              className="w-fit rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-muted"
            >
              Exportar
            </button>
          </div>

          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar registros..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Carregando dados...
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="font-medium text-destructive">
              Não foi possível carregar os dados.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Verifique se o token Bearer está válido e se a API está
              funcionando.
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <Database className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

            <p className="font-medium text-card-foreground">
              Nenhum registro encontrado
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Quando houver dados no banco, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="px-6 py-3 font-medium">
                      {column.replaceAll("_", " ")}
                    </th>
                  ))}

                  <th className="px-6 py-3" />
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={String(row.id ?? index)}
                    className="border-t border-border transition hover:bg-accent/40"
                  >
                    {columns.map((column) => (
                      <td
                        key={column}
                        className="max-w-60 truncate px-6 py-4 text-muted-foreground"
                        title={getDisplayValue(row[column])}
                      >
                        {column.includes("data") || column.endsWith("_em")
                          ? formatDate(row[column])
                          : getDisplayValue(row[column])}
                      </td>
                    ))}

                    <td className="px-6 py-4 text-right">
                      <MoreHorizontal className="ml-auto h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function RentalDashboard() {
  const [active, setActive] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const allItems = navGroups.flatMap((group) => group.items) as NavItem[];

  const activeItem =
    allItems.find((item) => item.label.trim() === active) || {
      href: "/",
      label: "Dashboard",
      resource: undefined,
      icon: FileText,
    };

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-y-0 left-0 z-40 hidden md:flex">
        <Sidebar />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />

          <div className="relative z-10 flex h-full">
            <Sidebar onClose={() => setMenuOpen(false)} />

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Fechar menu"
              className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-card p-2 text-foreground shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen md:pl-65">
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              className="rounded-xl border border-border bg-card p-2 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <p className="truncate text-xs capitalize text-muted-foreground sm:text-sm">
                {today}
              </p>

              <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-2xl">
                Olá, seja bem-vindo!
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Notificações"
              className="relative rounded-xl border border-border bg-card p-2.5 transition hover:bg-muted"
            >
              <Bell className="h-4 w-4" />

              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-375 p-4 sm:p-6 lg:p-9">
          {active === "Dashboard" ? (
            <DashboardHome onNavigate={setActive} />
          ) : (
            <ModulePage item={activeItem} />
          )}
        </main>
      </div>
    </div>
  );
}

export default RentalDashboard;