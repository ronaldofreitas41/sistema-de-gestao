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
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Menu,
  X,
  User,
  MapPin,
  Mail,
  Building,
  Calendar,
  DollarSign,
  Truck,
  Download,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Proposta } from "@/lib/types";
import { deleteRegistro } from "@/lib/utils";
import {
  PageSizeSelect,
  PaginationControls,
  paginate,
} from "@/components/ui/pagination";
import { generatePropostaPDF } from "@/lib/pdf/pdfProposta";


const initialFormData: Omit<Proposta, "id"> = {
  empresaId: "",
  data: new Date().toISOString().split("T")[0],
  validade: "",
  contratante: "",
  obra: "",
  veiculo: "",
  modelo: "",
  ano: "",
  qtd: 1,
  cobrancaModo: "fechado",
  turnoFechado: 1,
  valorFechado: 0,
  km: "0",
  horimetro: "0",
  mostrarKmHr: true,
  linhas: [],
  franquia: "",
  obs: "",
  mobilTipo: "",
  mobilValor: 0,
  duracao: "",
  tempoLocacao: 1,
  multaTipo: "",
  fidelidade: undefined,
  multaPct: undefined,
  resp: "",
  seguro: "",
  ciclo: "",
  pagamento: "",
  criadoEm: "",
  criadoPor: "",
  numero: "",
  email: "",
  fotos: [],
  aprovada: false,
  ctAssinado: false,
  equipsExtra: [],
  temSeguro: "",
  manutTipo: "",
  incluirTurnos: false,
};

export function Propostas() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProposta, setEditingProposta] = useState<Proposta | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  async function fetchPropostas() {
    try {
      const res = await fetch("/api/propostas");
      const responseData = await res.json();
      setPropostas(
        Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData?.data)
            ? responseData.data
            : [],
      );
    } catch (error) {
      console.error("Erro ao carregar propostas:", error);
    }
  }

  useEffect(() => {
    fetchPropostas();
  }, []);

  const filteredPropostas = propostas.filter((p) => {
    const term = search.toLowerCase();
    return (
      (p.numero?.toLowerCase() || "").includes(term) ||
      (p.contratante?.toLowerCase() || "").includes(term) ||
      (p.obra?.toLowerCase() || "").includes(term) ||
      (p.veiculo?.toLowerCase() || "").includes(term) ||
      (p.modelo?.toLowerCase() || "").includes(term) ||
      (p.email?.toLowerCase() || "").includes(term)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const paginatedPropostas = paginate(filteredPropostas, page, pageSize);

  const openNewProposta = () => {
    setEditingProposta(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const openEditProposta = (proposta: Proposta) => {
    setEditingProposta(proposta);
    setFormData({
      empresaId: proposta.empresaId || "",
      data: proposta.data || "",
      validade: proposta.validade || "",
      contratante: proposta.contratante || "",
      obra: proposta.obra || "",
      veiculo: proposta.veiculo || "",
      modelo: proposta.modelo || "",
      ano: proposta.ano || "",
      qtd: proposta.qtd ?? 1,
      cobrancaModo: proposta.cobrancaModo || "fechado",
      turnoFechado: proposta.turnoFechado ?? 1,
      valorFechado: proposta.valorFechado ?? 0,
      km: proposta.km || "0",
      horimetro: proposta.horimetro || "0",
      mostrarKmHr: proposta.mostrarKmHr ?? true,
      linhas: proposta.linhas || [],
      franquia: proposta.franquia || "",
      obs: proposta.obs || "",
      mobilTipo: proposta.mobilTipo || "",
      mobilValor: proposta.mobilValor ?? 0,
      duracao: proposta.duracao || "",
      tempoLocacao: proposta.tempoLocacao ?? 1,
      multaTipo: proposta.multaTipo || "",
      fidelidade: proposta.fidelidade,
      multaPct: proposta.multaPct,
      resp: proposta.resp || "",
      seguro: proposta.seguro || "",
      ciclo: proposta.ciclo || "",
      pagamento: proposta.pagamento || "",
      criadoEm: proposta.criadoEm || "",
      criadoPor: proposta.criadoPor || "",
      numero: proposta.numero || "",
      email: proposta.email || "",
      fotos: proposta.fotos || [],
      aprovada: proposta.aprovada ?? false,
      ctAssinado: proposta.ctAssinado ?? false,
      equipsExtra: proposta.equipsExtra || [],
      temSeguro: proposta.temSeguro || "",
      manutTipo: proposta.manutTipo || "",
      incluirTurnos: proposta.incluirTurnos ?? false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...formData };

    if (editingProposta) {
      await fetch(`/api/propostas/${editingProposta.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await fetchPropostas();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string | number) => {
    if (deletingId !== null) return;
    setDeletingId(id);
    try {
      await deleteRegistro(`/api/propostas/${id}`);
      setPropostas((prev) => prev.filter((p) => p.id !== id));
      await fetchPropostas();
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
              Propostas
            </h1>
          </div>

          <Button
            onClick={openNewProposta}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Proposta
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
                    placeholder="Buscar por número, contratante, obra, veículo ou modelo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-input border-border"
                  />
                </div>
                <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
              </div>
            </CardContent>
          </Card>

          {/* Propostas Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Lista de Propostas ({filteredPropostas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">
                        Número
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Contratante
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Obra
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Veículo / Modelo
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Data / Validade
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Valor Fechado
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPropostas.map((proposta) => (
                      <TableRow key={proposta.id} className="border-border">
                        <TableCell className="font-mono text-xs font-semibold text-foreground">
                          {proposta.numero || proposta.id}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          <div>{proposta.contratante}</div>
                          <div className="text-xs text-muted-foreground">
                            {proposta.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {proposta.obra || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{proposta.veiculo || "-"}</div>
                          <div className="text-muted-foreground/70">
                            {proposta.modelo}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>Emissão: {proposta.data || "-"}</div>
                          <div>Validade: {proposta.validade || "-"}</div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">
                          {proposta.valorFechado
                            ? `R$ ${Number(
                                proposta.valorFechado,
                              ).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                              onClick={() => generatePropostaPDF(proposta)}
                              title="Gerar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-100"
                              onClick={() => openEditProposta(proposta)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-100"
                              disabled={deletingId !== null}
                              onClick={() => handleDelete(proposta.id)}
                            >
                              {deletingId === proposta.id && (
                                <span className="absolute bottom-0 left-1 h-0.5 w-6 animate-pulse bg-current" />
                              )}
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
                total={filteredPropostas.length}
                onPageChange={setPage}
              />
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modal / Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingProposta ? "Editar Proposta" : "Nova Proposta"}
            </DialogTitle>
            <DialogDescription>
              {editingProposta
                ? "Edite as informações da proposta selecionada."
                : "Preencha os campos abaixo para gerar uma nova proposta."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            {/* Informações da Proposta */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero" className="text-foreground">
                  Número Proposta
                </Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) =>
                    setFormData({ ...formData, numero: e.target.value })
                  }
                  placeholder="Ex: PROP-2080"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data" className="text-foreground">
                  Data
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) =>
                      setFormData({ ...formData, data: e.target.value })
                    }
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="validade" className="text-foreground">
                  Validade
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="validade"
                    type="date"
                    value={formData.validade}
                    onChange={(e) =>
                      setFormData({ ...formData, validade: e.target.value })
                    }
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>
            </div>

            {/* Contratante e E-mail */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contratante" className="text-foreground">
                  Contratante
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contratante"
                    value={formData.contratante}
                    onChange={(e) =>
                      setFormData({ ...formData, contratante: e.target.value })
                    }
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>
            </div>

            {/* Obra */}
            <div className="space-y-2">
              <Label htmlFor="obra" className="text-foreground">
                Obra / Local
              </Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="obra"
                  value={formData.obra}
                  onChange={(e) =>
                    setFormData({ ...formData, obra: e.target.value })
                  }
                  className="pl-9 bg-input border-border"
                />
              </div>
            </div>

            {/* Equipamento / Veículo */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="veiculo" className="text-foreground">
                  Veículo
                </Label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="veiculo"
                    value={formData.veiculo}
                    onChange={(e) =>
                      setFormData({ ...formData, veiculo: e.target.value })
                    }
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo" className="text-foreground">
                  Modelo
                </Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) =>
                    setFormData({ ...formData, modelo: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ano" className="text-foreground">
                  Ano
                </Label>
                <Input
                  id="ano"
                  value={formData.ano}
                  onChange={(e) =>
                    setFormData({ ...formData, ano: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
            </div>

            {/* Valores e Condições */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cobrancaModo" className="text-foreground">
                  Modo Cobrança
                </Label>
                <Input
                  id="cobrancaModo"
                  value={formData.cobrancaModo}
                  onChange={(e) =>
                    setFormData({ ...formData, cobrancaModo: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valorFechado" className="text-foreground">
                  Valor Fechado (R$)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="valorFechado"
                    type="number"
                    value={formData.valorFechado}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        valorFechado: Number(e.target.value),
                      })
                    }
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pagamento" className="text-foreground">
                  Pagamento
                </Label>
                <Input
                  id="pagamento"
                  value={formData.pagamento}
                  onChange={(e) =>
                    setFormData({ ...formData, pagamento: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="obs" className="text-foreground">
                Observações
              </Label>
              <Input
                id="obs"
                value={formData.obs}
                onChange={(e) =>
                  setFormData({ ...formData, obs: e.target.value })
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
              {editingProposta ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
