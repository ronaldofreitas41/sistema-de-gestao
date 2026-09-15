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
import {
  Truck,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Menu,
  X,
  Gauge,
  Calendar,
  ShieldAlert,
  FileText,
  DollarSign,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Equipamento } from "@/lib/types";
import { deleteRegistro, formatCurrency, formatDate } from "@/lib/utils";
import { PageSizeSelect, PaginationControls, paginate } from "@/components/ui/pagination";

export function Equipamentos() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState<Equipamento | null>(null);
  const [selectedEquipamento, setSelectedEquipamento] = useState<Equipamento | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  async function fetchEquipamentos() {
    try {
      const res = await fetch("/api/equipamentos");
      const responseData = await res.json();
      const list = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.data)
          ? responseData.data
          : [];
      setEquipamentos(list);
    } catch (error) {
      console.error("Erro ao carregar equipamentos:", error);
      setEquipamentos([]);
    }
  }

  useEffect(() => {
    fetchEquipamentos();
  }, []);

  const [formData, setFormData] = useState<Partial<Equipamento>>({
    placa: "",
    frota: "",
    tipo: "",
    marca: "",
    modelo: "",
    ano: "",
    renavam: "",
    chassi: "",
    km_atual: 0,
    horimetro: 0,
    status: "Ativo",
    observacoes: "",
    prorietario: "",
    situacao_financeira: "Quitado",
  });

  const filteredEquipamentos = equipamentos.filter((e) => {
    const term = search.toLowerCase();
    const matchesSearch =
      (e.placa?.toLowerCase() || "").includes(term) ||
      (e.frota?.toLowerCase() || "").includes(term) ||
      (e.tipo?.toLowerCase() || "").includes(term) ||
      (e.marca?.toLowerCase() || "").includes(term) ||
      (e.modelo?.toLowerCase() || "").includes(term) ||
      (e.status?.toLowerCase() || "").includes(term);
    const aquisicao = e.data_aquisicao ? e.data_aquisicao.slice(0, 10) : "";
    const matchesDate =
      (!dateFrom || aquisicao >= dateFrom) && (!dateTo || aquisicao <= dateTo);

    return matchesSearch && matchesDate;
  });

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, pageSize]);

  const paginatedEquipamentos = paginate(filteredEquipamentos, page, pageSize);

  const openViewEquipamento = (equipamento: Equipamento) => {
    setSelectedEquipamento(equipamento);
    setViewDialogOpen(true);
  };

  const openNewEquipamento = () => {
    setEditingEquipamento(null);
    setFormData({
      placa: "",
      frota: "",
      tipo: "",
      marca: "",
      modelo: "",
      ano: "",
      renavam: "",
      chassi: "",
      km_atual: 0,
      horimetro: 0,
      status: "Ativo",
      observacoes: "",
      prorietario: "",
      situacao_financeira: "Quitado",
    });
    setDialogOpen(true);
  };

  const openEditEquipamento = (equipamento: Equipamento) => {
    setEditingEquipamento(equipamento);
    setFormData({ ...equipamento });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...formData };

    if (editingEquipamento) {
      await fetch(`/api/equipamentos/${editingEquipamento.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/equipamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await fetchEquipamentos();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string | number) => {
    if (deletingId !== null) return;
    setDeletingId(id);
    try {
      await deleteRegistro(`/api/equipamentos/${id}`);
      setEquipamentos((prev) => prev.filter((e) => e.id !== id));
      await fetchEquipamentos();
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
              className="rounded-xl border border-border bg-card p-2 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-2xl">
              Frota e Equipamentos
            </h1>
          </div>

          <Button
            onClick={openNewEquipamento}
            className="bg-primary text-primary-foreground hover:bg-primary/90">
            Novo Equipamento
          </Button>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          {/* Busca */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por placa, frota, tipo, marca, modelo ou status..."
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

          {/* Tabela Resumida */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Equipamentos Cadastrados ({filteredEquipamentos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Placa / Frota</TableHead>
                      <TableHead className="text-muted-foreground">Tipo</TableHead>
                      <TableHead className="text-muted-foreground">Marca / Modelo</TableHead>
                      <TableHead className="text-muted-foreground">Ano</TableHead>
                      <TableHead className="text-muted-foreground">KM / Horímetro</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEquipamentos.map((eq) => (
                      <TableRow key={eq.id} className="border-border">
                        <TableCell className="font-bold text-foreground">
                          <div>{eq.placa || "-"}</div>
                          <div className="text-xs text-muted-foreground font-mono">Frota: {eq.frota || "-"}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {eq.tipo || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">
                          <div>{eq.marca || "-"}</div>
                          <div className="text-xs text-muted-foreground">{eq.modelo || "-"}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {eq.ano || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          <div>{eq.km_atual ? `${eq.km_atual} KM` : "-"}</div>
                          <div>{eq.horimetro ? `${eq.horimetro} H` : "-"}</div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              eq.status === "Ativo"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : eq.status === "Manutenção"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {eq.status || "Ativo"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Visualizar detalhes"
                              onClick={() => openViewEquipamento(eq)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-100"
                              onClick={() => openEditEquipamento(eq)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-100"
                              disabled={deletingId !== null}
                              onClick={() => handleDelete(eq.id)}
                            >
                              {deletingId === eq.id && <span className="absolute bottom-0 left-1 h-0.5 w-6 animate-pulse bg-current" />}
                              <Trash2 className="h-4 w-4" />
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
                total={filteredEquipamentos.length}
                onPageChange={setPage}
              />
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modal de Visualização Completa */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Ficha do Equipamento — {selectedEquipamento?.placa || selectedEquipamento?.frota}
            </DialogTitle>
            <DialogDescription>
              Detalhamento técnico, documental e financeiro completo.
            </DialogDescription>
          </DialogHeader>

          {selectedEquipamento && (
            <div className="space-y-6 py-2 text-xs">
              {/* Identificação Geral */}
              <div>
                <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5 border-b pb-1 border-border">
                  <FileText className="h-4 w-4 text-primary" /> Identificação e Especificações
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div><span className="text-muted-foreground block">Placa:</span> <strong className="text-foreground text-sm">{selectedEquipamento.placa || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Frota:</span> <strong className="text-foreground">{selectedEquipamento.frota || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Tipo:</span> <strong className="text-foreground">{selectedEquipamento.tipo || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Status:</span> <strong className="text-foreground">{selectedEquipamento.status || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Marca:</span> <strong className="text-foreground">{selectedEquipamento.marca || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Modelo:</span> <strong className="text-foreground">{selectedEquipamento.modelo || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Ano:</span> <strong className="text-foreground">{selectedEquipamento.ano || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Proprietário:</span> <strong className="text-foreground">{selectedEquipamento.prorietario || "-"}</strong></div>
                </div>
              </div>

              {/* Documentação e Chassi */}
              <div>
                <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5 border-b pb-1 border-border">
                  <ShieldAlert className="h-4 w-4 text-primary" /> Documentação e Métrica
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div><span className="text-muted-foreground block">Renavam:</span> <strong className="text-foreground font-mono">{selectedEquipamento.renavam || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Chassi:</span> <strong className="text-foreground font-mono">{selectedEquipamento.chassi || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">CRV:</span> <strong className="text-foreground">{selectedEquipamento.crv || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">CRLV:</span> <strong className="text-foreground">{selectedEquipamento.crlv || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">KM Atual:</span> <strong className="text-foreground">{selectedEquipamento.km_atual ?? "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Horímetro:</span> <strong className="text-foreground">{selectedEquipamento.horimetro ?? "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Venc. ANTT:</span> <strong className="text-foreground">{formatDate(selectedEquipamento.vencimento_licenca_antt)}</strong></div>
                  <div><span className="text-muted-foreground block">Cronotacógrafo Venc:</span> <strong className="text-foreground">{formatDate(selectedEquipamento.cronotacografo_venc)}</strong></div>
                </div>
              </div>

              {/* Dados Financeiros */}
              <div>
                <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5 border-b pb-1 border-border">
                  <DollarSign className="h-4 w-4 text-primary" /> Informações Financeiras
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div><span className="text-muted-foreground block">Valor Aquisição:</span> <strong className="text-foreground">{formatCurrency(selectedEquipamento.valor_aquisição || 0)}</strong></div>
                  <div><span className="text-muted-foreground block">Data Aquisição:</span> <strong className="text-foreground">{formatDate(selectedEquipamento.data_aquisicao)}</strong></div>
                  <div><span className="text-muted-foreground block">Situação Fin.:</span> <strong className="text-foreground">{selectedEquipamento.situacao_financeira || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Banco Financiamento:</span> <strong className="text-foreground">{selectedEquipamento.banco_financiamento || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Parcelas Pagas/Total:</span> <strong className="text-foreground">{selectedEquipamento.parcelas_pagas || "0"} / {selectedEquipamento.quantidade_parcelas || "0"}</strong></div>
                  <div><span className="text-muted-foreground block">Valor Parcela:</span> <strong className="text-foreground">{formatCurrency(selectedEquipamento.valor_parcela || 0)}</strong></div>
                  <div><span className="text-muted-foreground block">Valor Quitação Atual:</span> <strong className="text-foreground">{formatCurrency(selectedEquipamento.valor_quitacao_atual || 0)}</strong></div>
                  <div><span className="text-muted-foreground block">Valor Atualizado:</span> <strong className="text-foreground">{formatCurrency(selectedEquipamento.valor_atualizado || 0)}</strong></div>
                </div>
              </div>

              {/* Implemento */}
              {selectedEquipamento.possui_implemento && (
                <div>
                  <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5 border-b pb-1 border-border">
                    <Gauge className="h-4 w-4 text-primary" /> Implemento
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                    <div><span className="text-muted-foreground block">Tipo:</span> <strong className="text-foreground">{selectedEquipamento.tipo_implemento || "-"}</strong></div>
                    <div><span className="text-muted-foreground block">Marca:</span> <strong className="text-foreground">{selectedEquipamento.marca_implemento || "-"}</strong></div>
                    <div><span className="text-muted-foreground block">Modelo:</span> <strong className="text-foreground">{selectedEquipamento.modelo_implemento || "-"}</strong></div>
                    <div><span className="text-muted-foreground block">Valor:</span> <strong className="text-foreground">{formatCurrency(selectedEquipamento.valor_implemento || 0)}</strong></div>
                  </div>
                </div>
              )}

              {/* Observações */}
              {selectedEquipamento.observacoes && (
                <div className="bg-muted/30 p-3 rounded-lg border border-border">
                  <span className="text-muted-foreground block font-bold mb-1">Observações:</span>
                  <p className="text-foreground">{selectedEquipamento.observacoes}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal / Dialog de Edição e Cadastro */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingEquipamento ? "Editar Equipamento" : "Novo Equipamento"}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações básicas do equipamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="placa">Placa</Label>
                <Input
                  id="placa"
                  value={formData.placa || ""}
                  onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frota">Frota</Label>
                <Input
                  id="frota"
                  value={formData.frota || ""}
                  onChange={(e) => setFormData({ ...formData, frota: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Input
                  id="tipo"
                  value={formData.tipo || ""}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || "Ativo"}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Manutenção">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input
                  id="marca"
                  value={formData.marca || ""}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  value={formData.modelo || ""}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ano">Ano</Label>
                <Input
                  id="ano"
                  value={formData.ano || ""}
                  onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="km_atual">KM Atual</Label>
                <Input
                  id="km_atual"
                  type="number"
                  value={formData.km_atual || 0}
                  onChange={(e) => setFormData({ ...formData, km_atual: Number(e.target.value) })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horimetro">Horímetro</Label>
                <Input
                  id="horimetro"
                  type="number"
                  value={formData.horimetro || 0}
                  onChange={(e) => setFormData({ ...formData, horimetro: Number(e.target.value) })}
                  className="bg-input border-border"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground">
              {editingEquipamento ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}