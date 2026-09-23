"use client";

import { useEffect, useMemo, useState } from "react";
import { Menu, Search, X, Download, AlertTriangle } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

type PrejuizoAgregado = {
  id: string | number;
  origem: "Venda" | "Medição" | "Conta";
  cliente?: string | null;
  valor?: number | string | null;
  vencimento?: string | null;
  placa?: string | null;
  status?: string | null;
  originalId?: string | number;
  originalTable?: string;
};

export function Prejuizos() {
  const [prejuduizos, setPrejuizos] = useState<PrejuizoAgregado[]>([]);
  const [busca, setBusca] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function carregarPrejuizos() {
    setCarregando(true);
    try {
      const [vendas, medicoes, contas] = await Promise.all([
        fetch("/api/vendas").then((r) => r.json()),
        fetch("/api/medicoes").then((r) => r.json()),
        fetch("/api/contas-receber").then((r) => r.json()),
      ]);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const vendaArray = Array.isArray(vendas) ? vendas : vendas.data || [];
      const medicaoArray = Array.isArray(medicoes) ? medicoes : medicoes.data || [];
      const contaArray = Array.isArray(contas) ? contas : contas.data || [];

      const prejudizosVendas = vendaArray
        .filter((v: any) => {
          const vencimento = new Date(v.vencimento || v.data_vencimento || "");
          return vencimento < hoje && v.status !== "pago" && v.status !== "retornado";
        })
        .map((v: any) => ({
          id: `venda-${v.id}`,
          origem: "Venda" as const,
          cliente: v.cliente || v.contratante || "-",
          valor: v.valor || v.total || 0,
          vencimento: v.vencimento || v.data_vencimento,
          placa: v.placa || "-",
          status: v.status,
          originalId: v.id,
          originalTable: "vendas",
        }));

      const prejudizosMedicoes = medicaoArray
        .filter((m: any) => {
          const vencimento = new Date(m.vencimento || m.data_vencimento || "");
          return vencimento < hoje && m.status !== "pago" && m.status !== "retornado";
        })
        .map((m: any) => ({
          id: `medicao-${m.id}`,
          origem: "Medição" as const,
          cliente: m.cliente || m.contratante || "-",
          valor: m.valor || m.total || 0,
          vencimento: m.vencimento || m.data_vencimento,
          placa: m.placa || "-",
          status: m.status,
          originalId: m.id,
          originalTable: "medicoes",
        }));

      const prejudizosContas = contaArray
        .filter((c: any) => {
          const vencimento = new Date(c.vencimento || c.data_vencimento || "");
          return vencimento < hoje && c.status !== "pago" && c.status !== "retornado";
        })
        .map((c: any) => ({
          id: `conta-${c.id}`,
          origem: "Conta" as const,
          cliente: c.cliente || c.contratante || "-",
          valor: c.valor || 0,
          vencimento: c.vencimento || c.data_vencimento,
          placa: c.placa || "-",
          status: c.status,
          originalId: c.id,
          originalTable: "contas-receber",
        }));

      const todos = [...prejudizosVendas, ...prejudizosMedicoes, ...prejudizosContas];
      setPrejuizos(todos);
    } catch (error) {
      console.error("Erro ao carregar prejuduizos:", error);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarPrejuizos();
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return prejuduizos.filter((p) =>
      [p.cliente, p.placa].some((valor) => String(valor || "").toLowerCase().includes(termo))
    );
  }, [prejuduizos, busca]);

  const totalPrejuizos = useMemo(() => {
    return filtrados.reduce((sum, p) => sum + (Number(p.valor) || 0), 0);
  }, [filtrados]);

  async function retornar(prejuizo: PrejuizoAgregado) {
    try {
      const response = await fetch(`/api/${prejuizo.originalTable}/${prejuizo.originalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "retornado" }),
      });
      if (!response.ok) throw new Error("Não foi possível retornar.");
      await carregarPrejuizos();
    } catch (error) {
      console.error(error);
      alert("Não foi possível retornar o registro.");
    }
  }

  async function marcarRecebido(prejuizo: PrejuizoAgregado) {
    try {
      const response = await fetch(`/api/${prejuizo.originalTable}/${prejuizo.originalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pago" }),
      });
      if (!response.ok) throw new Error("Não foi possível marcar como recebido.");
      await carregarPrejuizos();
    } catch (error) {
      console.error(error);
      alert("Não foi possível marcar como recebido.");
    }
  }

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
              <h1 className="text-lg font-bold sm:text-2xl">Prejuízos</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={carregarPrejuizos} size="sm" disabled={carregando}>
              <Search className="mr-2 h-4 w-4" />
              {carregando ? "Carregando..." : "Atualizar"}
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-9">
          {/* Descrição */}
          <div className="rounded-lg bg-blue-100 p-4 text-sm text-blue-600">
            <p>
              Prejuízos – medições, vendas e contas marcadas como ATRASADO. Use "Retornar" se o cliente regularizar
            </p>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="BUSCAR POR CLIENTE, PLACA..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Seção de Prejuduízos Operacionais */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <AlertTriangle className="text-red-600" />
              Prejuduízos Operacionais
            </h2>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs font-semibold uppercase">Contratante/Cliente</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">Origem</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-right">Valor</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">Venc. Original</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">Placa</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtrados.length > 0 ? (
                        filtrados.map((prejuizo) => (
                          <TableRow key={String(prejuizo.id)} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">📍</span>
                                {prejuizo.cliente || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-red-100 text-red-600">
                                {prejuizo.origem}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-red-600">
                              {formatCurrency(Number(prejuizo.valor))}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(String(prejuizo.vencimento))}
                            </TableCell>
                            <TableCell className="text-sm">{prejuizo.placa || "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => retornar(prejuizo)}
                                  className="h-8 text-xs hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950"
                                >
                                  Retornar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => marcarRecebido(prejuizo)}
                                  className="h-8 text-xs hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950"
                                >
                                  Recebido
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                            {carregando ? "Carregando..." : "Nenhum prejuduizo encontrado."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Total */}
            <div className="flex items-center justify-between rounded-lg bg-red-100 p-4">
              <p className="text-sm text-red-600">
                Este valor entra como NEGATIVO(–) no Resultado Geral da empresa
              </p>
              <p className="text-lg font-bold text-red-600">
                Total Prejuduízos: <span className="text-red-600">{formatCurrency(totalPrejuizos)}</span>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
