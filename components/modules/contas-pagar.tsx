"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Receipt, Plus, Search, Edit, Trash2, Menu, X, CheckCircle2, RotateCcw } from "lucide-react";
import { ContaBancariaSelect } from "@/components/ui/conta-bancaria-select";
import { chamarApi, mensagemErro } from "@/lib/api-client";
import { Sidebar } from "@/components/layout/sidebar";
import { PlacaInput } from "@/components/ui/placa-input";
import { Despesa } from "@/lib/types";
import { deleteRegistro, getPlacas } from "@/lib/utils";
import { PageSizeSelect, PaginationControls, paginate } from "@/components/ui/pagination";
import { SortableTableHead, useSortableData } from "@/components/ui/sortable-table";

// Funções auxiliares de formatação
const formatCurrency = (value?: string | number | null) => {
  if (!value) return "R$ 0,00";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numValue);
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

export function ContasPagar() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pendente");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [placas, setPlacas] = useState<string[]>([]);
  const [parcelas, setParcelas] = useState<{ valor: string; data_vencimento: string }[]>([{ valor: "", data_vencimento: "" }]);
  const [baixa, setBaixa] = useState<{ tipo: "pagar" | "estornar"; despesa: Despesa } | null>(null);
  const [baixaConta, setBaixaConta] = useState("");
  const [baixaValor, setBaixaValor] = useState("");
  const [baixaData, setBaixaData] = useState("");
  const [baixaMotivo, setBaixaMotivo] = useState("");
  const [processando, setProcessando] = useState(false);

  async function fetchDespesas() {
    try {
      const res = await fetch("/api/despesas");
      const responseData = await res.json();
      setDespesas(Array.isArray(responseData) ? responseData : Array.isArray(responseData?.data) ? responseData.data : []);
    } catch (error) {
      console.error("Erro ao carregar despesas:", error);
    }
  }

  useEffect(() => {
    fetchDespesas();
    getPlacas().then(setPlacas);
  }, []);

  const [formData, setFormData] = useState({
    descricao: "",
    categoria: "Geral",
    fornecedor: "",
    data_competencia: "",
    data_vencimento: "",
    valor: "",
    observacoes: "",
    placa: "",
  });

  const filteredDespesas = despesas.filter((d) => {
    const matchesSearch =
      (d.descricao?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (d.num_desp?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (d.fornecedor?.toLowerCase() || "").includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || d.categoria === categoryFilter;

    const matchesStatus =
      statusFilter === "all" || d.status_disp === statusFilter;

    const vencimento = d.data_vencimento ? d.data_vencimento.slice(0, 10) : "";
    const matchesDate =
      (!dateFrom || vencimento >= dateFrom) && (!dateTo || vencimento <= dateTo);

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });
  const {
    sortedItems: sortedDespesas,
    sortKey,
    sortDirection,
    toggleSort,
  } = useSortableData(filteredDespesas);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter, dateFrom, dateTo, pageSize]);

  const paginatedDespesas = paginate(sortedDespesas, page, pageSize);

  const openNewDespesa = () => {
    setEditingDespesa(null);
    setFormData({
      descricao: "",
      categoria: "Geral",
      fornecedor: "",
      data_competencia: "",
      data_vencimento: "",
      valor: "",
      observacoes: "",
      placa: "",
    });
    setParcelas([{ valor: "", data_vencimento: "" }]);
    setDialogOpen(true);
  };

  const alterarQuantidadeParcelas = (quantidade: number) => {
    const total = Math.min(Math.max(quantidade || 1, 1), 60);
    setParcelas((atual) =>
      Array.from({ length: total }, (_, i) => atual[i] ?? { valor: "", data_vencimento: "" }),
    );
  };

  const atualizarParcela = (indice: number, campo: "valor" | "data_vencimento", valor: string) =>
    setParcelas((atual) => atual.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)));

  const openEditDespesa = (despesa: Despesa) => {
    setEditingDespesa(despesa);
    setFormData({
      descricao: despesa.descricao || "",
      categoria: despesa.categoria || "Geral",
      fornecedor: despesa.fornecedor || "",
      data_competencia: despesa.data_competencia ? despesa.data_competencia.split("T")[0] : "",
      data_vencimento: despesa.data_vencimento ? despesa.data_vencimento.split("T")[0] : "",
      valor: despesa.valor || "",
      observacoes: despesa.observacoes || "",
      placa: despesa.placa || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.descricao.trim()) return alert("Informe a descrição.");
    try {
      if (editingDespesa) {
        await chamarApi(`/api/despesas/${editingDespesa.id}`, "PUT", {
          ...formData,
          data_competencia: formData.data_competencia ? new Date(formData.data_competencia).toISOString() : null,
          data_vencimento: formData.data_vencimento ? new Date(formData.data_vencimento).toISOString() : null,
        });
      } else {
        const lista = parcelas.length > 1
          ? parcelas
          : [{ valor: formData.valor, data_vencimento: formData.data_vencimento }];
        if (lista.some((p) => !(Number(p.valor) > 0) || !p.data_vencimento)) {
          return alert("Informe valor e vencimento de todos os pagamentos.");
        }
        await chamarApi("/api/despesas", "POST", {
          ...formData,
          parcelas: lista.map((p) => ({ valor: Number(p.valor), data_vencimento: p.data_vencimento })),
        });
      }
      await fetchDespesas();
      setDialogOpen(false);
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível salvar a despesa."));
    }
  };

  const abrirBaixa = (tipo: "pagar" | "estornar", despesa: Despesa) => {
    setBaixa({ tipo, despesa });
    setBaixaConta("");
    setBaixaValor(String(despesa.valor_pago ?? despesa.valor ?? ""));
    setBaixaData(new Date().toISOString().slice(0, 10));
    setBaixaMotivo("");
  };

  const confirmarBaixa = async () => {
    if (!baixa) return;
    if (baixa.tipo === "pagar" && !baixaConta) return alert("Selecione de qual conta sai o recurso.");
    if (baixa.tipo === "pagar" && !(Number(baixaValor) > 0)) return alert("Informe o valor pago.");
    if (baixa.tipo === "estornar" && baixaMotivo.trim().length < 5) return alert("Informe o motivo (mínimo 5 caracteres).");
    setProcessando(true);
    try {
      await chamarApi(`/api/despesas/${baixa.despesa.id}/acao`, "POST", {
        acao: baixa.tipo,
        conta_banco_id: baixaConta,
        valor_pago: Number(baixaValor),
        data_pagamento: baixaData,
        motivo: baixaMotivo,
      });
      setBaixa(null);
      await fetchDespesas();
    } catch (erro) {
      alert(mensagemErro(erro));
    } finally {
      setProcessando(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteRegistro(`/api/despesas/${id}`);
      setDespesas((prev) => prev.filter((d) => d.id !== id));
      await fetchDespesas();
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível excluir a despesa."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-y-0 left-0 z-40 hidden md:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
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

      <div
        className={`min-h-screen transition-[padding-left] duration-300 ${
          sidebarCollapsed ? "md:pl-18" : "md:pl-65"
        }`}
      >
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

            <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-2xl">
              Contas a Pagar
            </h1>
          </div>

          <Button
            onClick={openNewDespesa}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
        </header>

        <main  className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição, número ou fornecedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-input border-border"
              />
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="sm:w-44 bg-input border-border"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="sm:w-44 bg-input border-border"
            />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="sm:w-44 bg-input border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pendente">Apenas pendentes</SelectItem>
                  <SelectItem value="pago">Apenas pagas</SelectItem>
                </SelectContent>
              </Select>
            <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
          </div>
        </CardContent>
      </Card>

      {/* Despesas Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Lista de Despesas ({filteredDespesas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <SortableTableHead<Despesa> label="Nº Desp." sortKey="num_desp" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(despesa) => despesa.num_desp} />
                  <SortableTableHead<Despesa> label="Descrição" sortKey="descricao" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(despesa) => despesa.descricao} />
                  <SortableTableHead<Despesa> label="Categoria" sortKey="categoria" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(despesa) => despesa.categoria} />
                  <SortableTableHead<Despesa> label="Fornecedor" sortKey="fornecedor" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(despesa) => despesa.fornecedor} />
                  <SortableTableHead<Despesa> label="Vencimento" sortKey="data_vencimento" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(despesa) => despesa.data_vencimento} />
                  <SortableTableHead<Despesa> label="Pagamento" sortKey="data_pagamento" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(despesa) => despesa.data_pagamento} />
                  <SortableTableHead<Despesa> label="Valor" sortKey="valor" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(despesa) => Number(despesa.valor) || 0} />
                  <SortableTableHead<Despesa> label="Status" sortKey="status_disp" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(despesa) => despesa.status_disp} />
                  <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDespesas.map((despesa) => (
                  <TableRow key={despesa.id} className="border-border">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {despesa.num_desp || "-"}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {despesa.descricao}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full bg-secondary text-xs text-secondary-foreground">
                        {despesa.categoria}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {despesa.fornecedor || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(despesa.data_vencimento)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(despesa.data_pagamento)}
                    </TableCell>
                    <TableCell className="font-medium text-primary">
                      {formatCurrency(despesa.valor)}
                      {despesa.status_disp === "pago" && despesa.valor_pago != null && Number(despesa.valor_pago) !== Number(despesa.valor) && (
                        <span className="block text-[11px] text-muted-foreground">
                          pago {formatCurrency(despesa.valor_pago)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          despesa.status_disp === "pago"
                            ? "bg-green-100 text-green-600 dark:bg-green-100 dark:text-green-600"
                            : "bg-yellow-100 text-yellow-600 dark:bg-yellow-100 dark:text-yellow-600"
                        }`}
                      >
                        {despesa.status_disp}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {despesa.status_disp !== "pago" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Pagar (informar conta)"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-100"
                            onClick={() => abrirBaixa("pagar", despesa)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Estornar pagamento"
                            className="h-8 w-8 text-amber-600 hover:bg-amber-100"
                            onClick={() => abrirBaixa("estornar", despesa)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {despesa.status_disp !== "pago" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-100"
                            onClick={() => openEditDespesa(despesa)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {despesa.status_disp !== "pago" && !despesa.medicao_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-100"
                            disabled={deletingId !== null}
                            onClick={() => handleDelete(despesa.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={filteredDespesas.length}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
        </main>
      </div>

      {/* Modal / Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingDespesa ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
            <DialogDescription>
              {editingDespesa
                ? "Edite as informações da despesa."
                : "Preencha os campos para cadastrar uma nova despesa."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            {!editingDespesa && (
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                O número da despesa é gerado automaticamente. Para pagar, use o botão de pagamento na lista
                (será pedida a conta de onde sai o recurso).
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="descricao" className="text-foreground">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="bg-input border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria" className="text-foreground">Categoria</Label>
                <Input
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fornecedor" className="text-foreground">Fornecedor</Label>
                <Input
                  id="fornecedor"
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>

            {!editingDespesa && (
              <div className="space-y-2">
                <Label className="text-foreground">Quantidade de pagamentos</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={parcelas.length}
                  onChange={(e) => alterarQuantidadeParcelas(Number(e.target.value))}
                  className="bg-input border-border"
                />
              </div>
            )}

            {!editingDespesa && parcelas.length > 1 ? (
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
                      className="bg-input border-border"
                    />
                    <Input
                      type="date"
                      value={parcela.data_vencimento}
                      onChange={(e) => atualizarParcela(indice, "data_vencimento", e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor" className="text-foreground">Valor (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_vencimento" className="text-foreground">Vencimento</Label>
                  <Input
                    id="data_vencimento"
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    className="bg-input border-border"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="placa" className="text-foreground">Placa</Label>
              <PlacaInput
                id="placa"
                value={formData.placa}
                options={placas}
                onValueChange={(placa) => setFormData({ ...formData, placa })}
                placeholder="Selecione ou digite a placa..."
                className="bg-input border-border"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary text-primary-foreground"
            >
              {editingDespesa ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!baixa} onOpenChange={(aberto) => !aberto && setBaixa(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          {baixa && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {baixa.tipo === "pagar" ? "Pagar despesa" : "Estornar pagamento"}
                </DialogTitle>
                <DialogDescription>
                  {baixa.despesa.num_desp} — {baixa.despesa.descricao} — {formatCurrency(baixa.despesa.valor)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {baixa.tipo === "pagar" ? (
                  <>
                    <div className="space-y-2">
                      <Label>De qual conta sai o recurso?</Label>
                      <ContaBancariaSelect value={baixaConta} onChange={setBaixaConta} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Valor pago (R$)</Label>
                        <Input type="number" step="0.01" value={baixaValor} onChange={(e) => setBaixaValor(e.target.value)} className="bg-input border-border" />
                        <p className="text-[11px] text-muted-foreground">Pode diferir do previsto (juros, multa, variação).</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Data do pagamento</Label>
                        <Input type="date" value={baixaData} onChange={(e) => setBaixaData(e.target.value)} className="bg-input border-border" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Motivo do estorno (auditoria)</Label>
                    <Input value={baixaMotivo} onChange={(e) => setBaixaMotivo(e.target.value)} className="bg-input border-border" />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setBaixa(null)}>Cancelar</Button>
                  <Button onClick={confirmarBaixa} disabled={processando}>
                    {processando ? "Processando..." : baixa.tipo === "pagar" ? "Confirmar pagamento" : "Estornar"}
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