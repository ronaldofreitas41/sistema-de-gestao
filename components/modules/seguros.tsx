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
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Menu,
  X,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Seguro } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageSizeSelect, PaginationControls, paginate } from "@/components/ui/pagination";

export function ComponenteSeguros() {
  const [seguros, setSeguros] = useState<Seguro[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingSeguro, setEditingSeguro] = useState<Seguro | null>(null);
  const [selectedSeguro, setSelectedSeguro] = useState<Seguro | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function fetchSeguros() {
    try {
      const res = await fetch("/api/seguros");
      const responseData = await res.json();
      setSeguros(Array.isArray(responseData) ? responseData : Array.isArray(responseData?.data) ? responseData.data : []);
    } catch (error) {
      console.error("Erro ao carregar seguros:", error);
    }
  }

  useEffect(() => {
    fetchSeguros();
  }, []);

  const [formData, setFormData] = useState<Partial<Seguro>>({
    seguradora: "",
    apolice: "",
    data_inicio: "",
    data_fim: "",
    valor: null,
    franquia: null,
    status: "Ativo",
    obs: "",
  });

  const filteredSeguros = seguros.filter((s) => {
    const term = search.toLowerCase();
    const matchesSearch =
      (s.seguradora?.toLowerCase() || "").includes(term) ||
      (s.apolice?.toLowerCase() || "").includes(term) ||
      (s.status?.toLowerCase() || "").includes(term);
    const inicio = s.data_inicio ? s.data_inicio.slice(0, 10) : "";
    const matchesDate =
      (!dateFrom || inicio >= dateFrom) && (!dateTo || inicio <= dateTo);

    return matchesSearch && matchesDate;
  });

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, pageSize]);

  const paginatedSeguros = paginate(filteredSeguros, page, pageSize);

  const openViewSeguro = (seguro: Seguro) => {
    setSelectedSeguro(seguro);
    setViewDialogOpen(true);
  };

  const openNewSeguro = () => {
    setEditingSeguro(null);
    setFormData({
      seguradora: "",
      apolice: "",
      data_inicio: "",
      data_fim: "",
      valor: null,
      franquia: null,
      status: "Ativo",
      obs: "",
    });
    setDialogOpen(true);
  };

  const openEditSeguro = (seguro: Seguro) => {
    setEditingSeguro(seguro);
    setFormData({ ...seguro });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...formData };

    if (editingSeguro) {
      await fetch(`/api/seguros/${editingSeguro.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/seguros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await fetchSeguros();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/seguros/${id}`, {
      method: "DELETE",
    });
    setSeguros((prev) => prev.filter((s) => s.id !== id));
    await fetchSeguros();
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
              Seguros
            </h1>
          </div>

          <Button
            onClick={openNewSeguro}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Seguro
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
                    placeholder="Buscar por seguradora, apólice ou status..."
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
                <ShieldCheck className="h-5 w-5 text-primary" />
                Apólices Cadastradas ({filteredSeguros.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Seguradora</TableHead>
                      <TableHead className="text-muted-foreground">Apólice</TableHead>
                      <TableHead className="text-muted-foreground">Vigência</TableHead>
                      <TableHead className="text-muted-foreground">Valor</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSeguros.map((seguro) => (
                      <TableRow key={seguro.id} className="border-border">
                        <TableCell className="font-bold text-foreground">
                          {seguro.seguradora || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {seguro.apolice || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>Início: {formatDate(seguro.data_inicio)}</div>
                          <div>Fim: {formatDate(seguro.data_fim)}</div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground">
                          {seguro.valor !== null ? formatCurrency(seguro.valor) : "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              seguro.status === "Ativo"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : seguro.status === "Vencido"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {seguro.status || "Ativo"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Visualizar detalhes"
                              onClick={() => openViewSeguro(seguro)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditSeguro(seguro)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(seguro.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Modal de Visualização Completa */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Detalhes do Seguro — {selectedSeguro?.seguradora}
            </DialogTitle>
            <DialogDescription>
              Ficha detalhada com dados da apólice, prazos e coberturas.
            </DialogDescription>
          </DialogHeader>

          {selectedSeguro && (
            <div className="space-y-6 py-2 text-xs">
              {/* Contrato */}
              <div>
                <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5 border-b pb-1 border-border">
                  <FileText className="h-4 w-4 text-primary" /> Informações do Contrato
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div><span className="text-muted-foreground block">Seguradora:</span> <strong className="text-foreground text-sm">{selectedSeguro.seguradora || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Nº da Apólice:</span> <strong className="text-foreground font-mono">{selectedSeguro.apolice || "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Status:</span> <strong className="text-foreground">{selectedSeguro.status || "-"}</strong></div>
                </div>
              </div>

              {/* Período */}
              <div>
                <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5 border-b pb-1 border-border">
                  <Calendar className="h-4 w-4 text-primary" /> Vigência
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div><span className="text-muted-foreground block">Data de Início:</span> <strong className="text-foreground">{formatDate(selectedSeguro.data_inicio)}</strong></div>
                  <div><span className="text-muted-foreground block">Data do Fim:</span> <strong className="text-foreground">{formatDate(selectedSeguro.data_fim)}</strong></div>
                </div>
              </div>

              {/* Valores */}
              <div>
                <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5 border-b pb-1 border-border">
                  <DollarSign className="h-4 w-4 text-primary" /> Financeiro
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div><span className="text-muted-foreground block">Valor do Seguro:</span> <strong className="text-foreground">{selectedSeguro.valor !== null ? formatCurrency(selectedSeguro.valor) : "-"}</strong></div>
                  <div><span className="text-muted-foreground block">Franquia:</span> <strong className="text-foreground">{selectedSeguro.franquia !== null ? formatCurrency(selectedSeguro.franquia) : "-"}</strong></div>
                </div>
              </div>

              {/* Observações */}
              {selectedSeguro.obs && (
                <div className="bg-muted/30 p-3 rounded-lg border border-border">
                  <span className="text-muted-foreground block font-bold mb-1">Observações:</span>
                  <p className="text-foreground">{selectedSeguro.obs}</p>
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

      {/* Modal de Edição e Cadastro */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingSeguro ? "Editar Seguro" : "Novo Seguro"}
            </DialogTitle>
            <DialogDescription>
              Insira as informações do seguro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="seguradora">Seguradora</Label>
                <Input
                  id="seguradora"
                  value={formData.seguradora || ""}
                  onChange={(e) => setFormData({ ...formData, seguradora: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apolice">Apólice</Label>
                <Input
                  id="apolice"
                  value={formData.apolice || ""}
                  onChange={(e) => setFormData({ ...formData, apolice: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio || ""}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_fim">Data Fim</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim || ""}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={formData.valor ?? ""}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value ? Number(e.target.value) : null })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="franquia">Franquia (R$)</Label>
                <Input
                  id="franquia"
                  type="number"
                  step="0.01"
                  value={formData.franquia ?? ""}
                  onChange={(e) => setFormData({ ...formData, franquia: e.target.value ? Number(e.target.value) : null })}
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
                    <SelectItem value="Vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea
                id="obs"
                rows={3}
                value={formData.obs || ""}
                onChange={(e: any) => setFormData({ ...formData, obs: e.target.value })}
                className="bg-input border-border"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground">
              {editingSeguro ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}