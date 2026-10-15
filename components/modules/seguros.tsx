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
import { AlertTriangle, Edit, Menu, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { deleteRegistro, formatDate, getPlacas } from "@/lib/utils";
import { chamarApi, mensagemErro } from "@/lib/api-client";
import { PageSizeSelect, PaginationControls, paginate } from "@/components/ui/pagination";
import { SortableTableHead, useSortableData } from "@/components/ui/sortable-table";

type SeguroApi = {
  id: string | number;
  numero?: string | null;
  seguradora?: string | null;
  numero_apolice?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  status?: string | null;
  observacoes?: string | null;
  placas?: string[] | null;
};

type FormSeguro = {
  seguradora: string;
  numero_apolice: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  observacoes: string;
  placas: string[];
};

const formVazio = (): FormSeguro => ({
  seguradora: "",
  numero_apolice: "",
  data_inicio: "",
  data_fim: "",
  status: "Ativo",
  observacoes: "",
  placas: [],
});

const dataInput = (v?: string | null) => (v ? v.slice(0, 10) : "");

function diasParaVencer(valor?: string | null) {
  if (!valor) return null;
  const alvo = new Date(`${valor.slice(0, 10)}T00:00:00`);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

export function ComponenteSeguros() {
  const [seguros, setSeguros] = useState<SeguroApi[]>([]);
  const [placasFrota, setPlacasFrota] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SeguroApi | null>(null);
  const [form, setForm] = useState<FormSeguro>(formVazio());
  const [placaEscolhida, setPlacaEscolhida] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  async function carregar() {
    try {
      const res = await fetch("/api/seguros", { credentials: "include" });
      const dados = await res.json();
      setSeguros(Array.isArray(dados) ? dados : dados?.data ?? []);
    } catch (erro) {
      console.error("Erro ao carregar seguros:", erro);
    }
  }

  useEffect(() => {
    carregar();
    getPlacas().then(setPlacasFrota);
  }, []);

  const filtrados = seguros.filter((s) => {
    const termo = search.toLowerCase();
    return [s.numero, s.seguradora, s.numero_apolice, s.status, ...(s.placas ?? [])]
      .some((v) => String(v ?? "").toLowerCase().includes(termo));
  });
  const { sortedItems, sortKey, sortDirection, toggleSort } = useSortableData(filtrados);
  useEffect(() => setPage(1), [search, pageSize]);
  const paginados = paginate(sortedItems, page, pageSize);

  function novo() {
    setEditing(null);
    setForm(formVazio());
    setPlacaEscolhida("");
    setDialogOpen(true);
  }

  function editar(s: SeguroApi) {
    setEditing(s);
    setForm({
      seguradora: s.seguradora || "",
      numero_apolice: s.numero_apolice || "",
      data_inicio: dataInput(s.data_inicio),
      data_fim: dataInput(s.data_fim),
      status: s.status || "Ativo",
      observacoes: s.observacoes || "",
      placas: Array.isArray(s.placas) ? s.placas : [],
    });
    setPlacaEscolhida("");
    setDialogOpen(true);
  }

  function adicionarPlaca() {
    const placa = placaEscolhida.trim().toUpperCase().replace(/\s+/g, "");
    if (!placa) return;
    if (form.placas.includes(placa)) return setPlacaEscolhida("");
    setForm((atual) => ({ ...atual, placas: [...atual.placas, placa] }));
    setPlacaEscolhida("");
  }

  async function salvar() {
    if (!form.seguradora.trim()) return alert("Informe a seguradora.");
    if (!form.numero_apolice.trim()) return alert("Informe o número da apólice.");
    if (!form.data_fim) return alert("Informe o vencimento da apólice.");
    if (!form.placas.length) return alert("Inclua ao menos uma placa nesta apólice.");
    setSalvando(true);
    try {
      await chamarApi(editing ? `/api/seguros/${editing.id}` : "/api/seguros", editing ? "PUT" : "POST", form);
      await carregar();
      setDialogOpen(false);
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível salvar a apólice."));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string | number) {
    if (deletingId !== null || !confirm("Excluir esta apólice?")) return;
    setDeletingId(id);
    try {
      await deleteRegistro(`/api/seguros/${id}`);
      await carregar();
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível excluir a apólice."));
    } finally {
      setDeletingId(null);
    }
  }

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
            <button type="button" onClick={() => setMenuOpen(true)} className="rounded-xl border border-border bg-card p-2 md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-2xl">Seguros</h1>
          </div>
          <Button onClick={novo} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Nova apólice
          </Button>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar por seguradora, apólice, placa ou status..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-border bg-input pl-9" />
                </div>
                <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Apólices ({filtrados.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <SortableTableHead<SeguroApi> label="Nº" sortKey="numero" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(s) => s.numero} />
                      <SortableTableHead<SeguroApi> label="Seguradora" sortKey="seguradora" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(s) => s.seguradora} />
                      <SortableTableHead<SeguroApi> label="Apólice" sortKey="numero_apolice" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(s) => s.numero_apolice} />
                      <TableHead>Placas</TableHead>
                      <SortableTableHead<SeguroApi> label="Vencimento" sortKey="data_fim" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(s) => s.data_fim} />
                      <SortableTableHead<SeguroApi> label="Status" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(s) => s.status} />
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginados.map((s) => {
                      const dias = diasParaVencer(s.data_fim);
                      const alerta = dias !== null && dias <= 15 && (s.status ?? "").toLowerCase() === "ativo";
                      return (
                        <TableRow key={s.id} className="border-border">
                          <TableCell className="font-mono text-xs text-muted-foreground">{s.numero || "-"}</TableCell>
                          <TableCell className="font-medium">{s.seguradora}</TableCell>
                          <TableCell>{s.numero_apolice}</TableCell>
                          <TableCell className="text-xs">
                            {(s.placas ?? []).length ? (s.placas ?? []).join(", ") : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(s.data_fim)}
                            {alerta && (
                              <span className="mt-0.5 flex items-center gap-1 text-amber-700">
                                <AlertTriangle className="h-3 w-3" />
                                {dias! < 0 ? `vencida há ${-dias!}d` : dias === 0 ? "vence hoje" : `vence em ${dias}d`}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{s.status}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => editar(s)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={deletingId !== null} onClick={() => excluir(s.id)}>
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
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar apólice" : "Nova apólice"}</DialogTitle>
            <DialogDescription>Uma apólice pode cobrir várias placas da frota. Alerta em Pendências 15 dias antes do vencimento.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Seguradora *</Label>
              <Input value={form.seguradora} onChange={(e) => setForm({ ...form, seguradora: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nº da apólice *</Label>
              <Input value={form.numero_apolice} onChange={(e) => setForm({ ...form, numero_apolice: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Início da vigência</Label>
              <Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Vencimento *</Label>
              <Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "Ativo" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Vencido">Vencido</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Placas cobertas *</Label>
              <div className="flex gap-2">
                <Select value={placaEscolhida} onValueChange={(v) => setPlacaEscolhida(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Selecionar placa da frota" /></SelectTrigger>
                  <SelectContent>
                    {placasFrota
                      .filter((p) => !form.placas.includes(p.toUpperCase().replace(/\s+/g, "")))
                      .map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" disabled={!placaEscolhida} onClick={adicionarPlaca}>
                  <Plus className="mr-1 h-4 w-4" /> Adicionar
                </Button>
              </div>
              <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-border bg-slate-50 p-2">
                {form.placas.length === 0 && <span className="text-sm text-muted-foreground">Nenhuma placa incluída.</span>}
                {form.placas.map((p) => (
                  <span key={p} className="flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-sm">
                    {p}
                    <button type="button" aria-label={`Remover placa ${p}`} className="text-muted-foreground hover:text-destructive" onClick={() => setForm((a) => ({ ...a, placas: a.placas.filter((x) => x !== p) }))}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
