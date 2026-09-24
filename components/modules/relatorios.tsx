"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Menu,
  X,
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  Truck,
  Users,
  BarChart3,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { MetricaCard, RelatorioTab } from "@/lib/common";

export function Relatorios() {
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [tabAtiva, setTabAtiva] = useState<RelatorioTab>("financeiro");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [dados, setDados] = useState<any>({});

  // Inicializar com datas do mês atual
  useEffect(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const dataInicioStr = primeiroDia.toISOString().split("T")[0];
    const dataFimStr = hoje.toISOString().split("T")[0];

    setDataInicio(dataInicioStr);
    setDataFim(dataFimStr);
  }, []);

  async function carregarDados() {
    setCarregando(true);
    try {
      const [vendas, medicoes, contas, despesas, equipamentos, clientes, estoque] = await Promise.all([
        fetch("/api/vendas").then((r) => r.json()),
        fetch("/api/medicoes").then((r) => r.json()),
        fetch("/api/contas-receber").then((r) => r.json()),
        fetch("/api/despesas").then((r) => r.json()),
        fetch("/api/equipamentos").then((r) => r.json()),
        fetch("/api/clientes").then((r) => r.json()),
        fetch("/api/estoque").then((r) => r.json()),
      ]);

      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);

      // Filtrar por período
      const filtrarPeriodo = (items: any[]) => {
        return Array.isArray(items)
          ? items.filter((item: any) => {
            const data = new Date(item.data || item.data_vencimento || item.vencimento || "");
            return data >= inicio && data <= fim;
          })
          : [];
      };

      const vendasFiltradas = filtrarPeriodo(Array.isArray(vendas) ? vendas : vendas.data || []);
      const medicoesFiltradas = filtrarPeriodo(Array.isArray(medicoes) ? medicoes : medicoes.data || []);
      const contasFiltradas = filtrarPeriodo(Array.isArray(contas) ? contas : contas.data || []);
      const despesasFiltradas = filtrarPeriodo(Array.isArray(despesas) ? despesas : despesas.data || []);
      const equipamentosArray = Array.isArray(equipamentos) ? equipamentos : equipamentos.data || [];
      const clientesArray = Array.isArray(clientes) ? clientes : clientes.data || [];
      const estoqueArray = Array.isArray(estoque) ? estoque : estoque.data || [];

      setDados({
        vendas: vendasFiltradas,
        medicoes: medicoesFiltradas,
        contas: contasFiltradas,
        despesas: despesasFiltradas,
        equipamentos: equipamentosArray,
        clientes: clientesArray,
        estoque: estoqueArray,
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarDados();
    }
  }, [dataInicio, dataFim]);

  // Calcular métricas financeiras
  const metricasFinanceiras = useMemo(() => {
    const receitaVendas = (dados.vendas || []).reduce((sum: number, v: any) => sum + (Number(v.valor || v.total) || 0), 0);
    const receitaMedicoes = (dados.medicoes || []).reduce((sum: number, m: any) => sum + (Number(m.valor || m.total) || 0), 0);
    const receitaTotal = receitaVendas + receitaMedicoes;

    const aReceber = (dados.contas || []).filter((c: any) => c.status !== "pago").reduce((sum: number, c: any) => sum + (Number(c.valor) || 0), 0);
    const despesasTotal = (dados.despesas || []).reduce((sum: number, d: any) => sum + (Number(d.valor) || 0), 0);

    const saldo = receitaTotal - despesasTotal;
    const margemLiquida = receitaTotal > 0 ? (saldo / receitaTotal) * 100 : 0;

    return {
      receitaTotal,
      aReceber,
      despesasTotal,
      saldo,
      margemLiquida,
    };
  }, [dados]);

  const metricas: MetricaCard[] = [
    {
      label: "Receita Total",
      valor: metricasFinanceiras.receitaTotal,
      tipo: "positivo",
    },
    {
      label: "A Receber",
      valor: metricasFinanceiras.aReceber,
      tipo: "neutro",
    },
    {
      label: "Total Despesas",
      valor: metricasFinanceiras.despesasTotal,
      tipo: "negativo",
    },
    {
      label: "Saldo",
      valor: metricasFinanceiras.saldo,
      tipo: metricasFinanceiras.saldo >= 0 ? "positivo" : "negativo",
    },
  ];

  // Renderizar conteúdo por aba
  const renderizarConteudo = () => {
    switch (tabAtiva) {
      case "financeiro":
        return <RelatorioFinanceiro metricas={metricas} dados={dados} />;
      case "receitas":
        return <RelatorioReceitas dados={dados} />;
      case "despesas":
        return <RelatorioDespesas dados={dados} />;
      case "frota":
        return <RelatorioFrota dados={dados} />;
      case "clientes":
        return <RelatorioClientes dados={dados} />;
      case "resultado-geral":
        return <RelatorioResultadoGeral metricas={metricas} dados={dados} />;
      default:
        return <div className="text-center py-12 text-muted-foreground">Relatório em desenvolvimento</div>;
    }
  };

  const abas: { id: RelatorioTab; label: string; icon: any }[] = [
    { id: "financeiro", label: "Financeiro", icon: Wallet },
    { id: "receitas", label: "Receitas", icon: TrendingUp },
    { id: "despesas", label: "Despesas", icon: TrendingDown },
    { id: "frota", label: "Frota", icon: Truck },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "resultado-geral", label: "Resultado", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-y-0 left-0 z-40 hidden md:flex">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="relative z-10 flex h-full">
            <Sidebar onClose={() => setMenuOpen(false)} />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Fechar menu"
              className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-card p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}>
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              className="rounded-xl border border-border bg-card p-2 md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold sm:text-2xl">Relatórios</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={carregarDados} disabled={carregando}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {carregando ? "Carregando..." : "Atualizar"}
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-9">
          {/* Filtros */}
          <Card className="border-2 border-gray-600">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 p-2">
                <div className="space-y-1">
                  <Label htmlFor="data-inicio" className="text-xs font-semibold uppercase text-gray-700">DE</Label>
                  <Input
                    id="data-inicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="data-fim" className="text-xs font-semibold uppercase text-gray-700">ATÉ</Label>
                  <Input
                    id="data-fim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase text-gray-700">PERÍODO</Label>
                  <select className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-100 px-3 py-2 text-sm text-gray-700 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option>Este mês</option>
                    <option>Último mês</option>
                    <option>Este trimestre</option>
                    <option>Este ano</option>
                    <option>Personalizado</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm">Gerar</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Abas */}
          <div className="flex flex-wrap gap-1 border-b border-border overflow-x-auto pb-0">
            {abas.map((aba) => {
              const Icon = aba.icon;
              return (
                <button
                  key={aba.id}
                  onClick={() => setTabAtiva(aba.id)}
                  className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${tabAtiva === aba.id
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {aba.label}
                </button>
              );
            })}
          </div>

          {/* Conteúdo */}
          <div>{renderizarConteudo()}</div>
        </main>
      </div>
    </div>
  );
}

// Componentes de relatórios específicos

function RelatorioFinanceiro({ metricas, dados }: any) {
  const icons = [DollarSign, TrendingUp, TrendingDown, Wallet];

  return (
    <div className="space-y-4">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricas.map((metrica: MetricaCard, idx: number) => {
          const Icon = icons[idx] || DollarSign;
          const bgColor =
            metrica.tipo === "positivo" ? "bg-green-100" :
              metrica.tipo === "negativo" ? "bg-red-100" :
                "bg-blue-100";

          const borderColor =
            metrica.tipo === "positivo" ? "border-green-600" :
              metrica.tipo === "negativo" ? "border-red-600" :
                "border-blue-600";

          const textColor =
            metrica.tipo === "positivo" ? "text-green-600" :
              metrica.tipo === "negativo" ? "text-red-600" :
                "text-blue-600";

          const iconBgColor =
            metrica.tipo === "positivo" ? "bg-green-200" :
              metrica.tipo === "negativo" ? "bg-red-200" :
                "bg-blue-200";

          return (
            <Card key={idx} className={`border ${borderColor}  ${bgColor} overflow-hidden`}>
              <CardContent className={`p-2`}>
                <div className="space-y-0.5">
                  <div className="flex items-start justify-between">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${textColor}`}>{metrica.label}</p>
                    <div className={`rounded-lg p-1 ${iconBgColor}`}>
                      <Icon className={`h-3 w-3 ${textColor}`} />
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${textColor}`}>
                    {formatCurrency(metrica.valor)}
                  </p>
                  {metrica.percentual && (
                    <p className="text-xs text-gray-600">+{metrica.percentual.toFixed(1)}%</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resumo Período */}
      <Card className="border border-gray-600">
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumo do Período
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 p-2">
            <div className="space-y-1 rounded-xl bg-green-100 border border-green-600 p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Receita Total</p>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(
                  (dados.vendas || []).reduce((sum: number, v: any) => sum + (Number(v.valor || v.total) || 0), 0) +
                  (dados.medicoes || []).reduce((sum: number, m: any) => sum + (Number(m.valor || m.total) || 0), 0)
                )}
              </p>
              <p className="text-xs text-green-600">Total de receitas geradas</p>
            </div>
            <div className="space-y-1 rounded-xl bg-red-100 border border-red-600 p-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Total Despesas</p>
              </div>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(
                  (dados.despesas || []).reduce((sum: number, d: any) => sum + (Number(d.valor) || 0), 0)
                )}
              </p>
              <p className="text-xs text-red-600">Total de despesas</p>
            </div>
            <div className="space-y-1 rounded-xl bg-blue-100 border border-blue-600 p-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Margem Líquida</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {(
                  ((Number((dados.vendas || []).reduce((sum: number, v: any) => sum + (Number(v.valor || v.total) || 0), 0)) +
                    Number((dados.medicoes || []).reduce((sum: number, m: any) => sum + (Number(m.valor || m.total) || 0), 0)) -
                    Number((dados.despesas || []).reduce((sum: number, d: any) => sum + (Number(d.valor) || 0), 0))) /
                    (Number((dados.vendas || []).reduce((sum: number, v: any) => sum + (Number(v.valor || v.total) || 0), 0)) +
                      Number((dados.medicoes || []).reduce((sum: number, m: any) => sum + (Number(m.valor || m.total) || 0), 0)) ||
                      1)) *
                  100
                ).toFixed(1)}
                %
              </p>
              <p className="text-xs text-blue-600">Percentual de margem</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RelatorioReceitas({ dados }: any) {
  const receitasPorCliente = useMemo(() => {
    const map = new Map<string, { vendas: number; medicoes: number; total: number }>();

    (dados.vendas || []).forEach((v: any) => {
      const cliente = v.cliente || v.contratante || "-";
      const current = map.get(cliente) || { vendas: 0, medicoes: 0, total: 0 };
      const valor = Number(v.valor || v.total) || 0;
      map.set(cliente, { ...current, vendas: current.vendas + valor, total: current.total + valor });
    });

    (dados.medicoes || []).forEach((m: any) => {
      const cliente = m.cliente || m.contratante || "-";
      const current = map.get(cliente) || { vendas: 0, medicoes: 0, total: 0 };
      const valor = Number(m.valor || m.total) || 0;
      map.set(cliente, { ...current, medicoes: current.medicoes + valor, total: current.total + valor });
    });

    return Array.from(map.entries()).map(([cliente, dados]) => ({ cliente, ...dados }));
  }, [dados]);

  return (
    <Card className="border border-gray-600">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Receita por Cliente</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto p-2">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-gray-600">
                <TableHead className="text-xs font-semibold uppercase text-gray-700">##</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-700">Cliente</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-700 text-right">Medições</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-700 text-right">Vendas</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-700 text-right">Total</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-700 text-right">% Participação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receitasPorCliente.length > 0 ? (
                receitasPorCliente.map((item: any, idx: number) => {
                  const totalGeral = receitasPorCliente.reduce((sum: number, r: any) => sum + r.total, 0);
                  const percentual = totalGeral > 0 ? (item.total / totalGeral) * 100 : 0;
                  return (
                    <TableRow key={idx} className="border-b border-gray-300 hover:bg-gray-100 transition-colors">
                      <TableCell className="font-medium text-gray-700">{idx + 1}</TableCell>
                      <TableCell className="font-semibold text-gray-700">{item.cliente}</TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">{formatCurrency(item.medicoes)}</TableCell>
                      <TableCell className="text-right text-purple-600 font-medium">{formatCurrency(item.vendas)}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{formatCurrency(item.total)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-300">
                            <div
                              className="h-full bg-green-600"
                              style={{ width: `${percentual}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{percentual.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                    Nenhum dado disponível
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function RelatorioDespesas({ dados }: any) {
  const despesasPorCategoria = useMemo(() => {
    const map = new Map<string, number>();
    (dados.despesas || []).forEach((d: any) => {
      const categoria = d.categoria || "Sem categoria";
      map.set(categoria, (map.get(categoria) || 0) + (Number(d.valor) || 0));
    });
    return Array.from(map.entries()).map(([categoria, valor]) => ({ categoria, valor }));
  }, [dados]);

  const totalDespesas = despesasPorCategoria.reduce((sum: number, d: any) => sum + d.valor, 0);

  return (
    <Card className="border border-gray-600">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Despesas por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2 p-2">
          {despesasPorCategoria.length > 0 ? (
            despesasPorCategoria.map((item: any, idx: number) => {
              const percentual = totalDespesas > 0 ? (item.valor / totalDespesas) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">{item.categoria}</span>
                    <span className="text-sm font-semibold text-red-600">{formatCurrency(item.valor)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-300">
                    <div className="h-full bg-red-600" style={{ width: `${percentual}%` }} />
                  </div>
                  <p className="text-xs text-gray-600">{percentual.toFixed(1)}% do total</p>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-500">Nenhum dado disponível</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RelatorioFrota({ dados }: any) {
  const total = (dados.equipamentos || []).length;
  const disponivel = (dados.equipamentos || []).filter((e: any) => e.status === "disponível" || e.status === "disponivel").length;
  const manutencao = (dados.equipamentos || []).filter((e: any) => e.status === "manutenção" || e.status === "manutencao").length;

  return (
    <Card className="border border-gray-600">
      <CardHeader className="pb-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Status da Frota
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 p-2">
          <div className="rounded-xl bg-blue-100 border border-blue-600 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Total Veículos</p>
              <Truck className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{total}</p>
            <div className="h-1 bg-blue-300 rounded-full overflow-hidden">
              <div className="h-full w-full bg-blue-600 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>
          <div className="rounded-xl bg-green-100 border border-green-600 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Disponíveis</p>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{disponivel}</p>
            <div className="h-1 bg-green-300 rounded-full overflow-hidden">
              <div className="h-full bg-green-600 rounded-full" style={{ width: `${total > 0 ? (disponivel / total) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-green-600">{total > 0 ? ((disponivel / total) * 100).toFixed(1) : 0}% da frota</p>
          </div>
          <div className="rounded-xl bg-orange-100 border border-orange-600 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Manutenção</p>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-600">{manutencao}</p>
            <div className="h-1 bg-orange-300 rounded-full overflow-hidden">
              <div className="h-full bg-orange-600 rounded-full" style={{ width: `${total > 0 ? (manutencao / total) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-orange-600">{total > 0 ? ((manutencao / total) * 100).toFixed(1) : 0}% da frota</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RelatorioClientes({ dados }: any) {
  return (
    <Card className="border-2 border-gray-600">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Clientes – Resumo</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto p-2">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-gray-600">
                <TableHead className="text-xs font-semibold uppercase text-gray-700">#</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-700">Cliente</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-700 text-right">Contratos</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-700 text-right">Rec. Medições</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-700 text-right">Rec. Vendas</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-700 text-right">Total Geral</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(dados.clientes || []).length > 0 ? (
                (dados.clientes || []).slice(0, 10).map((cliente: any, idx: number) => (
                  <TableRow key={idx} className="border-b border-gray-300 hover:bg-gray-100 transition-colors">
                    <TableCell className="font-medium text-gray-700">{idx + 1}</TableCell>
                    <TableCell className="font-semibold text-gray-700">{cliente.nome || cliente.razao_social || "-"}</TableCell>
                    <TableCell className="text-right text-gray-600">0</TableCell>
                    <TableCell className="text-right text-blue-600 font-medium">R$ 0,00</TableCell>
                    <TableCell className="text-right text-purple-600 font-medium">R$ 0,00</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">R$ 0,00</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-gray-500">
                    Nenhum cliente registrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function RelatorioResultadoGeral({ metricas, dados }: any) {
  const receitaTotal =
    (dados.vendas || []).reduce((sum: number, v: any) => sum + (Number(v.valor || v.total) || 0), 0) +
    (dados.medicoes || []).reduce((sum: number, m: any) => sum + (Number(m.valor || m.total) || 0), 0);

  const despesasTotal = (dados.despesas || []).reduce((sum: number, d: any) => sum + (Number(d.valor) || 0), 0);

  const nfCompras = (dados.despesas || []).reduce((sum: number, d: any) => sum + (Number(d.valor) || 0), 0);

  const saldo = receitaTotal - despesasTotal - nfCompras;
  const isSaldo = saldo >= 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border bg-green-100 border-green-200 dark:border-green-600 overflow-hidden">
          <CardContent className="bg-linear-to-br pt-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-600">Receitas Totais</p>
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-600">{formatCurrency(receitaTotal)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-red-600 overflow-hidden bg-linear-to-br bg-red-100 ">
          <CardContent className="pt-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600 ">Custos OS</p>
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600 ">{formatCurrency(despesasTotal)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-orange-600 bg-orange-100 overflow-hidden">
          <CardContent className="pt-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">NF/Compras</p>
                <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(nfCompras)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border overflow-hidden ${isSaldo ? "border-green-600" : "border-red-600"} 
                        ${isSaldo ? " bg-green-100" : " bg-red-100 "}`}>
          <CardContent className={`pt-5`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className={`text-xs font-semibold uppercase tracking-wider ${isSaldo ? "text-green-600 " : "text-red-600 "}`}>
                  Resultado Geral
                </p>
                <Wallet className={`h-5 w-5 ${isSaldo ? "text-green-600" : "text-red-600 "}`} />
              </div>
              <p className={`text-2xl font-bold ${isSaldo ? "text-green-600 " : "text-red-600"}`}>
                {formatCurrency(saldo)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-gray-600">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Fórmula de Cálculo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0 rounded-xl border border-gray-600 p-2 bg-gray-100">
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-700">Receitas</span>
              </div>
              <div className="text-lg font-bold text-green-600">{formatCurrency(receitaTotal)}</div>
            </div>
            <div className="h-px bg-gray-400 my-0"></div>
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold text-gray-700">Custos OS</span>
              </div>
              <div className="text-lg font-bold text-red-600">{formatCurrency(despesasTotal)}</div>
            </div>
            <div className="h-px bg-gray-400 my-0"></div>
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-semibold text-gray-700">NF/Compras</span>
              </div>
              <div className="text-lg font-bold text-orange-600">{formatCurrency(nfCompras)}</div>
            </div>
            <div className="h-px bg-gray-400 rounded-full my-0"></div>
            <div className={`flex items-center justify-between gap-3 py-1 px-2 rounded-lg ${isSaldo ? "bg-green-100 border border-green-600" : "bg-red-100 border border-red-600"}`}>
              <div className="flex items-center gap-2">
                <Wallet className={`h-4 w-4 ${isSaldo ? "text-green-600" : "text-red-600"}`} />
                <span className={`text-xs font-bold ${isSaldo ? "text-green-600" : "text-red-600"}`}>Resultado</span>
              </div>
              <div className={`text-base font-bold ${isSaldo ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(saldo)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
