"use client";

import { useEffect, useState } from "react";
import { Edit, Menu, Plus, Receipt, Search, Trash2, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContaReceber } from "@/lib/types";
import { deleteRegistro, formatCurrency, formatDate } from "@/lib/utils";

const vazio = { cliente: "", competencia: new Date().toISOString().slice(0, 7), valor_total: "", status: "pendente", observacoes: "", data_emissao: new Date().toISOString().slice(0, 10) };

export function ContasReceber() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContaReceber | null>(null);
  const [form, setForm] = useState(vazio);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function carregar() { const response = await fetch("/api/contas-receber"); const payload = await response.json(); setContas(payload.data || []); }
  useEffect(() => { carregar(); }, []);
  function novaConta() { setEditing(null); setForm(vazio); setDialogOpen(true); }
  function editar(conta: ContaReceber) { setEditing(conta); setForm({ cliente: conta.cliente || "", competencia: conta.competencia || "", valor_total: String(conta.valor_total || ""), status: conta.status || "pendente", observacoes: conta.observacoes || "", data_emissao: conta.data_emissao?.slice(0, 10) || "" }); setDialogOpen(true); }
  async function salvar() { await fetch(editing ? `/api/contas-receber/${editing.id}` : "/api/contas-receber", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, valor_total: Number(form.valor_total) || 0, data_emissao: new Date(form.data_emissao).toISOString() }) }); await carregar(); setDialogOpen(false); }
  async function excluir(id: string) { setDeletingId(id); try { await deleteRegistro(`/api/contas-receber/${id}`); await carregar(); } finally { setDeletingId(null); } }
  const filtradas = contas.filter((conta) => `${conta.cliente || ""} ${conta.competencia || ""} ${conta.status || ""}`.toLowerCase().includes(busca.toLowerCase()));
  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  return <div className="min-h-screen bg-background text-foreground">
    <div className="fixed inset-y-0 left-0 z-40 hidden md:flex"><Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} /></div>
    {menuOpen && <div className="fixed inset-0 z-50 flex md:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} /><div className="relative z-10 flex h-full"><Sidebar onClose={() => setMenuOpen(false)} /><button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-card p-2"><X className="h-5 w-5" /></button></div></div>}
    <div className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}>
      <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-9"><div className="flex items-center gap-3"><button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" className="rounded-xl border border-border bg-card p-2 md:hidden"><Menu className="h-5 w-5" /></button><h1 className="text-lg font-bold sm:text-2xl">Contas a receber</h1></div><Button onClick={novaConta}><Plus className="mr-2 h-4 w-4" />Nova conta</Button></header>
      <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9"><Card><CardContent className="pt-6"><div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por cliente, competência ou status..." value={busca} onChange={(event) => setBusca(event.target.value)} /></div></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" />Lista de contas ({filtradas.length})</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Competência</TableHead><TableHead>Emissão</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filtradas.map((conta) => <TableRow key={conta.id}><TableCell className="font-medium">{conta.cliente || "-"}</TableCell><TableCell>{conta.competencia || "-"}</TableCell><TableCell>{formatDate(conta.data_emissao)}</TableCell><TableCell>{formatCurrency(Number(conta.valor_total || 0))}</TableCell><TableCell>{conta.status}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => editar(conta)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" disabled={deletingId === conta.id} onClick={() => excluir(conta.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></main>
    </div>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar conta a receber" : "Nova conta a receber"}</DialogTitle><DialogDescription>Preencha os dados da conta.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Cliente</Label><Input value={form.cliente} onChange={(e) => setField("cliente", e.target.value)} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Competência</Label><Input type="month" value={form.competencia} onChange={(e) => setField("competencia", e.target.value)} /></div><div className="space-y-2"><Label>Valor total</Label><Input type="number" step="0.01" value={form.valor_total} onChange={(e) => setField("valor_total", e.target.value)} /></div></div><div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setField("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => setField("observacoes", e.target.value)} /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></div></div></DialogContent></Dialog>
  </div>;
}
