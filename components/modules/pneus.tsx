"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Menu,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { deleteRegistro, formatDate } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Pneu {
  id: string;
  numero: string;
  marca: string;
  modelo: string;
  medida: string;
  dot: string;
  condicao: string;
  valor: string;
  data: string;
  observacao: string;
  status: string;
  local: string;
  reformadora?: string;
  data_saida?: string;
  previsao_retorno?: string;
  saiu_reforma?: number;
}

type PneuForm = Omit<Pneu, "id">;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gerarId() {
  return Math.random().toString(36).slice(2, 15);
}

function calcularIdade(dot: string): string {
  if (!dot || dot.length < 2) return "?";
  const semana = parseInt(dot.slice(0, 2));
  const ano = parseInt(dot.slice(2, 4));
  if (!semana || !ano) return "?";
  
  const anoCompleto = ano < 50 ? 2000 + ano : 1900 + ano;
  const agora = new Date();
  const anosPassados = agora.getFullYear() - anoCompleto;
  
  return anosPassados + " ano(s)";
}

function statusBadge(status: string) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    estoque: { label: "Em estoque", bg: "bg-emerald-100", text: "text-emerald-700" },
    aplicado: { label: "Aplicado", bg: "bg-blue-100", text: "text-blue-700" },
    inutilizado: { label: "Inutilizado", bg: "bg-red-100", text: "text-red-700" },
    reformando: { label: "Em reforma", bg: "bg-amber-100", text: "text-amber-700" },
  };
  return config[status] || { label: status, bg: "bg-gray-100", text: "text-gray-700" };
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function Pneus() {
  const [pneus, setPneus] = useState<Pneu[]>([]);
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingPneu, setEditingPneu] = useState<Pneu | null>(null);
  const [selectedPneu, setSelectedPneu] = useState<Pneu | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const emptyForm = (): PneuForm => ({
    numero: "",
    marca: "",
    modelo: "",
    medida: "",
    dot: "",
    condicao: "novo",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    observacao: "",
    status: "estoque",
    local: "Estoque",
  });

  const [formData, setFormData] = useState<PneuForm>(emptyForm());

  // ── Fetch ──
  async function fetchPneus() {
    try {
      const res = await fetch("/api/pneus");
      const data = await res.json();
      setPneus(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error("Erro ao carregar pneus:", e);
    }
  }

  useEffect(() => {
    fetchPneus();
  }, []);

  // ── Totais calculados ──
  const totais = useMemo(() => {
    const statusCounts = {
      estoque: pneus.filter(p => p.status === "estoque").length,
      aplicado: pneus.filter(p => p.status === "aplicado").length,
      inutilizado: pneus.filter(p => p.status === "inutilizado").length,
      reformando: pneus.filter(p => p.status === "reformando").length,
      total: pneus.length,
    };
    return statusCounts;
  }, [pneus]);

  // ── Pneus com DOT antigo ──
  const pneusAntigost = useMemo(() => {
    return pneus.filter(p => {
      const idade = calcularIdade(p.dot);
      const anos = parseInt(idade.split(" ")[0]);
      return anos >= 5 && !isNaN(anos);
    });
  }, [pneus]);

  // ── Filtros ──
  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return pneus.filter((p) => {
      const matchSearch =
        p.numero?.toLowerCase().includes(term) ||
        p.marca?.toLowerCase().includes(term) ||
        p.medida?.toLowerCase().includes(term) ||
        p.local?.toLowerCase().includes(term);
      const matchStatus =
        filtroStatus === "todos" || p.status === filtroStatus;
      return matchSearch && matchStatus;
    });
  }, [pneus, search, filtroStatus]);

  // ── CRUD ──
  const openNew = () => {
    setEditingPneu(null);
    setFormData(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (p: Pneu) => {
    setEditingPneu(p);
    setFormData({ ...p });
    setDialogOpen(true);
  };

  const openView = (p: Pneu) => {
    setSelectedPneu(p);
    setViewDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...formData };
    if (editingPneu) {
      await fetch(`/api/pneus/${editingPneu.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/pneus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    await fetchPneus();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este pneu?")) return;
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteRegistro(`/api/pneus/${id}`);
      setPneus((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-foreground dark:bg-background">
      {/* Sidebar */}
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

        {/* Topbar */}
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl border border-border bg-card p-2 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-foreground whitespace-nowrap">Pneus</h1>
          </div>
        </header>

        <main className="w-full space-y-4 p-4 sm:p-6">

          {/* Alerta de pneus antigos */}
          {pneusAntigost.length > 0 && (
            <div className="bg-amber-100 dark:bg-amber-100 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 flex gap-3 items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-600 dark:text-amber-600">Pneus com DOT de 5 anos ou mais ({pneusAntigost.length})</p>
                <p className="text-sm text-amber-600 dark:text-amber-600">Regra: pneu a partir de 5 anos de fabricação entra neste alerta.</p>
              </div>
            </div>
          )}

          {/* Subtítulo + Botão Novo Pneu */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Controle de pneus: estoque, aplicação e histórico</p>
            <Button
              onClick={openNew}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-md h-9"
            >
              <Plus className="h-4 w-4 mr-1" /> Novo Pneu
            </Button>
          </div>

          {/* Busca e Filtro */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="BUSCAR PLACA, CLIENTE..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-card border-border"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-9 text-xs bg-card border-border w-full sm:w-52">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="estoque">Em estoque</SelectItem>
                <SelectItem value="aplicado">Aplicado</SelectItem>
                <SelectItem value="reformando">Em reforma</SelectItem>
                <SelectItem value="inutilizado">Inutilizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cards de totais */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
            <div className="bg-card rounded-lg border-t-2 border-t-emerald-500 border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Em estoque</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{totais.estoque}</p>
            </div>
            <div className="bg-card rounded-lg border-t-2 border-t-blue-500 border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Aplicados</p>
              <p className="text-xl sm:text-2xl font-black text-blue-600 mt-1">{totais.aplicado}</p>
            </div>
            <div className="bg-card rounded-lg border-t-2 border-t-amber-500 border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Em reforma</p>
              <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{totais.reformando}</p>
            </div>
            <div className="bg-card rounded-lg border-t-2 border-t-red-500 border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inutilizados</p>
              <p className="text-xl sm:text-2xl font-black text-red-600 mt-1">{totais.inutilizado}</p>
            </div>
            <div className="bg-card rounded-lg border-t-2 border-t-purple-500 border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="text-xl sm:text-2xl font-black text-purple-600 mt-1">{totais.total}</p>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[80px_100px_120px_80px_70px_100px_140px_auto] gap-2 px-4 py-2 border-b border-border bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <div>Nº</div>
              <div>Marca</div>
              <div>Medida</div>
              <div>DOT</div>
              <div>Idade</div>
              <div>Condição</div>
              <div>Situação</div>
              <div />
            </div>

            {/* Linhas */}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum pneu encontrado.
              </div>
            )}

            {filtered.map((p) => {
              const st = statusBadge(p.status);
              const idade = calcularIdade(p.dot);
              const anosInt = parseInt(idade.split(" ")[0]);

              return (
                <div key={p.id} className="grid grid-cols-[80px_100px_120px_80px_70px_100px_140px_auto] gap-2 px-4 py-3 border-b border-border items-center text-sm hover:bg-muted/20 transition-colors">
                  
                  {/* Número */}
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-mono">
                      {p.numero}
                    </span>
                  </div>

                  {/* Marca */}
                  <div className="font-medium text-foreground text-xs truncate">
                    {p.marca}
                  </div>

                  {/* Medida */}
                  <div className="text-xs text-muted-foreground font-mono">
                    {p.medida}
                  </div>

                  {/* DOT */}
                  <div className="text-xs text-muted-foreground font-mono">
                    {p.dot}
                  </div>

                  {/* Idade */}
                  <div className={`text-xs font-bold ${anosInt >= 5 ? "text-red-600" : "text-muted-foreground"}`}>
                    {idade}
                  </div>

                  {/* Condição */}
                  <div className="text-xs text-muted-foreground capitalize">
                    {p.condicao}
                  </div>

                  {/* Status */}
                  <div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => openView(p)}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId !== null}
                      className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* ── Modal Visualização ──────────────────────────────────────────────── */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto" onMouseDown={(e) => e.detail > 1 && e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              Pneu Nº {selectedPneu?.numero}
            </DialogTitle>
            <DialogDescription>Detalhes do pneu</DialogDescription>
          </DialogHeader>

          {selectedPneu && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
                <div>
                  <span className="text-muted-foreground block mb-1">Marca</span>
                  <strong>{selectedPneu.marca}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Modelo</span>
                  <strong>{selectedPneu.modelo}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Medida</span>
                  <strong className="font-mono">{selectedPneu.medida}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">DOT</span>
                  <strong className="font-mono">{selectedPneu.dot}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Condição</span>
                  <strong className="capitalize">{selectedPneu.condicao}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Status</span>
                  <strong>{statusBadge(selectedPneu.status).label}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block mb-1">Localização</span>
                  <strong>{selectedPneu.local}</strong>
                </div>
                {selectedPneu.reformadora && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Reformadora</span>
                    <strong>{selectedPneu.reformadora}</strong>
                  </div>
                )}
                {selectedPneu.observacao && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block mb-1">Observações</span>
                    <p className="text-foreground">{selectedPneu.observacao}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal Cadastro / Edição ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto" onMouseDown={(e) => e.detail > 1 && e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingPneu ? `Editar Pneu ${editingPneu.numero}` : "Novo Pneu"}
            </DialogTitle>
            <DialogDescription>Preencha os dados do pneu.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">

            {/* Dados básicos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nº RBS</Label>
                <Input
                  placeholder="Ex: 0261"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label>Marca</Label>
                <Input
                  placeholder="MICHELIN"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label>Modelo</Label>
                <Input
                  placeholder="MISTO"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label>Medida</Label>
                <Input
                  placeholder="295/80R22,5"
                  value={formData.medida}
                  onChange={(e) => setFormData({ ...formData, medida: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label>DOT</Label>
                <Input
                  placeholder="4820"
                  value={formData.dot}
                  onChange={(e) => setFormData({ ...formData, dot: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label>Condição</Label>
                <Select
                  value={formData.condicao}
                  onValueChange={(val) => setFormData({ ...formData, condicao: val })}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="reformado">Reformado</SelectItem>
                    <SelectItem value="usado">Usado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estoque">Em estoque</SelectItem>
                    <SelectItem value="aplicado">Aplicado</SelectItem>
                    <SelectItem value="reformando">Em reforma</SelectItem>
                    <SelectItem value="inutilizado">Inutilizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Localização</Label>
                <Input
                  placeholder="Estoque"
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Observações</Label>
                <textarea
                  rows={2}
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                  placeholder="Observações opcionais..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground">
              {editingPneu ? "Salvar alterações" : "Cadastrar Pneu"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
