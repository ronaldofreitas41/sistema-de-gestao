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
import { Users, Plus, Search, Edit, Trash2, Menu, X, User, MapPin, Phone, Mail, Building, CreditCard } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Parceiro } from "@/lib/types";
import { deleteRegistro } from "@/lib/utils";
import { PageSizeSelect, PaginationControls, paginate } from "@/components/ui/pagination";

export function Parceiros() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParceiro, setEditingParceiro] = useState<Parceiro | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  async function fetchParceiros() {
    try {
      const res = await fetch("/api/parceiros");
      const responseData = await res.json();
      setParceiros(Array.isArray(responseData) ? responseData : Array.isArray(responseData?.data) ? responseData.data : []);
    } catch (error) {
      console.error("Erro ao carregar parceiros:", error);
    }
  }

  useEffect(() => {
    fetchParceiros();
  }, []);

  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    observacoes: "",
    pix: "",
  });

  const filteredParceiros = parceiros.filter((p) => {
    const term = search.toLowerCase();
    return (
      (p.nome?.toLowerCase() || "").includes(term) ||
      (p.cnpj?.toLowerCase() || "").includes(term) ||
      (p.email?.toLowerCase() || "").includes(term) ||
      (p.cidade?.toLowerCase() || "").includes(term) ||
      (p.pix?.toLowerCase() || "").includes(term)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const paginatedParceiros = paginate(filteredParceiros, page, pageSize);

  const openNewParceiro = () => {
    setEditingParceiro(null);
    setFormData({
      nome: "",
      cnpj: "",
      email: "",
      telefone: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      observacoes: "",
      pix: "",
    });
    setDialogOpen(true);
  };

  const openEditParceiro = (parceiro: Parceiro) => {
    setEditingParceiro(parceiro);
    setFormData({
      nome: parceiro.nome || "",
      cnpj: parceiro.cnpj || "",
      email: parceiro.email || "",
      telefone: parceiro.telefone || "",
      endereco: parceiro.endereco || "",
      cidade: parceiro.cidade || "",
      estado: parceiro.estado || "",
      cep: parceiro.cep || "",
      observacoes: parceiro.observacoes || "",
      pix: parceiro.pix || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...formData };

    if (editingParceiro) {
      await fetch(`/api/parceiros/${editingParceiro.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/parceiros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await fetchParceiros();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string | number) => {
    if (deletingId !== null) return;
    setDeletingId(id);
    try {
      await deleteRegistro(`/api/parceiros/${id}`);
      setParceiros((prev) => prev.filter((p) => p.id !== id));
      await fetchParceiros();
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
              Parceiros
            </h1>
          </div>

          <Button
            onClick={openNewParceiro}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Parceiro
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
                    placeholder="Buscar por nome, CNPJ, e-mail, cidade ou PIX..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-input border-border"
                  />
                </div>
                <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
              </div>
            </CardContent>
          </Card>

          {/* Parceiros Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Lista de Parceiros ({filteredParceiros.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Nome</TableHead>
                      <TableHead className="text-muted-foreground">CNPJ</TableHead>
                      <TableHead className="text-muted-foreground">Contato</TableHead>
                      <TableHead className="text-muted-foreground">Cidade/UF</TableHead>
                      <TableHead className="text-muted-foreground">PIX</TableHead>
                      <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedParceiros.map((parceiro) => (
                      <TableRow key={parceiro.id} className="border-border">
                        <TableCell className="font-medium text-foreground">
                          {parceiro.nome}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {parceiro.cnpj || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{parceiro.email}</div>
                          <div className="text-muted-foreground/70">{parceiro.telefone}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {parceiro.cidade ? `${parceiro.cidade} - ${parceiro.estado}` : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {parceiro.pix || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-100"
                              onClick={() => openEditParceiro(parceiro)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-100"
                              disabled={deletingId !== null}
                              onClick={() => handleDelete(parceiro.id)}
                            >
                              {deletingId === parceiro.id && <span className="absolute bottom-0 left-1 h-0.5 w-6 animate-pulse bg-current" />}
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
                total={filteredParceiros.length}
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
              {editingParceiro ? "Editar Parceiro" : "Novo Parceiro"}
            </DialogTitle>
            <DialogDescription>
              {editingParceiro
                ? "Edite as informações do parceiro cadastrado."
                : "Preencha os campos para cadastrar um novo parceiro."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-foreground">
                Nome / Razão Social
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  className="pl-9 bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj" className="text-foreground">
                  CNPJ
                </Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) =>
                    setFormData({ ...formData, cnpj: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
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
                      setFormData({ ...formData, telefone: e.target.value })
                    }
                    className="pl-9 bg-input border-border"
                  />
                </div>
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

            <div className="space-y-2">
              <Label htmlFor="pix" className="text-foreground">
                Chave PIX
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

            <div className="space-y-2">
              <Label htmlFor="endereco" className="text-foreground">
                Endereço
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) =>
                    setFormData({ ...formData, endereco: e.target.value })
                  }
                  className="pl-9 bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-2">
                <Label htmlFor="cep" className="text-foreground">
                  CEP
                </Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) =>
                    setFormData({ ...formData, cep: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
              <div className="col-span-1 space-y-2">
                <Label htmlFor="cidade" className="text-foreground">
                  Cidade
                </Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) =>
                    setFormData({ ...formData, cidade: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
              <div className="col-span-1 space-y-2">
                <Label htmlFor="estado" className="text-foreground">
                  Estado (UF)
                </Label>
                <Input
                  id="estado"
                  maxLength={2}
                  value={formData.estado}
                  onChange={(e) =>
                    setFormData({ ...formData, estado: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
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
              {editingParceiro ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}