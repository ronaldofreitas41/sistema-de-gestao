"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Building2, Edit, Menu, Plus, Search, Trash2, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteRegistro } from "@/lib/utils";

type Empresa = {
  id: string | number;
  nome: string;
  razao_social?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  logo?: string | null;
  ativo?: boolean | null;
};

type EmpresaForm = Omit<Empresa, "id">;

const formularioInicial: EmpresaForm = {
  nome: "",
  razao_social: "",
  cnpj: "",
  inscricao_estadual: "",
  telefone: "",
  email: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
  logo: "",
  ativo: true,
};

export function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [form, setForm] = useState<EmpresaForm>(formularioInicial);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [excluindo, setExcluindo] = useState<string | number | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const response = await fetch("/api/empresas");
    const payload = await response.json();
    setEmpresas(Array.isArray(payload) ? payload : payload.data || []);
  }

  useEffect(() => { carregar().catch(console.error); }, []);

  const filtradas = useMemo(() => {
    const termo = busca.toLowerCase();
    return empresas.filter((empresa) => [empresa.nome, empresa.razao_social, empresa.cnpj, empresa.cidade].some((valor) => String(valor || "").toLowerCase().includes(termo)));
  }, [empresas, busca]);

  function alterar(campo: keyof EmpresaForm, valor: string | boolean) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function carregarLogo(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = () => alterar("logo", String(reader.result));
    reader.readAsDataURL(arquivo);
  }

  function novaEmpresa() {
    setEditando(null);
    setForm(formularioInicial);
    setDialogOpen(true);
  }

  function editar(empresa: Empresa) {
    setEditando(empresa);
    setForm({ ...formularioInicial, ...empresa });
    setDialogOpen(true);
  }

  async function salvar() {
    if (!form.nome.trim() || salvando) return;
    setSalvando(true);
    try {
      const response = await fetch(editando ? `/api/empresas/${editando.id}` : "/api/empresas", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error("Não foi possível salvar a empresa.");
      await carregar();
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      alert("Não foi possível salvar a empresa.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string | number) {
    if (!confirm("Deseja realmente excluir esta empresa?")) return;
    setExcluindo(id);
    try {
      await deleteRegistro(`/api/empresas/${id}`);
      await carregar();
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-y-0 left-0 z-40 hidden md:flex"><Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} /></div>
      {menuOpen && <div className="fixed inset-0 z-50 flex md:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} /><div className="relative z-10 flex h-full"><Sidebar onClose={() => setMenuOpen(false)} /><button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-card p-2"><X className="h-5 w-5" /></button></div></div>}
      <div className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}>
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-9"><div className="flex items-center gap-3"><button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" className="rounded-xl border border-border bg-card p-2 md:hidden"><Menu className="h-4 w-4" /></button><h1 className="text-lg font-bold sm:text-2xl">Empresas</h1></div><Button onClick={novaEmpresa}><Plus className="mr-2 h-4 w-4" />Nova empresa</Button></header>
        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          <Card><CardContent className="pt-6"><div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por nome, CNPJ ou cidade..." value={busca} onChange={(event) => setBusca(event.target.value)} /></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Empresas cadastradas ({filtradas.length})</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CNPJ</TableHead><TableHead>Telefone</TableHead><TableHead>Cidade/UF</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filtradas.map((empresa) => <TableRow key={String(empresa.id)}><TableCell className="font-medium">{empresa.nome}</TableCell><TableCell>{empresa.cnpj || "-"}</TableCell><TableCell>{empresa.telefone || "-"}</TableCell><TableCell>{[empresa.cidade, empresa.estado].filter(Boolean).join("/") || "-"}</TableCell><TableCell>{empresa.ativo === false ? "Inativa" : "Ativa"}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => editar(empresa)} aria-label="Editar empresa"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" disabled={excluindo === empresa.id} onClick={() => excluir(empresa.id)} aria-label="Excluir empresa"><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>)}</TableBody></Table>{filtradas.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>}</div></CardContent></Card>
        </main>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editando ? "Editar empresa" : "Nova empresa"}</DialogTitle><DialogDescription>Informe os dados cadastrais da empresa.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2">{([["nome", "Nome fantasia"], ["razao_social", "Razão social"], ["cnpj", "CNPJ"], ["inscricao_estadual", "Inscrição estadual"], ["telefone", "Telefone"], ["email", "E-mail"], ["endereco", "Endereço"], ["cidade", "Cidade"], ["estado", "UF"], ["cep", "CEP"]] as [keyof EmpresaForm, string][]).map(([campo, label]) => <div key={campo} className="space-y-2"><Label>{label}</Label><Input value={String(form[campo] || "")} onChange={(event) => alterar(campo, event.target.value)} /></div>)}<div className="space-y-2 sm:col-span-2"><Label htmlFor="logo">Logo da empresa</Label><Input id="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={carregarLogo} />{form.logo && <img src={form.logo} alt="Pré-visualização da logo" className="h-16 max-w-48 rounded border border-border object-contain p-1" />}</div><div className="flex items-center gap-3 sm:col-span-2"><Switch checked={Boolean(form.ativo)} onCheckedChange={(value) => alterar("ativo", value)} /><Label>Empresa ativa</Label></div></div><div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={salvando || !form.nome.trim()}>{salvando ? "Salvando..." : "Salvar"}</Button></div></DialogContent></Dialog>
    </div>
  );
}
