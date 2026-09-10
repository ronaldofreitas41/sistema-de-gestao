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
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Menu,
  X,
  UserCheck,
  Key,
  Shield,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Permissoes, Usuario } from "@/lib/types";
import { contarPermissoes, normalizarPermissoes } from "@/lib/utils";
import { PermissoesToggles } from "../ui/permissoes-toggles";

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [search, setSearch] = useState("");
  const [perfilFilter, setPerfilFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function PermissoesResumo({
    permissoes,
  }: {
    permissoes: Usuario["permissoes"];
  }) {
    const { ativas, total } = contarPermissoes(permissoes);

    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">
          {ativas}/{total}
        </span>

        <span className="text-xs text-muted-foreground">permissões</span>
      </div>
    );
  }

  async function fetchUsuarios() {
    try {
      const res = await fetch("/api/usuarios");
      const responseData = await res.json();
      setUsuarios(Array.isArray(responseData) ? responseData : Array.isArray(responseData?.data) ? responseData.data : []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  }

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const [formData, setFormData] = useState<{
    nome: string;
    login: string;
    perfil: string;
    permissoes: Permissoes;
    senha: string;
  }>({
    nome: "",
    login: "",
    perfil: "custom",
    permissoes: {},
    senha: "",
  });

  const filteredUsuarios = usuarios.filter((u) => {
    const matchesSearch =
      (u.nome?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (u.login?.toLowerCase() || "").includes(search.toLowerCase());

    const matchesPerfil = perfilFilter === "all" || u.perfil === perfilFilter;

    return matchesSearch && matchesPerfil;
  });

  const openNewUsuario = () => {
    setEditingUsuario(null);
    setFormData({
      nome: "",
      login: "",
      perfil: "OPERADOR",
      permissoes: {},
      senha: "",
    });
    setDialogOpen(true);
  };

  function openEditUsuario(usuario: Usuario) {
    setEditingUsuario(usuario);

    setFormData({
      nome: usuario.nome || "",
      login: usuario.login || "",
      perfil: usuario.perfil || "custom",
      permissoes: normalizarPermissoes(usuario.permissoes),
      senha: "",
    });

    setDialogOpen(true);
  }

const handleSave = async () => {
  try {
    const payload = {
      ...formData,

      // A API recebe permissões como uma string JSON
      permissoes: JSON.stringify(formData.permissoes),
    };

    const url = editingUsuario
      ? `/api/usuarios/${editingUsuario.id}`
      : "/api/usuarios";

    const method = editingUsuario ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.error || "Não foi possível salvar o usuário."
      );
    }

    await fetchUsuarios();

    setDialogOpen(false);
  } catch (error) {
    console.error("Erro ao salvar usuário:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Erro ao salvar usuário."
    );
  }
};

  const handleDelete = async (id: string) => {
    await fetch(`/api/usuarios/${id}`, {
      method: "DELETE",
    });
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    await fetchUsuarios();
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
              Usuários
            </h1>
          </div>

          <Button
            onClick={openNewUsuario}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
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
                    placeholder="Buscar por nome, login ou permissão..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Lista de Usuários ({filteredUsuarios.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">
                        Nome
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Login
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Perfil
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Permissões
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsuarios.map((usuario) => (
                      <TableRow key={usuario.id} className="border-border">
                        <TableCell className="font-medium text-foreground">
                          {usuario.nome || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {usuario.login}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                            {usuario.perfil}
                          </span>
                        </TableCell>
                        <TableCell>
                          <PermissoesResumo permissoes={usuario.permissoes} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditUsuario(usuario)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(usuario.id)}
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
              {editingUsuario ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {editingUsuario
                ? "Edite as informações do usuário existente."
                : "Preencha os campos para cadastrar um novo usuário no sistema."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-foreground">
                Nome Completo
              </Label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

            <div className="space-y-2">
              <Label htmlFor="login" className="text-foreground">
                Login / Usuário
              </Label>
              <Input
                id="login"
                value={formData.login}
                onChange={(e) =>
                  setFormData({ ...formData, login: e.target.value })
                }
                className="bg-input border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="perfil" className="text-foreground">
                  Perfil
                </Label>
                <Select
                  value={formData.perfil}
                  onValueChange={(value) =>
                    setFormData({ ...formData, perfil: value ?? "-" })
                  }
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="GERENTE">GERENTE</SelectItem>
                    <SelectItem value="OPERADOR">OPERADOR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="senha"
                    type="password"
                    placeholder={editingUsuario ? "Manter atual" : ""}
                    value={formData.senha}
                    onChange={(e) =>
                      setFormData({ ...formData, senha: e.target.value })
                    }
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-foreground">
                    Permissões de acesso
                  </Label>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Defina quais funcionalidades o usuário poderá acessar.
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {contarPermissoes(formData.permissoes).ativas}/
                  {contarPermissoes(formData.permissoes).total}
                </span>
              </div>

              <PermissoesToggles
                permissoes={formData.permissoes}
                onChange={(permissoes) =>
                  setFormData((prev) => ({
                    ...prev,
                    permissoes,
                  }))
                }
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
              {editingUsuario ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
