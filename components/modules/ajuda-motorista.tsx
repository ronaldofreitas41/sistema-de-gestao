"use client";

import Link from "next/link";
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
import {
  Truck,
  Plus,
  Search,
  Edit,
  Eye,
  Siren,
  Trash2,
  Menu,
  X,
  Phone,
  Building,
  DollarSign,
  QrCode,
  Calendar,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { chamarApi, mensagemErro } from "@/lib/api-client";
import { PlacaInput } from "@/components/ui/placa-input";
import { Ajuda_Motorista, Despesa, Usuario } from "@/lib/types";
import { deleteRegistro, formatCurrency, formatDate, formatPhone, formatarData, getPlacas } from "@/lib/utils";
import {
  PageSizeSelect,
  PaginationControls,
  paginate,
} from "@/components/ui/pagination";
import { SortableTableHead, useSortableData } from "@/components/ui/sortable-table";

type OcorrenciaPendente = {
  ajudaId: string;
  mes: string;
  vencimento: string;
  diasParaVencer: number;
  motorista?: string | null;
  empresa?: string | null;
  placa?: string | null;
  valor: number;
};

const prazoTexto = (dias: number) =>
  dias < 0 ? `vencida há ${-dias} dia(s)` : dias === 0 ? "vence hoje" : `vence em ${dias} dia(s)`;

function normalizarDataParaApi(data: string) {
  if (!data) return null;
  const correspondencia = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return correspondencia ? `${correspondencia[3]}-${correspondencia[2]}-${correspondencia[1]}` : data;
}

export function ComponenteAjudaMotorista() {
  const [ajudas, setAjudas] = useState<Ajuda_Motorista[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAjuda, setEditingAjuda] = useState<Ajuda_Motorista | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);
  const [placas, setPlacas] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visualizando, setVisualizando] = useState<Ajuda_Motorista | null>(null);
  const [pendentes, setPendentes] = useState<OcorrenciaPendente[]>([]);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  async function carregarPendentes() {
    try {
      const res = await fetch("/api/pendencias", { credentials: "include" });
      if (!res.ok) return;
      const dados = await res.json();
      setPendentes(Array.isArray(dados.ajudas) ? dados.ajudas : []);
    } catch (error) {
      console.error("Erro ao carregar pendências de ajuda:", error);
    }
  }

  async function confirmarOcorrencia(item: OcorrenciaPendente) {
    const chave = `${item.ajudaId}-${item.mes}`;
    setConfirmando(chave);
    try {
      await chamarApi("/api/pendencias", "POST", { acao: "confirmar_ajuda", ajudaId: item.ajudaId, mes: item.mes });
      await Promise.all([carregarPendentes(), fetchAjudas()]);
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível confirmar a ajuda."));
    } finally {
      setConfirmando(null);
    }
  }

  useEffect(() => {
    try {
      const usuarioSalvo = sessionStorage.getItem("mh3_usuario");

      if (usuarioSalvo) {
        setUsuarioLogado(JSON.parse(usuarioSalvo));
      }
    } catch (error) {
      console.error("Erro ao carregar usuário logado:", error);
    }
  }, []);

  async function fetchAjudas() {
    try {
      const res = await fetch("/api/ajudas-motorista");
      const responseData = await res.json();
      setAjudas(responseData.data || responseData || []);
    } catch (error) {
      console.error("Erro ao carregar ajudas de motorista:", error);
    }
  }



  useEffect(() => {
    fetchAjudas();
    carregarPendentes();
    getPlacas().then(setPlacas);
  }, []);

  const [formData, setFormData] = useState({
    empresa: "",
    motorista: "",
    telefone: "",
    valor: "",
    data: "",
    forma_pagamento: "",
    pix: "",
    observacoes: "",
    placa: "",
    recorrente: false,
    confirma_user: "",
    despesa_id: "",
  });

  const filteredAjudas = ajudas.filter((a) => {
    const term = search.toLowerCase();
    const matchesSearch =
      (a.motorista?.toLowerCase() || "").includes(term) ||
      (a.empresa?.toLowerCase() || "").includes(term) ||
      (a.placa?.toLowerCase() || "").includes(term) ||
      (a.pix?.toLowerCase() || "").includes(term) ||
      (a.telefone?.toLowerCase() || "").includes(term);
    const dataItem = a.data ? a.data.slice(0, 10) : "";
    const matchesDate =
      (!dateFrom || dataItem >= dateFrom) && (!dateTo || dataItem <= dateTo);

    return matchesSearch && matchesDate;
  });
  const {
    sortedItems: sortedAjudas,
    sortKey,
    sortDirection,
    toggleSort,
  } = useSortableData(filteredAjudas);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, pageSize]);

  const paginatedAjudas = paginate(sortedAjudas, page, pageSize);

  const openNewAjuda = () => {
    setEditingAjuda(null);
    setFormData({
      empresa: "",
      motorista: "",
      telefone: "",
      valor: "",
      data: "",
      forma_pagamento: "PIX",
      pix: "",
      observacoes: "",
      placa: "",
      recorrente: false,
      confirma_user: usuarioLogado?.nome || usuarioLogado?.login || "",
      despesa_id: "",
    });
    setDialogOpen(true);
  };

  const openEditAjuda = (ajuda: any) => {
    setEditingAjuda(ajuda);
    setFormData({
      empresa: ajuda.empresa || "",
      motorista: ajuda.motorista || "",
      telefone: ajuda.telefone || "",
      valor: ajuda.valor ? String(ajuda.valor) : "",
      data: ajuda.data ? ajuda.data.split("T")[0].split("-").reverse().join("/") : "",
      forma_pagamento: ajuda.forma_pagamento || "PIX",
      pix: ajuda.pix || "",
      observacoes: ajuda.observacoes || "",
      placa: ajuda.placa || "",
      recorrente: ajuda.recorrente ?? false,
      confirma_user: ajuda.confirma_user || "",
      despesa_id: ajuda.despesa_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.motorista?.trim()) return alert("Informe o motorista.");
    if (!(Number(formData.valor) > 0)) return alert("Informe o valor da ajuda.");
    if (!formData.data) return alert("Informe a data de vencimento da ajuda.");
    const payload = {
      ...formData,
      valor: Number(formData.valor) || 0,
      recorrente: formData.recorrente ? 1 : 0,
      data: normalizarDataParaApi(formData.data),
    };

    try {
      // Ajuda recorrente: aparece em Pendências 7 dias antes do vencimento e, após confirmada,
      // entra no Contas a Pagar. Ajuda avulsa já gera a conta a pagar pendente ao salvar.
      await chamarApi(
        editingAjuda ? `/api/ajudas-motorista/${editingAjuda.id}` : "/api/ajudas-motorista",
        editingAjuda ? "PUT" : "POST",
        payload,
      );
      await fetchAjudas();
      setDialogOpen(false);
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível salvar a ajuda."));
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      if (!(await deleteRegistro(`/api/ajudas-motorista/${id}`))) return;
      setAjudas((prev) => prev.filter((a) => a.id !== id));
      await fetchAjudas();
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
              Ajuda de Custo - Motoristas
            </h1>
          </div>

          <Button
            onClick={openNewAjuda}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Ajuda
          </Button>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          {/* Painel de alerta: ajudas recorrentes a confirmar */}
          <section
            className={`rounded-xl border p-4 ${
              pendentes.length ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Siren className={`h-4 w-4 ${pendentes.length ? "text-amber-600" : "text-emerald-600"}`} />
                {pendentes.length
                  ? `Pendências de ajuda de custo (${pendentes.length})`
                  : "Nenhuma ajuda de custo pendente de confirmação"}
              </h2>
              <Link href="/pendencias" className="text-xs font-medium text-primary underline">
                Ver painel de pendências
              </Link>
            </div>
            {pendentes.length > 0 && (
              <ul className="mt-3 divide-y divide-amber-200">
                {pendentes.map((item) => {
                  const chave = `${item.ajudaId}-${item.mes}`;
                  return (
                    <li key={chave} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm text-slate-900">
                      <span>
                        <strong>{item.motorista || "Motorista"}</strong>
                        {item.empresa ? ` · ${item.empresa}` : ""}
                        {item.placa ? ` · ${item.placa}` : ""} — {formatCurrency(item.valor)} —{" "}
                        <span className={item.diasParaVencer < 0 ? "font-semibold text-red-600" : ""}>
                          {formatDate(item.vencimento)} ({prazoTexto(item.diasParaVencer)})
                        </span>
                      </span>
                      <Button size="sm" disabled={confirmando === chave} onClick={() => confirmarOcorrencia(item)}>
                        {confirmando === chave ? "Confirmando..." : "Confirmar ajuda"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Filters */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por motorista, empresa, placa, telefone ou chave PIX..."
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
                <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Registros de Ajudas de Custo ({filteredAjudas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <SortableTableHead<Ajuda_Motorista> label="Data" sortKey="data" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(ajuda) => ajuda.data} />
                      <SortableTableHead<Ajuda_Motorista> label="Motorista / Empresa" sortKey="motorista_empresa" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(ajuda) => `${ajuda.motorista} ${ajuda.empresa}`} />
                      <SortableTableHead<Ajuda_Motorista> label="Placa / Contato" sortKey="placa_contato" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(ajuda) => `${ajuda.placa} ${ajuda.telefone}`} />
                      <SortableTableHead<Ajuda_Motorista> label="Forma Pagto / PIX" sortKey="pagamento_pix" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(ajuda) => `${ajuda.forma_pagamento} ${ajuda.pix}`} />
                      <SortableTableHead<Ajuda_Motorista> label="Valor" sortKey="valor" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(ajuda) => Number(ajuda.valor) || 0} />
                      <SortableTableHead<Ajuda_Motorista> label="Recorrente" sortKey="recorrente" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(ajuda) => ajuda.recorrente ? "Sim" : "Não"} />
                      <TableHead className="text-muted-foreground text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAjudas.map((ajuda) => (
                      <TableRow key={ajuda.id} className="border-border">
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(ajuda.data)}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          <div>{ajuda.motorista}</div>
                          <div className="text-xs text-muted-foreground">
                            {ajuda.empresa}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="font-mono">{ajuda.placa || "-"}</div>
                          <div>{ajuda.telefone || "-"}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="font-semibold">
                            {ajuda.forma_pagamento}
                          </div>
                          <div className="font-mono text-muted-foreground/80">
                            {ajuda.pix || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-primary">
                          {formatCurrency(Number(ajuda.valor))}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              ajuda.recorrente
                                ? "bg-green-100 text-green-600 dark:bg-green-100 dark:text-green-600"
                                : "bg-red-100 text-red-600 dark:bg-red-100 dark:text-red-600"
                            }`}
                          >
                            {ajuda.recorrente ? "Sim" : "Não"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Visualizar lançamento"
                              aria-label="Visualizar lançamento"
                              className="h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                              onClick={() => setVisualizando(ajuda)}
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-100"
                              onClick={() => openEditAjuda(ajuda)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-100"
                              disabled={deletingId !== null}
                              onClick={() => handleDelete(ajuda.id)}
                            >
                              {deletingId === ajuda.id && <span className="absolute bottom-0 left-1 h-0.5 w-6 animate-pulse bg-current" />}
                              <Trash2 className="h-4 w-4 " />
                            </Button>
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
                total={filteredAjudas.length}
                onPageChange={setPage}
              />
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Visualização (lupa) */}
      <Dialog open={!!visualizando} onOpenChange={(aberto) => !aberto && setVisualizando(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Ajuda de custo {visualizando?.numero ?? ""}
            </DialogTitle>
            <DialogDescription>Detalhes do lançamento.</DialogDescription>
          </DialogHeader>
          {visualizando && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Motorista", visualizando.motorista],
                ["Empresa", visualizando.empresa],
                ["Placa", visualizando.placa],
                ["Telefone", visualizando.telefone],
                ["Data / vencimento", formatDate(visualizando.data)],
                ["Valor", formatCurrency(Number(visualizando.valor) || 0)],
                ["Forma de pagamento", visualizando.forma_pagamento],
                ["Chave PIX", visualizando.pix],
                ["Recorrente", visualizando.recorrente ? "Sim (todo mês)" : "Não"],
                ["Confirmado por", visualizando.confirma_user],
              ].map(([rotulo, valor]) => (
                <div key={String(rotulo)}>
                  <dt className="text-xs text-muted-foreground">{rotulo}</dt>
                  <dd className="font-medium text-foreground">{valor || "-"}</dd>
                </div>
              ))}
              {visualizando.observacoes && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Observações</dt>
                  <dd className="whitespace-pre-wrap font-medium text-foreground">{visualizando.observacoes}</dd>
                </div>
              )}
            </dl>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setVisualizando(null)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal / Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingAjuda ? "Editar Ajuda de Custo" : "Nova Ajuda de Custo"}
            </DialogTitle>
            <DialogDescription>
              {editingAjuda
                ? "Edite as informações do registro de ajuda de custo."
                : "Preencha os campos para registrar uma nova ajuda de custo para motorista."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="motorista" className="text-foreground">
                  Motorista
                </Label>
                <Input
                  id="motorista"
                  value={formData.motorista}
                  onChange={(e) =>
                    setFormData({ ...formData, motorista: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa" className="text-foreground">
                  Empresa
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="empresa"
                    value={formData.empresa}
                    onChange={(e) =>
                      setFormData({ ...formData, empresa: e.target.value })
                    }
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-foreground">
                  Telefone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        telefone: formatPhone(e.target.value),
                      })
                    }
                    placeholder="(00) 00000-0000"
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="placa" className="text-foreground">
                  Placa do Veículo
                </Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor" className="text-foreground">
                  Valor (R$)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) =>
                      setFormData({ ...formData, valor: e.target.value })
                    }
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data" className="text-foreground">
                  Data
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="data"
                    type="text"
                    maxLength={10}
                    placeholder="DD/MM/AAAA"
                    value={formData.data}
                    onChange={(e) =>
                      setFormData({ ...formData, data: formatarData(e.target.value) })
                    }
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forma_pagamento" className="text-foreground">
                  Forma de Pagamento
                </Label>
                <Select
                  value={formData.forma_pagamento}
                  onValueChange={(val) =>
                    setFormData({ ...formData, forma_pagamento: val ?? "" })
                  }
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pix">PIX</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pix" className="text-foreground">
                  Chave PIX
                </Label>
                <div className="relative">
                  <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pix"
                    value={formData.pix}
                    onChange={(e) =>
                      setFormData({ ...formData, pix: e.target.value })
                    }
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="confirma_user" className="text-foreground">
                  Usuário Confirmação
                </Label>
                <Input
                  id="confirma_user"
                  value={formData.confirma_user}
                  readOnly
                  className="bg-input border-border cursor-not-allowed opacity-70"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="recorrente"
                checked={formData.recorrente}
                onChange={(e) =>
                  setFormData({ ...formData, recorrente: e.target.checked })
                }
                className="h-4 w-4 rounded border-border"
              />
              <Label
                htmlFor="recorrente"
                className="text-foreground cursor-pointer"
              >
                Pagamento Recorrente
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes" className="text-foreground">
                Observações
              </Label>
              <Input
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
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
              {editingAjuda ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
