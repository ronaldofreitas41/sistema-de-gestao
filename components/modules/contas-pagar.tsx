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
import { Receipt, Plus, Search, Edit, Trash2, FileText, Menu, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Despesa } from "@/lib/types";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function fetchDespesas() {
    try {
      const res = await fetch("/api/despesas");
      const responseData = await res.json();
      setDespesas(responseData.data || responseData || []);
    } catch (error) {
      console.error("Erro ao carregar despesas:", error);
    }
  }

  useEffect(() => {
    fetchDespesas();
  }, []);

  const [formData, setFormData] = useState({
    descricao: "",
    categoria: "",
    fornecedor: "",
    data_competencia: "",
    data_vencimento: "",
    data_pagamento: "",
    valor: "",
    status_disp: "pendente",
    observacoes: "",
    conta_banco_id: "",
    conta_banco: "",
    placa: "",
    antigo: false,
    num_desp: "",
  });

  const filteredDespesas = despesas.filter((d) => {
    const matchesSearch =
      (d.descricao?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (d.num_desp?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (d.fornecedor?.toLowerCase() || "").includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || d.categoria === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const openNewDespesa = () => {
    setEditingDespesa(null);
    setFormData({
      descricao: "",
      categoria: "Geral",
      fornecedor: "",
      data_competencia: "",
      data_vencimento: "",
      data_pagamento: "",
      valor: "",
      status_disp: "pendente",
      observacoes: "",
      conta_banco_id: "",
      conta_banco: "",
      placa: "",
      antigo: false,
      num_desp: "",
    });
    setDialogOpen(true);
  };

  const openEditDespesa = (despesa: Despesa) => {
    setEditingDespesa(despesa);
    setFormData({
      descricao: despesa.descricao || "",
      categoria: despesa.categoria || "Geral",
      fornecedor: despesa.fornecedor || "",
      data_competencia: despesa.data_competencia
        ? despesa.data_competencia.split("T")[0]
        : "",
      data_vencimento: despesa.data_vencimento
        ? despesa.data_vencimento.split("T")[0]
        : "",
      data_pagamento: despesa.data_pagamento
        ? despesa.data_pagamento.split("T")[0]
        : "",
      valor: despesa.valor || "",
      status_disp: despesa.status_disp || "pendente",
      observacoes: despesa.observacoes || "",
      conta_banco_id: despesa.conta_banco_id || "",
      conta_banco: despesa.conta_banco || "",
      placa: despesa.placa || "",
      antigo: despesa.antigo ?? false,
      num_desp: despesa.num_desp || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      valor: formData.valor,
      data_competencia: formData.data_competencia
        ? new Date(formData.data_competencia).toISOString()
        : null,
      data_vencimento: formData.data_vencimento
        ? new Date(formData.data_vencimento).toISOString()
        : null,
      data_pagamento: formData.data_pagamento
        ? new Date(formData.data_pagamento).toISOString()
        : null,
    };

    if (editingDespesa) {
      await fetch(`/api/despesas/${editingDespesa.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/despesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await fetchDespesas();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/despesas/${id}`, {
      method: "DELETE",
    });
    setDespesas((prev) => prev.filter((d) => d.id !== id));
    await fetchDespesas();
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
                  <TableHead className="text-muted-foreground">Nº Desp.</TableHead>
                  <TableHead className="text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-muted-foreground">Categoria</TableHead>
                  <TableHead className="text-muted-foreground">Fornecedor</TableHead>
                  <TableHead className="text-muted-foreground">Vencimento</TableHead>
                  <TableHead className="text-muted-foreground">Pagamento</TableHead>
                  <TableHead className="text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-muted-foreground text-center">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDespesas.map((despesa) => (
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
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          despesa.status_disp === "pago"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                        }`}
                      >
                        {despesa.status_disp}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDespesa(despesa)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(despesa.id)}
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
            <div className="space-y-2">
              <Label htmlFor="num_desp" className="text-foreground">
                Número da Despesa
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="num_desp"
                  value={formData.num_desp}
                  onChange={(e) =>
                    setFormData({ ...formData, num_desp: e.target.value })
                  }
                  className="pl-9 bg-input border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao" className="text-foreground">
                Descrição
              </Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                className="bg-input border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria" className="text-foreground">
                  Categoria
                </Label>
                <Input
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) =>
                    setFormData({ ...formData, categoria: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fornecedor" className="text-foreground">
                  Fornecedor
                </Label>
                <Input
                  id="fornecedor"
                  value={formData.fornecedor}
                  onChange={(e) =>
                    setFormData({ ...formData, fornecedor: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor" className="text-foreground">
                  Valor (R$)
                </Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status_disp" className="text-foreground">
                  Status
                </Label>
                <Select
                  value={formData.status_disp}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status_disp: value ?? "pendente",
                    })
                  }
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_vencimento" className="text-foreground">
                  Vencimento
                </Label>
                <Input
                  id="data_vencimento"
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) =>
                    setFormData({ ...formData, data_vencimento: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_pagamento" className="text-foreground">
                  Data Pagamento
                </Label>
                <Input
                  id="data_pagamento"
                  type="date"
                  value={formData.data_pagamento}
                  onChange={(e) =>
                    setFormData({ ...formData, data_pagamento: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conta_banco" className="text-foreground">
                  Conta Banco
                </Label>
                <Input
                  id="conta_banco"
                  value={formData.conta_banco}
                  onChange={(e) =>
                    setFormData({ ...formData, conta_banco: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placa" className="text-foreground">
                  Placa
                </Label>
                <Input
                  id="placa"
                  value={formData.placa}
                  onChange={(e) =>
                    setFormData({ ...formData, placa: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
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
    </div>
  );
}