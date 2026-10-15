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
import { Truck, Plus, Search, Edit, Trash2, Menu, X, AlertTriangle, Wrench } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Equipamento } from "@/lib/types";
import { deleteRegistro, formatCurrency, formatDate } from "@/lib/utils";
import { chamarApi, mensagemErro } from "@/lib/api-client";
import { PageSizeSelect, PaginationControls, paginate } from "@/components/ui/pagination";
import { SortableTableHead, useSortableData } from "@/components/ui/sortable-table";
import {
  FinanciamentoForm,
  financiamentoInicial,
  payloadFinanciamento,
  type FinanciamentoState,
} from "@/components/ui/financiamento-form";

type Empresa = { id: string | number; nome: string; razao_social?: string | null };

type Implemento = {
  id: string | number;
  numero?: string | null;
  equipamento_id?: string | number | null;
  placa?: string | null;
  marca?: string | null;
  modelo?: string | null;
  ano?: string | null;
  niev?: string | null;
  descricao?: string | null;
  situacao_financeira?: string | null;
  modalidade_financiamento?: string | null;
  banco_financiamento?: string | null;
  tipo_parcela?: string | null;
  quantidade_parcelas?: number | null;
  financiamento_gerado?: boolean;
};

type EquipamentoApi = Equipamento & {
  empresa_id?: string | number | null;
  valor_aquisi__o?: number | string | null;
  modalidade_financiamento?: string | null;
  inmetro_venc?: string | null;
  outros_nome?: string | null;
  outros_venc?: string | null;
  financiamento_gerado?: boolean;
};

type FormVeiculo = {
  empresa_id: string;
  placa: string;
  frota: string;
  tipo: string;
  marca: string;
  modelo: string;
  ano: string;
  renavam: string;
  chassi: string;
  km_atual: string;
  horimetro: string;
  status: string;
  valor_aquisi__o: string;
  data_aquisicao: string;
  cronotacografo_venc: string;
  inmetro_venc: string;
  outros_nome: string;
  outros_venc: string;
  observacoes: string;
};

type FormImplemento = {
  marca: string;
  modelo: string;
  ano: string;
  niev: string;
  descricao: string;
};

const veiculoVazio: FormVeiculo = {
  empresa_id: "",
  placa: "",
  frota: "",
  tipo: "",
  marca: "",
  modelo: "",
  ano: "",
  renavam: "",
  chassi: "",
  km_atual: "",
  horimetro: "",
  status: "Ativo",
  valor_aquisi__o: "",
  data_aquisicao: "",
  cronotacografo_venc: "",
  inmetro_venc: "",
  outros_nome: "",
  outros_venc: "",
  observacoes: "",
};

const implementoVazio: FormImplemento = { marca: "", modelo: "", ano: "", niev: "", descricao: "" };

const dataInput = (valor?: string | null) => (valor ? valor.slice(0, 10) : "");

/** Dias até a data (negativo = vencido). */
function diasPara(valor?: string | null) {
  if (!valor) return null;
  const alvo = new Date(`${valor.slice(0, 10)}T00:00:00`);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

function alertasDocumentos(eq: EquipamentoApi) {
  const itens: [string, string | null | undefined][] = [
    ["Cronotacógrafo", eq.cronotacografo_venc],
    ["Inmetro", eq.inmetro_venc],
    [eq.outros_nome || "Outros", eq.outros_venc],
  ];
  return itens
    .map(([nome, data]) => ({ nome, dias: diasPara(data) }))
    .filter((i): i is { nome: string; dias: number } => i.dias !== null && i.dias <= 10);
}

export function Equipamentos() {
  const [equipamentos, setEquipamentos] = useState<EquipamentoApi[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [implementos, setImplementos] = useState<Implemento[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EquipamentoApi | null>(null);
  const [form, setForm] = useState<FormVeiculo>(veiculoVazio);
  const [financeiro, setFinanceiro] = useState<FinanciamentoState>(financiamentoInicial());
  const [salvando, setSalvando] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  // Implemento em edição dentro do veículo
  const [implDialog, setImplDialog] = useState(false);
  const [implEditing, setImplEditing] = useState<Implemento | null>(null);
  const [implForm, setImplForm] = useState<FormImplemento>(implementoVazio);
  const [implFinanceiro, setImplFinanceiro] = useState<FinanciamentoState>(financiamentoInicial());

  async function carregar() {
    const [eq, imp] = await Promise.all([
      fetch("/api/equipamentos", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/implementos", { credentials: "include" }).then((r) => r.json()),
    ]);
    setEquipamentos(Array.isArray(eq) ? eq : eq?.data ?? []);
    setImplementos(Array.isArray(imp) ? imp : imp?.data ?? []);
  }

  useEffect(() => {
    carregar().catch((erro) => console.error("Erro ao carregar frota:", erro));
    fetch("/api/empresas", { credentials: "include" })
      .then((r) => r.json())
      .then((p) => setEmpresas(Array.isArray(p) ? p : p?.data ?? []))
      .catch((erro) => console.error("Erro ao carregar empresas:", erro));
  }, []);

  const nomeEmpresa = (id?: string | number | null) => {
    const e = empresas.find((x) => String(x.id) === String(id));
    return e ? e.razao_social || e.nome : "-";
  };

  const filtrados = equipamentos.filter((e) => {
    const termo = search.toLowerCase();
    return [e.placa, e.frota, e.tipo, e.marca, e.modelo, e.status]
      .some((v) => (v?.toLowerCase() || "").includes(termo));
  });
  const { sortedItems, sortKey, sortDirection, toggleSort } = useSortableData(filtrados);
  useEffect(() => setPage(1), [search, pageSize]);
  const paginados = paginate(sortedItems, page, pageSize);

  function novo() {
    setEditing(null);
    setForm(veiculoVazio);
    setFinanceiro(financiamentoInicial());
    setDialogOpen(true);
  }

  function editar(eq: EquipamentoApi) {
    setEditing(eq);
    setForm({
      empresa_id: eq.empresa_id == null ? "" : String(eq.empresa_id),
      placa: eq.placa || "",
      frota: eq.frota || "",
      tipo: eq.tipo || "",
      marca: eq.marca || "",
      modelo: eq.modelo || "",
      ano: eq.ano || "",
      renavam: eq.renavam || "",
      chassi: eq.chassi || "",
      km_atual: eq.km_atual == null ? "" : String(eq.km_atual),
      horimetro: eq.horimetro == null ? "" : String(eq.horimetro),
      status: eq.status || "Ativo",
      valor_aquisi__o: eq.valor_aquisi__o == null ? "" : String(eq.valor_aquisi__o),
      data_aquisicao: dataInput(eq.data_aquisicao),
      cronotacografo_venc: dataInput(eq.cronotacografo_venc),
      inmetro_venc: dataInput(eq.inmetro_venc),
      outros_nome: eq.outros_nome || "",
      outros_venc: dataInput(eq.outros_venc),
      observacoes: eq.observacoes || "",
    });
    const financiado = String(eq.situacao_financeira ?? "").toLowerCase().startsWith("financ");
    setFinanceiro({
      ...financiamentoInicial(),
      situacao_financeira: financiado ? "Financiamento" : "Quitado",
      modalidade_financiamento: eq.modalidade_financiamento || "",
      banco_financiamento: eq.banco_financiamento || "",
      tipo_parcela: String(eq.tipo_parcela ?? "").toLowerCase().startsWith("var") ? "variavel" : "fixa",
      quantidade_parcelas: eq.quantidade_parcelas == null ? "" : String(eq.quantidade_parcelas),
      gerado: financiado && !!eq.financiamento_gerado,
    });
    setDialogOpen(true);
  }

  async function salvar() {
    if (!form.placa.trim()) return alert("Informe a placa do veículo.");
    if (!form.empresa_id) return alert("Selecione a empresa do grupo proprietária do veículo.");
    setSalvando(true);
    try {
      const payload = {
        ...form,
        empresa_id: form.empresa_id,
        km_atual: form.km_atual === "" ? null : Number(form.km_atual),
        horimetro: form.horimetro === "" ? null : Number(form.horimetro),
        valor_aquisi__o: form.valor_aquisi__o === "" ? null : Number(form.valor_aquisi__o),
        ...payloadFinanciamento(financeiro),
      };
      await chamarApi(editing ? `/api/equipamentos/${editing.id}` : "/api/equipamentos", editing ? "PUT" : "POST", payload);
      await carregar();
      setDialogOpen(false);
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível salvar o veículo."));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string | number) {
    if (deletingId !== null) return;
    if (!confirm("Excluir este veículo da frota?")) return;
    setDeletingId(id);
    try {
      await deleteRegistro(`/api/equipamentos/${id}`);
      await carregar();
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível excluir o veículo."));
    } finally {
      setDeletingId(null);
    }
  }

  // ── Implementos ──
  const implementosDoVeiculo = editing
    ? implementos.filter((i) => String(i.equipamento_id) === String(editing.id))
    : [];

  function novoImplemento() {
    setImplEditing(null);
    setImplForm(implementoVazio);
    setImplFinanceiro(financiamentoInicial());
    setImplDialog(true);
  }

  function editarImplemento(item: Implemento) {
    setImplEditing(item);
    setImplForm({
      marca: item.marca || "",
      modelo: item.modelo || "",
      ano: item.ano || "",
      niev: item.niev || "",
      descricao: item.descricao || "",
    });
    const financiado = String(item.situacao_financeira ?? "").toLowerCase().startsWith("financ");
    setImplFinanceiro({
      ...financiamentoInicial(),
      situacao_financeira: financiado ? "Financiamento" : "Quitado",
      modalidade_financiamento: item.modalidade_financiamento || "",
      banco_financiamento: item.banco_financiamento || "",
      tipo_parcela: String(item.tipo_parcela ?? "").toLowerCase().startsWith("var") ? "variavel" : "fixa",
      quantidade_parcelas: item.quantidade_parcelas == null ? "" : String(item.quantidade_parcelas),
      gerado: financiado && !!item.financiamento_gerado,
    });
    setImplDialog(true);
  }

  async function salvarImplemento() {
    if (!editing) return;
    try {
      await chamarApi(implEditing ? `/api/implementos/${implEditing.id}` : "/api/implementos", implEditing ? "PUT" : "POST", {
        ...implForm,
        equipamento_id: editing.id,
        placa: editing.placa,
        ...payloadFinanciamento(implFinanceiro),
      });
      await carregar();
      setImplDialog(false);
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível salvar o implemento."));
    }
  }

  async function excluirImplemento(id: string | number) {
    if (!confirm("Excluir este implemento?")) return;
    try {
      await deleteRegistro(`/api/implementos/${id}`);
      await carregar();
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível excluir o implemento."));
    }
  }

  const campo = <K extends keyof FormVeiculo>(chave: K, valor: FormVeiculo[K]) =>
    setForm((atual) => ({ ...atual, [chave]: valor }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-y-0 left-0 z-40 hidden md:flex">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>

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

      <div className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}>
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl border border-border bg-card p-2 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-2xl">Frota</h1>
          </div>
          <Button onClick={novo} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Novo veículo
          </Button>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por placa, frota, tipo, marca, modelo ou status..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-input border-border"
                  />
                </div>
                <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Truck className="h-5 w-5 text-primary" />
                Veículos cadastrados ({filtrados.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <SortableTableHead<EquipamentoApi> label="Placa / Frota" sortKey="placa" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(eq) => eq.placa || eq.frota} />
                      <SortableTableHead<EquipamentoApi> label="Empresa" sortKey="empresa" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(eq) => nomeEmpresa(eq.empresa_id)} />
                      <SortableTableHead<EquipamentoApi> label="Marca / Modelo" sortKey="marca_modelo" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(eq) => `${eq.marca || ""} ${eq.modelo || ""}`} />
                      <SortableTableHead<EquipamentoApi> label="Ano" sortKey="ano" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(eq) => eq.ano} />
                      <SortableTableHead<EquipamentoApi> label="Financeiro" sortKey="situacao_financeira" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(eq) => eq.situacao_financeira} />
                      <TableHead className="text-muted-foreground">Vencimentos</TableHead>
                      <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginados.map((eq) => {
                      const alertas = alertasDocumentos(eq);
                      return (
                        <TableRow key={eq.id} className="border-border">
                          <TableCell className="font-bold text-foreground">
                            <div>{eq.placa || "-"}</div>
                            <div className="font-mono text-xs text-muted-foreground">Frota: {eq.frota || "-"}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{nomeEmpresa(eq.empresa_id)}</TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-foreground">{eq.marca || "-"}</div>
                            <div className="text-muted-foreground">{eq.modelo || "-"}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{eq.ano || "-"}</TableCell>
                          <TableCell className="text-xs">
                            {String(eq.situacao_financeira ?? "").toLowerCase().startsWith("financ")
                              ? `Financiado${eq.modalidade_financiamento ? ` (${eq.modalidade_financiamento})` : ""}`
                              : "Quitado"}
                            {eq.valor_aquisi__o ? (
                              <div className="text-muted-foreground">{formatCurrency(Number(eq.valor_aquisi__o))}</div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs">
                            {alertas.length === 0 ? (
                              <span className="text-muted-foreground">Em dia</span>
                            ) : (
                              alertas.map((a) => (
                                <div key={a.nome} className="flex items-center gap-1 text-amber-700">
                                  <AlertTriangle className="h-3 w-3" />
                                  {a.nome}: {a.dias < 0 ? `vencido há ${-a.dias}d` : a.dias === 0 ? "vence hoje" : `vence em ${a.dias}d`}
                                </div>
                              ))
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => editar(eq)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={deletingId !== null} onClick={() => excluir(eq.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls page={page} pageSize={pageSize} total={filtrados.length} onPageChange={setPage} />
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar veículo ${editing.placa ?? ""}` : "Novo veículo"}</DialogTitle>
            <DialogDescription>Cadastre todos os veículos das empresas do grupo.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-3">
                <Label>Empresa do grupo <span className="text-destructive">*</span></Label>
                <Select value={form.empresa_id} onValueChange={(v) => campo("empresa_id", v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.razao_social || e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Placa <span className="text-destructive">*</span></Label>
                <Input value={form.placa} onChange={(e) => campo("placa", e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-2">
                <Label>Renavam</Label>
                <Input value={form.renavam} onChange={(e) => campo("renavam", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Chassi</Label>
                <Input value={form.chassi} onChange={(e) => campo("chassi", e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input value={form.marca} onChange={(e) => campo("marca", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input value={form.modelo} onChange={(e) => campo("modelo", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input value={form.ano} onChange={(e) => campo("ano", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input value={form.tipo} onChange={(e) => campo("tipo", e.target.value)} placeholder="Caminhão, carreta..." />
              </div>
              <div className="space-y-2">
                <Label>Nº da frota</Label>
                <Input value={form.frota} onChange={(e) => campo("frota", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Situação</Label>
                <Select value={form.status} onValueChange={(v) => campo("status", v ?? "Ativo")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Manutenção">Manutenção</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>KM</Label>
                <Input type="number" value={form.km_atual} onChange={(e) => campo("km_atual", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horímetro</Label>
                <Input type="number" value={form.horimetro} onChange={(e) => campo("horimetro", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Valor de aquisição (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_aquisi__o} onChange={(e) => campo("valor_aquisi__o", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data de aquisição</Label>
                <Input type="date" value={form.data_aquisicao} onChange={(e) => campo("data_aquisicao", e.target.value)} />
              </div>
            </section>

            <section className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-semibold">Informações financeiras do veículo</p>
              <FinanciamentoForm value={financeiro} onChange={setFinanceiro} />
            </section>

            <section className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-semibold">Vencimentos (alerta em Pendências 10 dias antes)</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Cronotacógrafo — vencimento</Label>
                  <Input type="date" value={form.cronotacografo_venc} onChange={(e) => campo("cronotacografo_venc", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Inmetro — vencimento</Label>
                  <Input type="date" value={form.inmetro_venc} onChange={(e) => campo("inmetro_venc", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Outros — descrição</Label>
                  <Input value={form.outros_nome} onChange={(e) => campo("outros_nome", e.target.value)} placeholder="Ex.: licença ambiental" />
                </div>
                <div className="space-y-2 sm:col-start-3">
                  <Label>Outros — vencimento</Label>
                  <Input type="date" value={form.outros_venc} onChange={(e) => campo("outros_venc", e.target.value)} />
                </div>
              </div>
            </section>

            {editing ? (
              <section className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Wrench className="h-4 w-4" /> Implementos deste veículo
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={novoImplemento}>
                    <Plus className="mr-1 h-4 w-4" /> Implemento
                  </Button>
                </div>
                {implementosDoVeiculo.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum implemento cadastrado.</p>
                ) : (
                  <ul className="divide-y divide-border text-sm">
                    {implementosDoVeiculo.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                        <span>
                          <span className="font-mono text-xs text-muted-foreground">{item.numero}</span>{" "}
                          {[item.marca, item.modelo, item.ano].filter(Boolean).join(" ")}
                          {item.niev && <span className="text-xs text-muted-foreground"> — NIEV {item.niev}</span>}
                        </span>
                        <span className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => editarImplemento(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => excluirImplemento(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : (
              <p className="text-xs text-muted-foreground">Salve o veículo para cadastrar implementos.</p>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={(e) => campo("observacoes", e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : editing ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={implDialog} onOpenChange={setImplDialog}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{implEditing ? "Editar implemento" : "Novo implemento"}</DialogTitle>
            <DialogDescription>Placa do veículo: {editing?.placa}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input value={implForm.marca} onChange={(e) => setImplForm({ ...implForm, marca: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input value={implForm.modelo} onChange={(e) => setImplForm({ ...implForm, modelo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input value={implForm.ano} onChange={(e) => setImplForm({ ...implForm, ano: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nº NIEV</Label>
                <Input value={implForm.niev} onChange={(e) => setImplForm({ ...implForm, niev: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Descrição</Label>
                <Input value={implForm.descricao} onChange={(e) => setImplForm({ ...implForm, descricao: e.target.value })} />
              </div>
            </div>
            <FinanciamentoForm value={implFinanceiro} onChange={setImplFinanceiro} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImplDialog(false)}>Cancelar</Button>
              <Button onClick={salvarImplemento}>Salvar implemento</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
