"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Sidebar } from "@/components/layout/sidebar";
import { deleteRegistro } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  GripVertical,
  Menu,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

type ChecklistModel = {
  id: string;
  nome: string;
  categoria: string;
};

type ChecklistItem = {
  id: string;
  checklist_id: string;
  texto: string;
};

const emptyModel = { nome: "", categoria: "" };

export function ComponenteChecklist() {
  const [modelos, setModelos] = useState<ChecklistModel[]>([]);
  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ChecklistModel | null>(null);
  const [modelForm, setModelForm] = useState(emptyModel);
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchData() {
    const [modelosResponse, itensResponse] = await Promise.all([
      fetch("/api/checklists"),
      fetch("/api/checklist-itens"),
    ]);
    const modelosData = await modelosResponse.json();
    const itensData = await itensResponse.json();

    if (!modelosResponse.ok) {
      console.error("Erro ao carregar modelos de checklist:", modelosData);
    }
    if (!itensResponse.ok) {
      console.error("Erro ao carregar itens de checklist:", itensData);
    }

    setModelos(Array.isArray(modelosData?.data) ? modelosData.data : Array.isArray(modelosData) ? modelosData : []);
    setItens(Array.isArray(itensData?.data) ? itensData.data : Array.isArray(itensData) ? itensData : []);
  }

  useEffect(() => {
    fetchData().catch((error) => console.error("Erro ao carregar checklists:", error));
  }, []);

  const modelosFiltrados = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return modelos;
    return modelos.filter((modelo) => {
      const itensModelo = itens.filter((item) => item.checklist_id === modelo.id);
      return (
        (modelo.nome || "").toLowerCase().includes(termo) ||
        (modelo.categoria || "").toLowerCase().includes(termo) ||
        itensModelo.some((item) => (item.texto || "").toLowerCase().includes(termo))
      );
    });
  }, [itens, modelos, search]);

  function openNewModel() {
    setEditingModel(null);
    setModelForm(emptyModel);
    setDialogOpen(true);
  }

  function openEditModel(modelo: ChecklistModel) {
    setEditingModel(modelo);
    setModelForm({ nome: modelo.nome, categoria: modelo.categoria });
    setDialogOpen(true);
  }

  async function handleSaveModel() {
    if (!modelForm.nome.trim()) return;
    const url = editingModel ? `/api/checklists/${editingModel.id}` : "/api/checklists";
    await fetch(url, {
      method: editingModel ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modelForm),
    });
    await fetchData();
    setDialogOpen(false);
  }

  async function handleDeleteModel(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteRegistro(`/api/checklists/${id}`);
      setModelos((current) => current.filter((modelo) => modelo.id !== id));
      setItens((current) => current.filter((item) => item.checklist_id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddItem(checklistId: string) {
    const texto = newItem[checklistId]?.trim();
    if (!texto) return;
    const response = await fetch("/api/checklist-itens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), checklist_id: checklistId, texto }),
    });
    if (response.ok) {
      setNewItem((current) => ({ ...current, [checklistId]: "" }));
      await fetchData();
    }
  }

  async function handleDeleteItem(id: string) {
    await deleteRegistro(`/api/checklist-itens/${id}`);
    setItens((current) => current.filter((item) => item.id !== id));
  }

  function moveItem(checklistId: string, itemId: string, direction: -1 | 1) {
    setItens((current) => {
      const group = current.filter((item) => item.checklist_id === checklistId);
      const index = group.findIndex((item) => item.id === itemId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= group.length) return current;
      const next = [...group];
      [next[index], next[target]] = [next[target], next[index]];
      let position = 0;
      return current.map((item) => item.checklist_id === checklistId ? next[position++] : item);
    });
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800">
      <div className="fixed inset-y-0 left-0 z-40 hidden md:flex">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setMenuOpen(false)} />
          <div className="relative z-10 flex h-full">
            <Sidebar onClose={() => setMenuOpen(false)} />
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-white p-2 shadow-sm">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}>
        <header className="sticky top-0 z-30 flex min-h-12 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" className="rounded-md p-1.5 md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">Checklists</h1>
            <div className="relative hidden w-52 sm:block">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sky-500" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar placa, cliente, OS..." className="h-8 rounded-full border-slate-200 bg-slate-50 pl-8 text-xs" />
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="hidden sm:inline">15 de set de 2026</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-600">Seguro</span>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Modelos de checklist para OS</p>
              <div className="mt-2 block sm:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sky-500" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar..." className="h-9 bg-white pl-8 text-xs" />
                </div>
              </div>
            </div>
            <Button onClick={openNewModel} className="h-9 rounded-lg bg-[#d7193f] px-4 text-xs font-bold text-white hover:bg-[#b91436]"><Plus className="mr-1 h-3.5 w-3.5" /> Checklist</Button>
          </div>

          <div className="space-y-3">
            {modelosFiltrados.map((modelo) => {
              const modeloItens = itens.filter((item) => item.checklist_id === modelo.id);
              return (
                <section key={modelo.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-extrabold uppercase text-slate-800">{modelo.nome}</h2>
                      <span className="text-[9px] text-slate-400">{modelo.categoria || "Checklist"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-400">{modeloItens.length} itens</span>
                      <button type="button" onClick={() => openEditModel(modelo)} className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 font-semibold text-orange-500 hover:bg-orange-100">✎ Editar</button>
                      <button type="button" disabled={deletingId !== null} onClick={() => handleDeleteModel(modelo.id)} className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-500 hover:bg-rose-100 disabled:opacity-50">Excluir</button>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {modeloItens.map((item, index) => (
                      <div key={item.id} className="group flex min-h-9 items-center gap-2 px-3 text-[11px] text-slate-600 sm:px-4">
                        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-400">=</span>
                        <span className="flex-1 uppercase">{item.texto}</span>
                        <div className="flex items-center gap-1 opacity-70 transition group-hover:opacity-100">
                          <button type="button" disabled={index === 0} onClick={() => moveItem(modelo.id, item.id, -1)} aria-label="Mover item para cima" className="rounded-full border border-slate-200 p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                          <button type="button" disabled={index === modeloItens.length - 1} onClick={() => moveItem(modelo.id, item.id, 1)} aria-label="Mover item para baixo" className="rounded-full border border-slate-200 p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                          <button type="button" aria-label="Editar item" className="rounded-full border border-orange-200 bg-orange-50 p-1 text-orange-500 hover:bg-orange-100"><Edit3 className="h-3 w-3" /></button>
                          <button type="button" onClick={() => handleDeleteItem(item.id)} aria-label="Excluir item" className="rounded-full border border-rose-200 bg-rose-50 p-1 text-rose-500 hover:bg-rose-100"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 bg-slate-50 p-2.5 sm:p-3">
                    <Input value={newItem[modelo.id] || ""} onChange={(event) => setNewItem((current) => ({ ...current, [modelo.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") handleAddItem(modelo.id); }} placeholder="NOVO ITEM..." className="h-9 border-slate-200 bg-white text-xs uppercase placeholder:text-slate-400" />
                    <Button type="button" onClick={() => handleAddItem(modelo.id)} variant="outline" className="h-9 border-slate-200 bg-white px-3 text-xs text-slate-500 hover:bg-slate-100"><Plus className="mr-1 h-3.5 w-3.5" /> Item</Button>
                  </div>
                </section>
              );
            })}
            {!modelosFiltrados.length && <div className="rounded-lg border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-400">Nenhum modelo de checklist encontrado.</div>}
          </div>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingModel ? "Editar checklist" : "Novo checklist"}</DialogTitle>
            <DialogDescription>Cadastre o modelo que aparecerá na lista de checklists.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2"><Label htmlFor="nome">Nome do checklist</Label><Input id="nome" value={modelForm.nome} onChange={(event) => setModelForm({ ...modelForm, nome: event.target.value })} placeholder="Ex.: Preventiva" /></div>
            <div className="space-y-2"><Label htmlFor="categoria">Categoria</Label><Input id="categoria" value={modelForm.categoria} onChange={(event) => setModelForm({ ...modelForm, categoria: event.target.value })} placeholder="Ex.: Revisão preventiva" /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSaveModel} className="bg-[#d7193f] text-white hover:bg-[#b91436]">Salvar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
