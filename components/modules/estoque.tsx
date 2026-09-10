"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Plus,
  Search,
  Eye,
  Menu,
  X,
  FileSpreadsheet,
  Package,
  DollarSign,
  MapPin,
  FileText,
  AlertTriangle,
  Minus,
  Edit,
  Trash2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Estoque } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function ComponenteEstoque() {
  const [itens, setItens] = useState<Estoque[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Estoque | null>(null);
  const [selectedItem, setSelectedItem] = useState<Estoque | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function fetchEstoque() {
    try {
      const res = await fetch("/api/estoque");
      const responseData = await res.json();
      const data = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.data)
        ? responseData.data
        : [];
      setItens(data);
    } catch (error) {
      console.error("Erro ao carregar estoque:", error);
    }
  }

  useEffect(() => {
    fetchEstoque();
  }, []);

  const [formData, setFormData] = useState<Partial<Estoque>>({
    codigo: "",
    descricao: "",
    categoria: "",
    unidade: "UN",
    quantidade: 0,
    estoque_minimo: 0,
    custo_unitario: 0,
    localizacao: "",
    ativo: true,
    tabela_venda: "",
    margem: 0,
    nf_num: "",
  });

  const filteredItens = itens.filter((i) => {
    const term = search.toLowerCase();
    return (
      (i.codigo?.toLowerCase() || "").includes(term) ||
      (i.descricao?.toLowerCase() || "").includes(term) ||
      (i.categoria?.toLowerCase() || "").includes(term) ||
      (i.localizacao?.toLowerCase() || "").includes(term) ||
      (i.nf_num?.toLowerCase() || "").includes(term)
    );
  });

  // KPIs
  const totalItens = filteredItens.length;
  const estoqueBaixoCount = filteredItens.filter(
    (i) => i.quantidade <= i.estoque_minimo
  ).length;
  const valorTotalEstoque = filteredItens.reduce(
    (acc, i) => acc + (i.quantidade || 0) * (i.custo_unitario || 0),
    0
  );

  const openViewItem = (item: Estoque) => {
    setSelectedItem(item);
    setViewDialogOpen(true);
  };

  const openNewItem = () => {
    setEditingItem(null);
    setFormData({
      codigo: "",
      descricao: "",
      categoria: "",
      unidade: "UN",
      quantidade: 0,
      estoque_minimo: 0,
      custo_unitario: 0,
      localizacao: "",
      ativo: true,
      tabela_venda: "",
      margem: 0,
      nf_num: "",
    });
    setDialogOpen(true);
  };

  const openEditItem = (item: Estoque) => {
    setEditingItem(item);
    setFormData({ ...item });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...formData };

    if (editingItem) {
      await fetch(`/api/estoque/${editingItem.codigo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await fetchEstoque();
    setDialogOpen(false);
  };

  const handleDelete = async (codigo: string) => {
    await fetch(`/api/estoque/${codigo}`, {
      method: "DELETE",
    });
    setItens((prev) => prev.filter((i) => i.codigo !== codigo));
    await fetchEstoque();
  };

  const handleAdjustQuantity = async (item: Estoque, delta: number) => {
    const novaQtd = Math.max(0, item.quantidade + delta);
    const payload = { ...item, quantidade: novaQtd };

    await fetch(`/api/estoque/${item.codigo}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    await fetchEstoque();
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-gray-800 dark:bg-background dark:text-foreground">
      {/* Sidebar Desktop */}
      <div className="fixed inset-y-0 left-0 z-40 hidden md:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>

      {/* Sidebar Mobile */}
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

      {/* Area Principal */}
      <div
        className={`min-h-screen transition-[padding-left] duration-300 ${
          sidebarCollapsed ? "md:pl-18" : "md:pl-65"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-border dark:bg-background/95 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl border border-gray-200 bg-white p-2 md:hidden dark:border-border dark:bg-card"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-foreground">
                Estoque
              </h1>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">
                Produtos, peças e materiais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden text-xs text-gray-600 sm:flex border-gray-300"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Relatório
            </Button>
            <Button
              onClick={openNewItem}
              size="sm"
              className="bg-[#c00a27] text-white hover:bg-[#a00820] font-semibold"
            >
              <Plus className="h-4 w-4 mr-1" />
              Item
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-5 p-4 sm:p-6 lg:p-8">
          {/* Cards de Métricas (KPIs) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Card TOTAL ITENS */}
            <Card className="border-t-4 border-t-blue-500 border-x-0 border-b-0 shadow-sm bg-white dark:bg-card">
              <CardContent className="p-4">
                <span className="text-[11px] font-extrabold uppercase text-gray-500 dark:text-muted-foreground tracking-wider">
                  TOTAL ITENS
                </span>
                <div className="text-3xl font-extrabold text-blue-600 mt-1">
                  {totalItens}
                </div>
              </CardContent>
            </Card>

            {/* Card ESTOQUE BAIXO */}
            <Card className="border-t-4 border-t-amber-500 border-x-0 border-b-0 shadow-sm bg-white dark:bg-card">
              <CardContent className="p-4">
                <span className="text-[11px] font-extrabold uppercase text-gray-500 dark:text-muted-foreground tracking-wider">
                  ESTOQUE BAIXO
                </span>
                <div className="text-3xl font-extrabold text-amber-600 mt-1">
                  {estoqueBaixoCount}
                </div>
              </CardContent>
            </Card>

            {/* Card VALOR TOTAL */}
            <Card className="border-t-4 border-t-emerald-500 border-x-0 border-b-0 shadow-sm bg-white dark:bg-card">
              <CardContent className="p-4">
                <span className="text-[11px] font-extrabold uppercase text-gray-500 dark:text-muted-foreground tracking-wider">
                  VALOR TOTAL
                </span>
                <div className="text-3xl font-extrabold text-emerald-600 mt-1">
                  {formatCurrency(valorTotalEstoque)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barra de Busca e Tabela Principal */}
          <Card className="shadow-sm border-gray-200 bg-white dark:bg-card dark:border-border">
            <CardContent className="p-4 space-y-4">
              {/* Campo de Busca */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                <Input
                  placeholder="BUSCAR POR CÓDIGO, DESCRIÇÃO, CATEGORIA..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs uppercase placeholder:text-gray-400 bg-gray-50/50 border-gray-200 dark:bg-input dark:border-border"
                />
              </div>

              {/* Tabela estilo MH3 */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 hover:bg-transparent dark:border-border">
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        CÓD.
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        DESCRIÇÃO
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        CAT.
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        QTD
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        MÍN
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        UN
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        CUSTO
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        VENDA
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        TOTAL
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        SIT.
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2 text-right">
                        AÇÕES
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-6 text-gray-400 text-xs">
                          Nenhum produto cadastrado no estoque.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItens.map((item) => {
                        const isBaixo = item.quantidade <= item.estoque_minimo;
                        const precoVenda =
                          item.custo_unitario * (1 + (item.margem || 0) / 100);
                        const totalItem = item.quantidade * item.custo_unitario;

                        return (
                          <TableRow
                            key={item.codigo}
                            className="border-b border-gray-100 hover:bg-gray-50/80 dark:border-border dark:hover:bg-muted/50 text-xs"
                          >
                            <TableCell className="font-mono text-gray-500 py-3">
                              {item.codigo}
                            </TableCell>
                            <TableCell className="font-bold text-gray-900 dark:text-foreground">
                              {item.descricao}
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {item.categoria || "-"}
                            </TableCell>
                            <TableCell className="font-bold text-amber-600">
                              {item.quantidade}
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {item.estoque_minimo}
                            </TableCell>
                            <TableCell className="text-gray-500 uppercase">
                              {item.unidade}
                            </TableCell>
                            <TableCell className="text-gray-700 font-medium">
                              {formatCurrency(item.custo_unitario)}
                            </TableCell>
                            <TableCell className="text-purple-600 font-medium">
                              {formatCurrency(precoVenda)}
                            </TableCell>
                            <TableCell className="text-emerald-600 font-semibold">
                              {formatCurrency(totalItem)}
                            </TableCell>
                            <TableCell>
                              {isBaixo ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  Baixo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  OK
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400"
                                  title="Visualizar detalhes"
                                  onClick={() => openViewItem(item)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                  title="Adicionar Qtd"
                                  onClick={() => handleAdjustQuantity(item, 1)}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                  title="Remover Qtd"
                                  onClick={() => handleAdjustQuantity(item, -1)}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400"
                                  title="Editar"
                                  onClick={() => openEditItem(item)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-400"
                                  title="Excluir"
                                  onClick={() => handleDelete(item.codigo)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modal de Visualização Detalhada */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Ficha do Produto — {selectedItem?.codigo}
            </DialogTitle>
            <DialogDescription>
              Detalhes completos de inventário, custos e precificação.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-5 py-2 text-xs">
              {/* Identificação Básica */}
              <div>
                <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5 border-b pb-1 border-border">
                  <FileText className="h-4 w-4 text-primary" /> Identificação e Categoria
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-muted-foreground block">Código:</span>
                    <strong className="text-foreground font-mono text-sm">{selectedItem.codigo}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block">Descrição:</span>
                    <strong className="text-foreground text-sm">{selectedItem.descricao}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Status:</span>
                    <strong className="text-foreground">{selectedItem.ativo ? "Ativo" : "Inativo"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Categoria:</span>
                    <strong className="text-foreground">{selectedItem.categoria || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Unidade Medida:</span>
                    <strong className="text-foreground uppercase">{selectedItem.unidade}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Nº Nota Fiscal:</span>
                    <strong className="text-foreground font-mono">{selectedItem.nf_num || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Localização:</span>
                    <strong className="text-foreground">{selectedItem.localizacao || "-"}</strong>
                  </div>
                </div>
              </div>

              {/* Quantidade e Estoque */}
              <div>
                <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5 border-b pb-1 border-border">
                  <AlertTriangle className="h-4 w-4 text-primary" /> Controle de Quantidades
                </h3>
                <div className="grid grid-cols-3 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-muted-foreground block">Qtd Atual:</span>
                    <strong className="text-amber-600 text-sm font-bold">{selectedItem.quantidade} {selectedItem.unidade}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Estoque Mínimo:</span>
                    <strong className="text-foreground">{selectedItem.estoque_minimo} {selectedItem.unidade}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Situação:</span>
                    <strong className={selectedItem.quantidade <= selectedItem.estoque_minimo ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                      {selectedItem.quantidade <= selectedItem.estoque_minimo ? "Abaixo do Mínimo" : "Estoque Adequado"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Valores e Margens */}
              <div>
                <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5 border-b pb-1 border-border">
                  <DollarSign className="h-4 w-4 text-primary" /> Precificação e Margem
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-muted-foreground block">Custo Unitário:</span>
                    <strong className="text-foreground">{formatCurrency(selectedItem.custo_unitario)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Margem Lucro:</span>
                    <strong className="text-foreground">{selectedItem.margem || 0}%</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Preço Venda Est.:</span>
                    <strong className="text-purple-600 font-bold">
                      {formatCurrency(selectedItem.custo_unitario * (1 + (selectedItem.margem || 0) / 100))}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Valor Total Em Estoque:</span>
                    <strong className="text-emerald-600 font-bold">
                      {formatCurrency(selectedItem.quantidade * selectedItem.custo_unitario)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingItem ? "Editar Item de Estoque" : "Novo Item de Estoque"}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do produto ou material.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  disabled={!!editingItem}
                  value={formData.codigo || ""}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className="bg-input border-border font-mono"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao || ""}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  placeholder="Ex: Pneus, Óleo..."
                  value={formData.categoria || ""}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Input
                  id="unidade"
                  placeholder="UN, KG, LT..."
                  value={formData.unidade || "UN"}
                  onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                  className="bg-input border-border uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="localizacao">Localização</Label>
                <Input
                  id="localizacao"
                  placeholder="Prateleira A1"
                  value={formData.localizacao || ""}
                  onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade Atual</Label>
                <Input
                  id="quantidade"
                  type="number"
                  value={formData.quantidade ?? 0}
                  onChange={(e) => setFormData({ ...formData, quantidade: Number(e.target.value) })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                <Input
                  id="estoque_minimo"
                  type="number"
                  value={formData.estoque_minimo ?? 0}
                  onChange={(e) => setFormData({ ...formData, estoque_minimo: Number(e.target.value) })}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custo_unitario">Custo Unitário (R$)</Label>
                <Input
                  id="custo_unitario"
                  type="number"
                  step="0.01"
                  value={formData.custo_unitario ?? 0}
                  onChange={(e) => setFormData({ ...formData, custo_unitario: Number(e.target.value) })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margem">Margem (%)</Label>
                <Input
                  id="margem"
                  type="number"
                  value={formData.margem ?? 0}
                  onChange={(e) => setFormData({ ...formData, margem: Number(e.target.value) })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nf_num">Nº Nota Fiscal</Label>
                <Input
                  id="nf_num"
                  value={formData.nf_num || ""}
                  onChange={(e) => setFormData({ ...formData, nf_num: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-[#c00a27] text-white hover:bg-[#a00820]">
              {editingItem ? "Salvar Alterações" : "Cadastrar Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}