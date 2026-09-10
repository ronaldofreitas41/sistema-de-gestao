"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Edit,
  Menu,
  Plus,
  Search,
  Trash2,
  X,
  UserRound,
  Phone,
  BriefcaseBusiness,
  ShieldCheck,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { formatCurrency, formatarTelefone, formatarCPF} from "@/lib/utils";
import type { Funcionario } from "@/lib/types";

type FuncionarioForm = Omit<Funcionario, "id">;

const criarFormularioVazio = (): FuncionarioForm => ({
  nome: "",
  cpf: "",
  rg: "",
  cnh: "",
  cnh_validade: "",
  endereco: "",
  cargo: "",
  telefone: "",
  nascimento: "",
  emergencia_nome: "",
  emergencia_tel: "",
  clt_num: "",
  pis: "",
  admissao: "",
  salario: 0,
  beneficio: 0,
  seguro_valor: 0,
  seguro_vig: "",
  seguro_seguradora: "",
  fotos: null,
  arqs: null,
      observacao: "",
});


function valorNumerico(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numero = Number(value);

  return Number.isFinite(numero) ? numero : 0;
}

function formatarDataInput(value?: string | null) {
  if (!value) return "";

  return value.includes("T") ? value.slice(0, 10) : value.slice(0, 10);
}

export function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] =
    useState<Funcionario | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FuncionarioForm>(
    criarFormularioVazio(),
  );

  async function fetchFuncionarios() {
    try {
      setLoading(true);

      const response = await fetch("/api/funcionarios", {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar funcionários.");
      }

      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setFuncionarios(lista);
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Erro ao carregar funcionários.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFuncionarios();
  }, []);

  const funcionariosFiltrados = useMemo(() => {
    const termo = search.trim().toLowerCase();

    if (!termo) {
      return funcionarios;
    }

    return funcionarios.filter((funcionario) => {
      return (
        funcionario.nome?.toLowerCase().includes(termo) ||
        funcionario.cpf?.toLowerCase().includes(termo) ||
        funcionario.cnh?.toLowerCase().includes(termo) ||
        funcionario.cargo?.toLowerCase().includes(termo) ||
        funcionario.telefone?.toLowerCase().includes(termo)
      );
    });
  }, [funcionarios, search]);

  const totais = useMemo(() => {
    const folha = funcionarios.reduce(
      (total, funcionario) => total + valorNumerico(funcionario.salario),
      0,
    );

    const beneficios = funcionarios.reduce(
      (total, funcionario) => total + valorNumerico(funcionario.beneficio),
      0,
    );

    const seguros = funcionarios.reduce(
      (total, funcionario) => total + valorNumerico(funcionario.seguro_valor),
      0,
    );

    return {
      quantidade: funcionarios.length,
      folha,
      beneficios,
      seguros,
    };
  }, [funcionarios]);

  function openNew() {
    setEditingFuncionario(null);
    setFormData(criarFormularioVazio());
    setDialogOpen(true);
  }

  function openEdit(funcionario: Funcionario) {
    setEditingFuncionario(funcionario);
    setFormData({
      nome: funcionario.nome || "",
      cpf: funcionario.cpf || "",
      rg: funcionario.rg || "",
      cnh: funcionario.cnh || "",
      cnh_validade: formatarDataInput(funcionario.cnh_validade),
      endereco: funcionario.endereco || "",
      cargo: funcionario.cargo || "",
      telefone: funcionario.telefone || "",
      nascimento: formatarDataInput(funcionario.nascimento),
      emergencia_nome: funcionario.emergencia_nome || "",
      emergencia_tel: funcionario.emergencia_tel || "",
      clt_num: funcionario.clt_num || "",
      pis: funcionario.pis || "",
      admissao: formatarDataInput(funcionario.admissao),
      salario: valorNumerico(funcionario.salario),
      beneficio: valorNumerico(funcionario.beneficio),
      seguro_valor: valorNumerico(funcionario.seguro_valor),
      seguro_vig: formatarDataInput(funcionario.seguro_vig),
      seguro_seguradora: funcionario.seguro_seguradora || "",
      fotos: funcionario.fotos ?? null,
      arqs: funcionario.arqs ?? null,
      observacao: funcionario.observacao || "",
    });
    setDialogOpen(true);
  }
  async function handleSave() {
    if (!formData.nome.trim()) {
      alert("Informe o nome do funcionário.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...formData,
        nome: formData.nome.trim(),
        salario: valorNumerico(formData.salario),
        beneficio: valorNumerico(formData.beneficio),
        seguro_valor: valorNumerico(formData.seguro_valor),
      };
      const url = editingFuncionario
        ? `/api/funcionarios/${editingFuncionario.id}`
        : "/api/funcionarios";
      const method = editingFuncionario ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.error || "Não foi possível salvar o funcionário.",
        );
      }
      await fetchFuncionarios();
      setDialogOpen(false);
      setEditingFuncionario(null);
      setFormData(criarFormularioVazio());
    } catch (error) {
      console.error("Erro ao salvar funcionário:", error);
      alert(
        error instanceof Error ? error.message : "Erro ao salvar funcionário.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function handleDelete(id: number | string) {
    const confirmar = window.confirm(
      "Deseja realmente excluir este funcionário?",
    );
    if (!confirmar) {
      return;
    }
    try {
      const response = await fetch(`/api/funcionarios/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.error || "Não foi possível excluir o funcionário.",
        );
      }
      setFuncionarios((prev) =>
        prev.filter((funcionario) => String(funcionario.id) !== String(id)),
      );
    } catch (error) {
      console.error("Erro ao excluir funcionário:", error);
      alert(
        error instanceof Error ? error.message : "Erro ao excluir funcionário.",
      );
    }
  }
  return (
    <div className="min-h-screen bg-[#f4f6f9] text-foreground dark:bg-background">
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
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl border border-border bg-card p-2 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="whitespace-nowrap text-lg font-bold text-foreground">
              Funcionários
            </h1>
          </div>

        </header>
        <main className="w-full space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Funcionários</p>
            </div>
            <Button
              onClick={openNew}
              className="h-9 rounded-md bg-red-600 text-sm font-bold text-white hover:bg-red-700"
            >
              <Plus className="mr-1 h-4 w-4" />
              Novo Funcionário
            </Button>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="BUSCAR POR NOME, CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 border-border bg-card pl-9 text-xs"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border border-t-2 border-t-blue-500 bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Funcionários
                  </p>
                  <p className="mt-1 text-2xl font-black text-blue-600">
                    {totais.quantidade}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    cadastrados
                  </p>
                </div>
                <UserRound className="h-7 w-7 text-blue-500/40" />
              </div>
            </div>
            <div className="rounded-lg border border-border border-t-2 border-t-emerald-500 bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Folha Salarial
                  </p>
                  <p className="mt-1 text-2xl font-black text-emerald-600">
                    {formatCurrency(totais.folha)}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    salários
                  </p>
                </div>
                <BriefcaseBusiness className="h-7 w-7 text-emerald-500/40" />
              </div>
            </div>
            <div className="rounded-lg border border-border border-t-2 border-t-amber-500 bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Benefícios
                  </p>
                  <p className="mt-1 text-2xl font-black text-amber-600">
                    {formatCurrency(totais.beneficios)}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    benefícios
                  </p>
                </div>
                <Phone className="h-7 w-7 text-amber-500/40" />
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_100px] gap-2 border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <div>Nome</div>
              <div>CPF</div>
              <div>CNH</div>
              <div>Telefone</div>
              <div>Salário</div>
              <div>Ações</div>
            </div>
            {loading && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Carregando funcionários...
              </div>
            )}
            {!loading && funcionariosFiltrados.length === 0 && (
              <div className="py-12 text-center">
                <UserRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />

                <p className="text-sm font-medium text-muted-foreground">
                  Nenhum funcionário encontrado.
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Cadastre um novo funcionário ou altere a busca.
                </p>
              </div>
            )}
            {!loading &&
              funcionariosFiltrados.map((funcionario) => (
                <div
                  key={funcionario.id}
                  className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_100px] items-center gap-2 border-b border-border px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-muted/20"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {funcionario.nome}
                    </span>

                    {funcionario.cargo && (
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                        {funcionario.cargo}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {funcionario.cpf || "-"}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {funcionario.cnh || "-"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {funcionario.telefone || "-"}
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {formatCurrency(valorNumerico(funcionario.salario))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(funcionario)}
                      title="Editar"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(funcionario.id)}
                      title="Excluir"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:border-red-900 dark:bg-red-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <UserRound className="h-5 w-5 text-primary" />

              {editingFuncionario ? "Editar Funcionário" : "Novo Funcionário"}
            </DialogTitle>

            <DialogDescription>
              Preencha os dados cadastrais do funcionário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <section className="space-y-3">
              <div className="border-b border-border pb-2">
                <h3 className="text-sm font-bold text-foreground">
                  Dados pessoais
                </h3>

                <p className="text-xs text-muted-foreground">
                  Informações básicas do funcionário
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Nome *</Label>

                  <Input
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nome: e.target.value,
                      })
                    }
                    placeholder="Nome completo"
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>CPF</Label>

                  <Input
                    value={formData.cpf || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cpf: formatarCPF(e.target.value),
                      })
                    }
                    placeholder="000.000.000-00"
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>RG</Label>

                  <Input
                    value={formData.rg || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rg: e.target.value,
                      })
                    }
                    placeholder="RG"
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>CNH</Label>

                  <Input
                    value={formData.cnh || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cnh: e.target.value,
                      })
                    }
                    placeholder="Número da CNH"
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Validade CNH</Label>

                  <Input
                    type="date"
                    value={formData.cnh_validade || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cnh_validade: e.target.value,
                      })
                    }
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Data de nascimento</Label>

                  <Input
                    type="date"
                    value={formData.nascimento || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nascimento: e.target.value,
                      })
                    }
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Telefone</Label>

                  <Input
                    value={formData.telefone || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        telefone: formatarTelefone(e.target.value),
                      })
                    }
                    placeholder="(31) 99999-9999"
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label>Endereço</Label>

                  <Input
                    value={formData.endereco || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endereco: e.target.value,
                      })
                    }
                    placeholder="Endereço completo"
                    className="bg-input"
                  />
                </div>
              </div>
            </section>
            <section className="space-y-3">
              <div className="border-b border-border pb-2">
                <h3 className="text-sm font-bold text-foreground">
                  Dados profissionais
                </h3>

                <p className="text-xs text-muted-foreground">
                  Informações trabalhistas
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Cargo</Label>

                  <Input
                    value={formData.cargo || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cargo: e.target.value,
                      })
                    }
                    placeholder="Cargo"
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Data de admissão</Label>

                  <Input
                    type="date"
                    value={formData.admissao || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        admissao: e.target.value,
                      })
                    }
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>CLT / Registro</Label>

                  <Input
                    value={formData.clt_num || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        clt_num: e.target.value,
                      })
                    }
                    placeholder="Número"
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>PIS</Label>

                  <Input
                    value={formData.pis || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pis: e.target.value,
                      })
                    }
                    placeholder="PIS"
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Salário</Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salario}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salario: Number(e.target.value),
                      })
                    }
                    placeholder="0,00"
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Benefício</Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.beneficio}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        beneficio: Number(e.target.value),
                      })
                    }
                    placeholder="0,00"
                    className="bg-input"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="border-b border-border pb-2">
                <h3 className="text-sm font-bold text-foreground">
                  Contato de emergência
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nome</Label>

                  <Input
                    value={formData.emergencia_nome || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencia_nome: e.target.value,
                      })
                    }
                    placeholder="Nome do contato"
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Telefone</Label>

                  <Input
                    value={formData.emergencia_tel || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencia_tel: formatarTelefone(e.target.value),
                      })
                    }
                    placeholder="(31) 99999-9999"
                    className="bg-input"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="border-b border-border pb-2">
                <h3 className="text-sm font-bold text-foreground">Seguro</h3>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Valor</Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.seguro_valor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        seguro_valor: Number(e.target.value),
                      })
                    }
                    placeholder="0,00"
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Vigência</Label>

                  <Input
                    type="date"
                    value={formData.seguro_vig || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        seguro_vig: e.target.value,
                      })
                    }
                    className="bg-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Seguradora</Label>

                  <Input
                    value={formData.seguro_seguradora || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        seguro_seguradora: e.target.value,
                      })
                    }
                    placeholder="Seguradora"
                    className="bg-input"
                  />
                </div>
              </div>
            </section>
            <section className="space-y-1">
              <Label>Observação</Label>

              <textarea
                rows={3}
                value={formData.observacao || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    observacao: e.target.value,
                  })
                }
                placeholder="Observações..."
                className="w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </section>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground"
            >
              {saving
                ? "Salvando..."
                : editingFuncionario
                  ? "Salvar alterações"
                  : "Cadastrar Funcionário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
