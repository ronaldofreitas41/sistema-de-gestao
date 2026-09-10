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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Eye,
  Menu,
  X,
  FileSpreadsheet,
  FileText,
  Trash2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { NotaFiscalEntrada, ItemNotaFiscal, Despesa } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function NFEntradaComponent() {
  const [notas, setNotas] = useState<NotaFiscalEntrada[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNota, setSelectedNota] = useState<NotaFiscalEntrada | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState<Partial<NotaFiscalEntrada>>({
    numero_nf: "",
    data_emissao: new Date().toISOString().split("T")[0],
    fornecedor: "",
    cnpj: "",
    valor: 0,
    vencimento: new Date().toISOString().split("T")[0],
    contas_pagar: true,
    status: "pendente",
    observacao: "",
    items: [],
  });

  // Item temporário para inclusão no form
  const [newItem, setNewItem] = useState<ItemNotaFiscal>({
    id: "",
    descicao: "",
    quantidade: 1,
    valor: 0,
  });

  async function fetchNotas() {
    try {
      const res = await fetch("/api/nfs");
      const data = await res.json();
      setNotas(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.error("Erro ao carregar notas fiscais:", error);
    }
  }

  useEffect(() => {
    fetchNotas();
  }, []);

  const filteredNotas = notas.filter((n) => {
    const term = search.toLowerCase();
    return (
      (n.numero_nf?.toLowerCase() || "").includes(term) ||
      (n.fornecedor?.toLowerCase() || "").includes(term) ||
      (n.cnpj?.toLowerCase() || "").includes(term) ||
      (n.status?.toLowerCase() || "").includes(term)
    );
  });

  // Métricas
  const totalNotas = filteredNotas.length;
  const valorTotalGeral = filteredNotas.reduce((acc, n) => acc + (n.valor || 0), 0);
  const pendentesCount = filteredNotas.filter((n) => n.status === "pendente").length;

  const openNewNota = () => {
    setFormData({
      numero_nf: "",
      data_emissao: new Date().toISOString().split("T")[0],
      fornecedor: "",
      cnpj: "",
      valor: 0,
      vencimento: new Date().toISOString().split("T")[0],
      contas_pagar: true,
      status: "pendente",
      observacao: "",
      items: [],
    });
    setDialogOpen(true);
  };

  const handleAddItem = () => {
    if (!newItem.descicao) return;
    const itemToAdd = {
      ...newItem,
      id: "item_" + Math.random().toString(36).substring(2, 9),
    };
    const updatedItems = [...(formData.items || []), itemToAdd];
    const newTotal = updatedItems.reduce((acc, item) => acc + item.quantidade * item.valor, 0);

    setFormData({
      ...formData,
      items: updatedItems,
      valor: newTotal,
    });

    setNewItem({ id: "", descicao: "", quantidade: 1, valor: 0 });
  };

  const handleRemoveItem = (id: string) => {
    const updatedItems = (formData.items || []).filter((i) => i.id !== id);
    const newTotal = updatedItems.reduce((acc, item) => acc + item.quantidade * item.valor, 0);
    setFormData({ ...formData, items: updatedItems, valor: newTotal });
  };

  const handleSave = async () => {
    const nfId = "nf_" + Math.random().toString(36).substring(2, 9);
    const nowIso = new Date().toISOString();

    const payloadNF = {
      ...formData,
      id: nfId,
    };

    // 1. Salva a Nota Fiscal em /api/nfs
    await fetch("/api/nfs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadNF),
    });

    // 2. Salva os Itens da Nota Fiscal em /api/nf-itens
    if (formData.items && formData.items.length > 0) {
      await fetch("/api/nf-itens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nota_fiscal_id: nfId,
          items: formData.items,
        }),
      });
    }

    // 3. Se contas_pagar for TRUE, lança automaticamente na tabela de despesas (/api/despesas)
    if (formData.contas_pagar) {
      const payloadDespesa: Partial<Despesa> = {
        id: "desp_" + Math.random().toString(36).substring(2, 9),
        descricao: `NF-e Entrada Nº ${formData.numero_nf} - ${formData.fornecedor}`,
        categoria: "Compra de Materiais / Estoque",
        fornecedor: formData.fornecedor || "",
        data_competencia: formData.data_emissao || new Date().toISOString().split("T")[0],
        data_vencimento: formData.vencimento || formData.data_emissao || new Date().toISOString().split("T")[0],
        data_pagamento: null,
        valor: String(formData.valor || 0),
        status_disp: "pendente",
        observacoes: `Lançamento automático via NF Nº ${formData.numero_nf}. Obs: ${formData.observacao || "Sem observações"}`,
        criado_em: nowIso,
        atualizado_em: nowIso,
        conta_banco_id: null,
        conta_banco: null,
        placa: null,
        antigo: false,
        num_desp: formData.numero_nf || null,
      };

      await fetch("/api/despesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadDespesa),
      });
    }

    await fetchNotas();
    setDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-gray-800 dark:bg-background dark:text-foreground">
      {/* Sidebar Desktop */}
      <div className="fixed inset-y-0 left-0 z-40 hidden md:flex">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>

      {/* Sidebar Mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
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

      {/* Área Principal */}
      <div className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}>
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
                Notas Fiscais de Entrada
              </h1>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">
                Entrada de materiais e gestão de NF-e
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden text-xs text-gray-600 sm:flex border-gray-300">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Relatório
            </Button>
            <Button onClick={openNewNota} size="sm" className="bg-[#c00a27] text-white hover:bg-[#a00820] font-semibold">
              <Plus className="h-4 w-4 mr-1" /> Nova NF
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-5 p-4 sm:p-6 lg:p-8">
          {/* Métricas (KPIs) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-t-4 border-t-blue-500 border-x-0 border-b-0 shadow-sm bg-white dark:bg-card">
              <CardContent className="p-4">
                <span className="text-[11px] font-extrabold uppercase text-gray-500 dark:text-muted-foreground tracking-wider">
                  TOTAL NOTAS
                </span>
                <div className="text-3xl font-extrabold text-blue-600 mt-1">{totalNotas}</div>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-amber-500 border-x-0 border-b-0 shadow-sm bg-white dark:bg-card">
              <CardContent className="p-4">
                <span className="text-[11px] font-extrabold uppercase text-gray-500 dark:text-muted-foreground tracking-wider">
                  NOTAS PENDENTES
                </span>
                <div className="text-3xl font-extrabold text-amber-600 mt-1">{pendentesCount}</div>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-emerald-500 border-x-0 border-b-0 shadow-sm bg-white dark:bg-card">
              <CardContent className="p-4">
                <span className="text-[11px] font-extrabold uppercase text-gray-500 dark:text-muted-foreground tracking-wider">
                  VALOR TOTAL
                </span>
                <div className="text-3xl font-extrabold text-emerald-600 mt-1">
                  {formatCurrency(valorTotalGeral)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Principal */}
          <Card className="shadow-sm border-gray-200 bg-white dark:bg-card dark:border-border">
            <CardContent className="p-4 space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                <Input
                  placeholder="BUSCAR POR Nº NF, FORNECEDOR, CNPJ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs uppercase placeholder:text-gray-400 bg-gray-50/50 border-gray-200 dark:bg-input dark:border-border"
                />
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 hover:bg-transparent dark:border-border">
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        Nº NF
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        EMISSÃO
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        FORNECEDOR
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        CNPJ
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        QTD ITENS
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        VALOR TOTAL
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        STATUS
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-2 text-right">
                        AÇÕES
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-gray-400 text-xs">
                          Nenhuma nota fiscal encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNotas.map((nota) => (
                        <TableRow
                          key={nota.id}
                          className="border-b border-gray-100 hover:bg-gray-50/80 dark:border-border dark:hover:bg-muted/50 text-xs"
                        >
                          <TableCell className="font-mono font-bold text-gray-900 dark:text-foreground py-3">
                            {nota.numero_nf}
                          </TableCell>
                          <TableCell className="text-gray-500">{nota.data_emissao}</TableCell>
                          <TableCell className="font-semibold text-gray-800 dark:text-foreground">
                            {nota.fornecedor}
                          </TableCell>
                          <TableCell className="text-gray-500 font-mono">{nota.cnpj}</TableCell>
                          <TableCell className="text-gray-600 font-bold">{nota.items?.length || 0}</TableCell>
                          <TableCell className="text-emerald-600 font-bold">
                            {formatCurrency(nota.valor)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                nota.status === "pago"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {nota.status.toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                              onClick={() => {
                                setSelectedNota(nota);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modal Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detalhes Nota Fiscal nº {selectedNota?.numero_nf}
            </DialogTitle>
          </DialogHeader>

          {selectedNota && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block">Fornecedor:</span>
                  <strong>{selectedNota.fornecedor}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">CNPJ:</span>
                  <strong className="font-mono">{selectedNota.cnpj}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Data Emissão:</span>
                  <strong>{selectedNota.data_emissao}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Vencimento:</span>
                  <strong>{selectedNota.vencimento || "-"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Gerou Contas a Pagar:</span>
                  <strong>{selectedNota.contas_pagar ? "Sim (Lançado em Despesas)" : "Não"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Observação:</span>
                  <strong>{selectedNota.observacao || "-"}</strong>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs mb-2">Itens Inclusos</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="py-1">Descrição</TableHead>
                        <TableHead className="py-1 text-center">Qtd</TableHead>
                        <TableHead className="py-1 text-right">Valor Unit.</TableHead>
                        <TableHead className="py-1 text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedNota.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="py-2 font-medium">{item.descicao}</TableCell>
                          <TableCell className="py-2 text-center">{item.quantidade}</TableCell>
                          <TableCell className="py-2 text-right">{formatCurrency(item.valor)}</TableCell>
                          <TableCell className="py-2 text-right font-bold">
                            {formatCurrency(item.quantidade * item.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t font-bold text-sm">
                <span>Valor Total:</span>
                <span className="text-emerald-600">{formatCurrency(selectedNota.valor)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Cadastro de Nova NF */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançar Nota Fiscal de Entrada</DialogTitle>
            <DialogDescription>Preencha os dados principais e insira os itens da nota.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Nº Nota Fiscal</Label>
                <Input
                  value={formData.numero_nf}
                  onChange={(e) => setFormData({ ...formData, numero_nf: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Data Emissão</Label>
                <Input
                  type="date"
                  value={formData.data_emissao}
                  onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={formData.vencimento}
                  onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fornecedor</Label>
                <Input
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>CNPJ</Label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>
            </div>

            {/* Checkbox para Contas a Pagar */}
            <div className="flex items-center space-x-2 bg-muted/40 p-3 rounded-lg border">
              <Checkbox
                id="contas_pagar"
                checked={formData.contas_pagar}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, contas_pagar: !!checked })
                }
              />
              <div className="grid gap-1 leading-none">
                <label
                  htmlFor="contas_pagar"
                  className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Lançar automaticamente em Contas a Pagar (Despesas)
                </label>
                <p className="text-[10px] text-muted-foreground">
                  Cria um registro em despesas pendentes com vencimento em {formData.vencimento || "data especificada"}.
                </p>
              </div>
            </div>

            {/* Inclusão de Itens */}
            <div className="border p-3 rounded-lg bg-muted/20 space-y-3">
              <span className="font-bold block">Adicionar Item</span>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2">
                  <Input
                    placeholder="Descrição do Item"
                    value={newItem.descicao}
                    onChange={(e) => setNewItem({ ...newItem, descicao: e.target.value })}
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Qtd"
                  value={newItem.quantidade}
                  onChange={(e) => setNewItem({ ...newItem, quantidade: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  placeholder="Valor"
                  value={newItem.valor}
                  onChange={(e) => setNewItem({ ...newItem, valor: Number(e.target.value) })}
                />
              </div>
              <Button type="button" onClick={handleAddItem} variant="outline" size="sm" className="w-full">
                <Plus className="h-3.5 w-3.5 mr-1" /> Incluir Item
              </Button>
            </div>

            {/* Tabela de itens adicionados */}
            {formData.items && formData.items.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-1">Descrição</TableHead>
                      <TableHead className="py-1 text-center">Qtd</TableHead>
                      <TableHead className="py-1 text-right">Valor</TableHead>
                      <TableHead className="py-1 text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="py-1">{item.descicao}</TableCell>
                        <TableCell className="py-1 text-center">{item.quantidade}</TableCell>
                        <TableCell className="py-1 text-right">{formatCurrency(item.valor)}</TableCell>
                        <TableCell className="py-1 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-rose-600"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="space-y-1">
              <Label>Observação</Label>
              <Input
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-[#c00a27] text-white hover:bg-[#a00820]">
              Salvar Nota Fiscal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}