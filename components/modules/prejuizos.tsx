"use client";

import { useEffect, useMemo, useState } from "react";
import { Handshake, Menu, Search, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableData } from "@/components/ui/sortable-table";
import { chamarApi, mensagemErro } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

type Prejuizo = {
  id: string | number;
  numero?: string | null;
  cliente?: string | null;
  descricao?: string | null;
  valor?: number | string | null;
  vencimento_original?: string | null;
  data?: string | null;
  status?: string | null;
  observacoes?: string | null;
  conta_receber_id?: string | null;
};

type Parcela = { valor: string; data_vencimento: string };

const ROTULO: Record<string, string> = { aberto: "Em aberto", negociado: "Negociado" };

export function Prejuizos() {
  const [prejuizos, setPrejuizos] = useState<Prejuizo[]>([]);
  const [busca, setBusca] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const [negociando, setNegociando] = useState<Prejuizo | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([{ valor: "", data_vencimento: "" }]);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const response = await fetch("/api/prejuizos", { credentials: "include" });
      const payload = await response.json();
      setPrejuizos(Array.isArray(payload) ? payload : payload.data || []);
    } catch (erro) {
      console.error("Erro ao carregar prejuízos:", erro);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return prejuizos.filter((p) =>
      [p.numero, p.cliente, p.descricao].some((valor) => String(valor || "").toLowerCase().includes(termo)),
    );
  }, [prejuizos, busca]);
  const { sortedItems, sortKey, sortDirection, toggleSort } = useSortableData(filtrados);

  const totalAberto = filtrados
    .filter((p) => p.status === "aberto")
    .reduce((soma, p) => soma + (Number(p.valor) || 0), 0);

  function abrirNegociacao(prejuizo: Prejuizo) {
    setNegociando(prejuizo);
    setMotivo("");
    setParcelas([{ valor: String(prejuizo.valor ?? ""), data_vencimento: "" }]);
  }

  function definirQuantidade(quantidade: number) {
    const total = Math.min(Math.max(quantidade || 1, 1), 60);
    const valorTotal = Number(negociando?.valor) || 0;
    const base = Math.floor((valorTotal / total) * 100) / 100;
    setParcelas((atual) =>
      Array.from({ length: total }, (_, i) => ({
        valor: i === total - 1 ? (valorTotal - base * (total - 1)).toFixed(2) : base.toFixed(2),
        data_vencimento: atual[i]?.data_vencimento ?? "",
      })),
    );
  }

  const atualizarParcela = (indice: number, campo: keyof Parcela, valor: string) =>
    setParcelas((atual) => atual.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)));

  const totalParcelas = parcelas.reduce((soma, p) => soma + (Number(p.valor) || 0), 0);

  async function confirmarNegociacao() {
    if (!negociando) return;
    if (motivo.trim().length < 5) return alert("Descreva a negociação (mínimo 5 caracteres).");
    if (parcelas.some((p) => !(Number(p.valor) > 0) || !p.data_vencimento)) {
      return alert("Informe valor e vencimento de todas as parcelas.");
    }
    setSalvando(true);
    try {
      await chamarApi(`/api/prejuizos/${negociando.id}/negociar`, "POST", {
        motivo,
        parcelas: parcelas.map((p) => ({ valor: Number(p.valor), data_vencimento: p.data_vencimento })),
      });
      setNegociando(null);
      await carregar();
    } catch (erro) {
      alert(mensagemErro(erro));
    } finally {
      setSalvando(false);
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
            <h1 className="text-lg font-bold sm:text-2xl">Prejuízos</h1>
          </div>
          <Button onClick={carregar} size="sm" disabled={carregando}>
            <Search className="mr-2 h-4 w-4" />
            {carregando ? "Carregando..." : "Atualizar"}
          </Button>
        </header>

        <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-9">
          <div className="rounded-lg bg-blue-100 p-4 text-sm text-blue-700">
            Contas marcadas como ATRASADO em Contas a Receber saem do fluxo de caixa e dos recebimentos e
            ficam aqui. Quando o cliente regularizar, use "Negociar" para definir parcelas, valores e
            vencimentos: os novos lançamentos voltam automaticamente para Contas a Receber.
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por número, cliente ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Lançamentos ({filtrados.length})</h2>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total em aberto</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(totalAberto)}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead<Prejuizo> label="Nº" sortKey="numero" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(p) => p.numero} />
                      <SortableTableHead<Prejuizo> label="Cliente / descrição" sortKey="cliente" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(p) => p.cliente || p.descricao} />
                      <SortableTableHead<Prejuizo> label="Vencimento original" sortKey="vencimento_original" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(p) => p.vencimento_original} />
                      <SortableTableHead<Prejuizo> label="Valor" sortKey="valor" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(p) => Number(p.valor) || 0} />
                      <SortableTableHead<Prejuizo> label="Status" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(p) => p.status} />
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          Nenhum prejuízo registrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {sortedItems.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.numero || "-"}</TableCell>
                        <TableCell>
                          <span className="font-medium">{p.cliente || "-"}</span>
                          {p.descricao && <span className="block text-xs text-muted-foreground">{p.descricao}</span>}
                        </TableCell>
                        <TableCell>{formatDate(p.vencimento_original || p.data)}</TableCell>
                        <TableCell className="font-semibold text-red-600">{formatCurrency(Number(p.valor) || 0)}</TableCell>
                        <TableCell>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.status === "aberto" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {ROTULO[p.status ?? ""] ?? p.status ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {p.status === "aberto" && p.conta_receber_id && (
                            <Button size="sm" variant="outline" onClick={() => abrirNegociacao(p)}>
                              <Handshake className="mr-1 h-4 w-4" />
                              Negociar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={!!negociando} onOpenChange={(aberto) => !aberto && setNegociando(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {negociando && (
            <>
              <DialogHeader>
                <DialogTitle>Negociar {negociando.numero}</DialogTitle>
                <DialogDescription>
                  {negociando.cliente} — valor original {formatCurrency(Number(negociando.valor) || 0)}. Cada
                  parcela vira um lançamento em Contas a Receber.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Quantidade de parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={parcelas.length}
                    onChange={(e) => definirQuantidade(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  {parcelas.map((parcela, indice) => (
                    <div key={indice} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">{indice + 1}/{parcelas.length}</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Valor (R$)"
                        value={parcela.valor}
                        onChange={(e) => atualizarParcela(indice, "valor", e.target.value)}
                      />
                      <Input
                        type="date"
                        value={parcela.data_vencimento}
                        onChange={(e) => atualizarParcela(indice, "data_vencimento", e.target.value)}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Total negociado: {formatCurrency(totalParcelas)}
                    {Math.abs(totalParcelas - (Number(negociando.valor) || 0)) > 0.009 &&
                      ` (diferença de ${formatCurrency(totalParcelas - (Number(negociando.valor) || 0))} em relação ao original)`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Descrição da negociação (auditoria)</Label>
                  <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: acordo com o financeiro do cliente" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setNegociando(null)}>Cancelar</Button>
                  <Button onClick={confirmarNegociacao} disabled={salvando}>
                    {salvando ? "Gerando..." : "Gerar lançamentos"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
