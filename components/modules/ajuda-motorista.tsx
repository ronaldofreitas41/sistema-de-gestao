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
  Menu,
  X,
  Phone,
  Building,
  DollarSign,
  QrCode,
  Calendar,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Ajuda_Motorista, ContasBancarias, Despesa, Usuario } from "@/lib/types";
import { deleteRegistro, fetchContas, formatCurrency, formatDate, formatPhone, formatarData, getPlacas } from "@/lib/utils";
import {
  PageSizeSelect,
  PaginationControls,
  paginate,
} from "@/components/ui/pagination";

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
  const [contas, setContas] = useState<ContasBancarias[]>([]);
  const [placas, setPlacas] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    fetchContas().then(setContas);
    getPlacas().then(setPlacas);
  }, []);

  useEffect(() => {
    console.log("Contas carregadas:", contas);
  }, [contas]);

  const [formData, setFormData] = useState({
    empresa: "",
    motorista: "",
    telefone: "",
    valor: "",
    data: "",
    agencia: "",
    conta: "",
    contaBancaria: "",
    forma_pagamento: "",
    pix: "",
    observacoes: "",
    placa: "",
    recorrente: false,
    confirma_user: "",
    despesa_id: "",
    conta_banco_id: "",
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

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, pageSize]);

  const paginatedAjudas = paginate(filteredAjudas, page, pageSize);

  const openNewAjuda = () => {
    setEditingAjuda(null);
    setFormData({
      empresa: "",
      motorista: "",
      telefone: "",
      valor: "",
      data: "",
      agencia: "",
      conta: "",
      contaBancaria: "",
      forma_pagamento: "PIX",
      pix: "",
      observacoes: "",
      placa: "",
      recorrente: false,
      confirma_user: usuarioLogado?.nome || usuarioLogado?.login || "",
      despesa_id: "",
      conta_banco_id: "",
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
      data: ajuda.data ? ajuda.data.split("T")[0] : "",
      agencia: ajuda.agencia || "",
      conta: ajuda.conta || "",
      contaBancaria: ajuda.contaBancaria || ajuda.conta || "",
      forma_pagamento: ajuda.forma_pagamento || "PIX",
      pix: ajuda.pix || "",
      observacoes: ajuda.observacoes || "",
      placa: ajuda.placa || "",
      recorrente: ajuda.recorrente ?? false,
      confirma_user: ajuda.confirma_user || "",
      despesa_id: ajuda.despesa_id || "",
      conta_banco_id: ajuda.conta_banco_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      valor: Number(formData.valor) || 0,
      data: formData.data
        ? new Date(formData.data).toISOString()
        : new Date().toISOString(),
    };

    const payloadDespesa = {
      antigo: false,
      categoria: "Ajuda Motorista",
      conta_banco: formData.conta || "",
      conta_banco_id: formData.conta_banco_id || "",
      data_competencia: formData.data
        ? new Date(formData.data).toISOString()
        : new Date().toISOString(),
      data_pagamento: formData.data
        ? new Date(formData.data).toISOString()
        : new Date().toISOString(),
      data_vencimento: formData.data
        ? new Date(formData.data).toISOString()
        : new Date().toISOString(),
      descricao:
        "AJUDA DE CUSTO - " + formData.empresa + " - " + formData.motorista,
      fornecedor: "",
      num_desp: "DP - AC - " + (ajudas.length + 1),
      observacoes: formData.observacoes || "",
      placa: formData.placa || "",
      status_disp: "pago",
      valor: formData.valor || "",
    };

    if (editingAjuda) {
      await fetch(`/api/ajudas-motorista/${editingAjuda.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      const res = await fetch("/api/despesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadDespesa),
      });
      const despesa: Despesa = await res.json();

      await fetch("/api/ajudas-motorista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, despesa_id: despesa.id }),
      });
    }

    await fetchAjudas();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteRegistro(`/api/ajudas-motorista/${id}`);
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
                      <TableHead className="text-muted-foreground">
                        Data
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Motorista / Empresa
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Placa / Contato
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Forma Pagto / PIX
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Valor
                      </TableHead>
                      <TableHead className="text-muted-foreground text-center">
                        Recorrente
                      </TableHead>
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
                <Select
                  value={formData.placa}
                  onValueChange={(val) =>
                    setFormData({ ...formData, placa: val === "nenhuma" ? "" : val })
                  }
                >
                  <SelectTrigger id="placa" className="bg-input border-border">
                    <SelectValue placeholder="Selecione a placa..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Nenhuma</SelectItem>
                    {placas.map((placa) => (
                      <SelectItem key={placa} value={placa}>
                        {placa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contaBancaria" className="text-foreground">
                  Conta Bancária / Agência
                </Label>
                <Select
                  value={formData.conta_banco_id}
                  onValueChange={(value) => {
                    const contaSelecionada = contas.find(
                      (contaBancaria) => contaBancaria.id === value,
                    );

                    setFormData({
                      ...formData,
                      contaBancaria: contaSelecionada?.conta || "",
                      conta: contaSelecionada?.conta || "",
                      agencia: contaSelecionada?.agencia || "",
                      conta_banco_id: contaSelecionada?.id || "",
                    });
                  }}
                >
                  <SelectTrigger id="contaBancaria" className="bg-input border-border">
                    <SelectValue placeholder="Selecione a conta bancária" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((contaBancaria) => (
                      <SelectItem
                        key={contaBancaria.id}
                        value={contaBancaria.id}
                      >
                        {contaBancaria.nome || contaBancaria.banco} - Agência {contaBancaria.agencia} - Conta {contaBancaria.conta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
