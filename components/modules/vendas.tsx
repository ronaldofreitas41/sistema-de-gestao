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
  CheckCircle2,
  Trash,
  FileText,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { deleteRegistro, formatCurrency, formatDate, getPlacas } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface VendaItem {
  id: string;
  desc: string;
  qtd: number;
  val: number;
  tipo: string;
  fonte: string;
}

interface Venda {
  id: string;
  numero: string;
  cliente: string;
  data: string;
  documento?: string;
  tipo_documento?: string;
  contato?: string;
  pagamento?: string;
  observacoes?: string;
  items: VendaItem[];
  sub_total: number;
  desconto: number;
  total: number;
  status: string;
  faturada: boolean;
  vencimento?: string;
  avaria: boolean;
  em_medicao: boolean;
  sinal_medicao?: string;
  placa_medicao?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gerarId() {
  return Math.random().toString(36).slice(2, 15);
}

function statusLabel(venda: Venda) {
  if (venda.faturada && venda.em_medicao) return { label: "Liquidada MED", color: "bg-blue-100 text-blue-700 border-blue-200" };
  if (venda.faturada) return { label: "Faturada", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (venda.em_medicao) return { label: "A Faturar", color: "bg-amber-100 text-amber-700 border-amber-200" };
  if (venda.status === "cancelado") return { label: "Cancelada", color: "bg-red-100 text-red-700 border-red-200" };
  return { label: "Pendente", color: "bg-gray-100 text-gray-600 border-gray-200" };
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function Vendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [placas, setPlacas] = useState<string[]>([]);

  const emptyForm = (): Omit<Venda, "id" | "numero"> => ({
    cliente: "",
    data: new Date().toISOString().slice(0, 10),
    documento: "",
    tipo_documento: "nf_simples",
    contato: "",
    pagamento: "À Vista",
    observacoes: "",
    items: [],
    sub_total: 0,
    desconto: 0,
    total: 0,
    status: "pendente",
    faturada: false,
    vencimento: new Date().toISOString().slice(0, 10),
    avaria: false,
    em_medicao: false,
    sinal_medicao: "+",
    placa_medicao: "",
  });

  const [formData, setFormData] = useState<Omit<Venda, "id" | "numero">>(emptyForm());
  const [novoItem, setNovoItem] = useState({ desc: "", qtd: 1, val: 0, tipo: "Produto" });

  // ── Fetch ──
  async function fetchVendas() {
    try {
      const res = await fetch("/api/vendas");
      const data = await res.json();
      setVendas(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error("Erro ao carregar vendas:", e);
    }
  }

  useEffect(() => {
    fetchVendas();
    getPlacas().then(setPlacas);
  }, []);

  // ── Totais calculados ──
  const totais = useMemo(() => {
    const pagas = vendas.filter((v) => v.faturada).reduce((a, v) => a + v.total, 0);
    const pendentes = vendas.filter((v) => !v.faturada).reduce((a, v) => a + v.total, 0);
    return { pagas, pendentes, total: vendas.length };
  }, [vendas]);

  // ── Filtros ──
  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return vendas.filter((v) => {
      const matchSearch =
        v.numero?.toLowerCase().includes(term) ||
        v.cliente?.toLowerCase().includes(term) ||
        v.placa_medicao?.toLowerCase().includes(term);
      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "faturada" && v.faturada && !v.em_medicao) ||
        (filtroStatus === "a_faturar" && !v.faturada && v.em_medicao) ||
        (filtroStatus === "liquidada" && v.faturada && v.em_medicao) ||
        (filtroStatus === "pendente" && !v.faturada && !v.em_medicao);
      return matchSearch && matchStatus;
    });
  }, [vendas, search, filtroStatus]);

  // ── Recalcular totais do form ──
  function recalcularForm(items: VendaItem[], desconto: number) {
    const sub = items.reduce((a, i) => a + i.qtd * i.val, 0);
    const total = Math.max(0, sub - desconto);
    setFormData((f) => ({ ...f, items, sub_total: sub, total, desconto }));
  }

  function adicionarItem() {
    if (!novoItem.desc.trim()) return;
    const item: VendaItem = { ...novoItem, id: gerarId(), fonte: "manual" };
    const novosItems = [...formData.items, item];
    recalcularForm(novosItems, formData.desconto);
    setNovoItem({ desc: "", qtd: 1, val: 0, tipo: "Produto" });
  }

  function removerItem(id: string) {
    const novosItems = formData.items.filter((i) => i.id !== id);
    recalcularForm(novosItems, formData.desconto);
  }

  // ── CRUD ──
  const openNew = () => {
    setEditingVenda(null);
    setFormData(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (v: Venda) => {
    setEditingVenda(v);
    setFormData({ ...v });
    setDialogOpen(true);
  };

  const openView = (v: Venda) => {
    setSelectedVenda(v);
    setViewDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...formData };
    if (editingVenda) {
      await fetch(`/api/vendas/${editingVenda.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    await fetchVendas();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta venda?")) return;
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteRegistro(`/api/vendas/${id}`);
      setVendas((prev) => prev.filter((v) => v.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleFaturar = async (v: Venda) => {
    await fetch(`/api/vendas/${v.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, faturada: true }),
    });
    await fetchVendas();
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
            <h1 className="text-lg font-bold text-foreground whitespace-nowrap">Venda / Avaria</h1>
          </div>
        </header>

        <main className="w-full space-y-4 p-4 sm:p-6">

          {/* Subtítulo + Botão Nova Venda */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Venda de peças e serviços para cliente final</p>
            <Button
              onClick={openNew}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-md h-9"
            >
              <Plus className="h-4 w-4 mr-1" /> Nova Venda
            </Button>
          </div>

          {/* Busca mobile + filtro status */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 sm:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="BUSCAR POR CLIENTE, VD..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-card border-border"
              />
            </div>
            <div className="relative hidden sm:block flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="BUSCAR POR CLIENTE, VD..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-card border-border"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-9 text-xs bg-card border-border w-full sm:w-52">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="faturada">Faturada</SelectItem>
                <SelectItem value="a_faturar">A Faturar</SelectItem>
                <SelectItem value="liquidada">Liquidada MED</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cards de totais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border-t-2 border-t-emerald-500 border border-border p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Receita Vendas</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(totais.pagas)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">pagas</p>
            </div>
            <div className="bg-card rounded-lg border-t-2 border-t-amber-500 border border-border p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">A Receber</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{formatCurrency(totais.pendentes)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">pendentes</p>
            </div>
            <div className="bg-card rounded-lg border-t-2 border-t-blue-500 border border-border p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Vendas</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{totais.total}</p>
              <p className="text-[10px] text-muted-foreground mt-1">registradas</p>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[90px_1fr_100px_60px_110px_130px_140px_auto] gap-2 px-4 py-2 border-b border-border bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <div>Nº</div>
              <div>Contratante/Cliente</div>
              <div>Data</div>
              <div>Itens</div>
              <div>Total</div>
              <div>Pagamento</div>
              <div>Status</div>
              <div />
            </div>

            {/* Linhas */}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma venda encontrada.
              </div>
            )}

            {filtered.map((v, idx) => {
              const st = statusLabel(v);
              const isMedicao = v.em_medicao;
              const isFirstMedicao = isMedicao && (idx === 0 || !filtered[idx - 1]?.em_medicao);

              return (
                <div key={v.id}>
                  {/* Linha separadora para bloco de medição */}
                  {isFirstMedicao && (
                    <div className="px-4 py-1.5 bg-blue-50 dark:bg-blue-950/20 border-y border-blue-100 dark:border-blue-900/30 text-[10px] text-blue-600 font-medium flex items-center gap-1">
                      ▷ EM MEDIÇÃO — não vão pro Contas a Receber (entram/abatem na medição da placa)
                      <span className="text-emerald-600 font-bold ml-2">
                        +{formatCurrency(filtered.filter(x => x.em_medicao && x.sinal_medicao === "+").reduce((a, x) => a + x.total, 0))}
                      </span>
                      <span className="text-red-600 font-bold ml-1">
                        -{formatCurrency(filtered.filter(x => x.em_medicao && x.sinal_medicao === "-").reduce((a, x) => a + x.total, 0))}
                      </span>
                    </div>
                  )}

                  <div className={`grid grid-cols-[90px_1fr_100px_60px_110px_130px_140px_auto] gap-2 px-4 py-3 border-b border-border items-center text-sm hover:bg-muted/20 transition-colors ${isMedicao ? "bg-blue-50/30 dark:bg-blue-950/10" : ""}`}>

                    {/* Número */}
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-mono">
                        {v.numero}
                      </span>
                    </div>

                    {/* Cliente */}
                    <div className="min-w-0">
                      <span className="font-bold text-foreground text-sm truncate block">
                        {v.cliente}
                      </span>
                      {v.placa_medicao && (
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          {v.placa_medicao}
                        </span>
                      )}
                    </div>

                    {/* Data */}
                    <div className="text-xs text-muted-foreground">
                      {v.data ? new Date(v.data + "T00:00:00").toLocaleDateString("pt-BR") : "-"}
                    </div>

                    {/* Itens */}
                    <div className="text-xs text-center">
                      {isMedicao ? (
                        <span className={`font-bold ${v.sinal_medicao === "+" ? "text-emerald-600" : "text-red-600"}`}>
                          {v.sinal_medicao} {v.items?.length ?? 0}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{v.items?.length ?? 0}</span>
                      )}
                    </div>

                    {/* Total */}
                    <div className="font-bold text-sm text-emerald-600">
                      {formatCurrency(v.total)}
                    </div>

                    {/* Pagamento */}
                    <div className="text-xs text-muted-foreground truncate">
                      {isMedicao ? (
                        <span className={`font-medium ${v.sinal_medicao === "+" ? "text-emerald-600" : "text-red-600"}`}>
                          {v.sinal_medicao === "+" ? "+ Acrescentar" : "– Descontar"} em medição
                        </span>
                      ) : (
                        v.pagamento || "-"
                      )}
                    </div>

                    {/* Status badge */}
                    <div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>
                        • {st.label}
                      </span>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openView(v)}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Visualizar"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {!v.faturada && (
                        <button
                          onClick={() => openEdit(v)}
                          className="p-1.5 rounded text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {!v.faturada && (
                        <button
                          onClick={() => handleFaturar(v)}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-colors"
                        >
                          Faturar
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(v.id)}
                        disabled={deletingId !== null}
                        className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir"
                      >
                        {deletingId === v.id && <span className="absolute bottom-0 left-1 h-0.5 w-5 animate-pulse bg-current" />}
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* ── Modal Visualização ──────────────────────────────────────────────── */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              {selectedVenda?.numero} — {selectedVenda?.cliente}
            </DialogTitle>
            <DialogDescription>Detalhamento da venda</DialogDescription>
          </DialogHeader>

          {selectedVenda && (
            <div className="space-y-4 text-xs">
              {/* Cabeçalho */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
                <div><span className="text-muted-foreground block">Data</span><strong>{new Date(selectedVenda.data + "T00:00:00").toLocaleDateString("pt-BR")}</strong></div>
                <div><span className="text-muted-foreground block">Vencimento</span><strong>{selectedVenda.vencimento ? new Date(selectedVenda.vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "-"}</strong></div>
                <div><span className="text-muted-foreground block">Pagamento</span><strong>{selectedVenda.pagamento || "-"}</strong></div>
                <div><span className="text-muted-foreground block">Status</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusLabel(selectedVenda).color}`}>
                    {statusLabel(selectedVenda).label}
                  </span>
                </div>
                {selectedVenda.placa_medicao && (
                  <div><span className="text-muted-foreground block">Placa Medição</span><strong className="font-mono">{selectedVenda.placa_medicao}</strong></div>
                )}
                {selectedVenda.contato && (
                  <div><span className="text-muted-foreground block">Contato</span><strong>{selectedVenda.contato}</strong></div>
                )}
              </div>

              {/* Itens */}
              <div>
                <p className="font-bold text-foreground mb-2 border-b pb-1 border-border">Itens da Venda</p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-[1fr_60px_80px_80px] gap-2 px-3 py-2 bg-muted/30 text-[10px] font-bold uppercase text-muted-foreground">
                    <div>Descrição</div>
                    <div className="text-center">Qtd</div>
                    <div className="text-right">Valor</div>
                    <div className="text-right">Total</div>
                  </div>
                  {selectedVenda.items?.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_60px_80px_80px] gap-2 px-3 py-2 border-t border-border">
                      <div className="font-medium text-foreground">{item.desc}</div>
                      <div className="text-center text-muted-foreground">{item.qtd}</div>
                      <div className="text-right text-muted-foreground">{formatCurrency(item.val)}</div>
                      <div className="text-right font-bold text-foreground">{formatCurrency(item.qtd * item.val)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totais */}
              <div className="bg-muted/30 rounded-lg border border-border p-3 space-y-1 text-right">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><strong>{formatCurrency(selectedVenda.sub_total)}</strong></div>
                {selectedVenda.desconto > 0 && (
                  <div className="flex justify-between text-red-600"><span>Desconto</span><strong>- {formatCurrency(selectedVenda.desconto)}</strong></div>
                )}
                <div className="flex justify-between text-base border-t pt-1 border-border"><span className="font-bold text-foreground">Total</span><strong className="text-emerald-600">{formatCurrency(selectedVenda.total)}</strong></div>
              </div>

              {selectedVenda.observacoes && (
                <div className="bg-muted/30 p-3 rounded-lg border border-border">
                  <span className="text-muted-foreground block font-bold mb-1">Observações</span>
                  <p className="text-foreground">{selectedVenda.observacoes}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal Cadastro / Edição ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingVenda ? `Editar ${editingVenda.numero}` : "Nova Venda"}
            </DialogTitle>
            <DialogDescription>Preencha os dados da venda e adicione os itens.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">

            {/* Dados gerais */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Cliente</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
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
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={formData.vencimento || ""}
                  onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={formData.pagamento || ""}
                  onValueChange={(val) => setFormData({ ...formData, pagamento: val })}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="À Vista">À Vista</SelectItem>
                    <SelectItem value="Prazo 30d">Prazo 30d</SelectItem>
                    <SelectItem value="Prazo 60d">Prazo 60d</SelectItem>
                    <SelectItem value="➕ Acrescentar em medição">+ Acrescentar em medição</SelectItem>
                    <SelectItem value="➖ Descontar em medição">- Descontar em medição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Contato</Label>
                <Input
                  placeholder="Telefone"
                  value={formData.contato || ""}
                  onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>

            {/* Medição */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border bg-muted/20">
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="em_medicao"
                  checked={formData.em_medicao}
                  onChange={(e) => setFormData({ ...formData, em_medicao: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                <Label htmlFor="em_medicao" className="cursor-pointer">Em Medição</Label>
              </div>
              {formData.em_medicao && (
                <>
                  <div className="space-y-1">
                    <Label>Placa da Medição</Label>
                    <Select
                      value={formData.placa_medicao || ""}
                      onValueChange={(val) =>
                        setFormData({
                          ...formData,
                          placa_medicao: val === "nenhuma" ? "" : val,
                        })
                      }
                    >
                      <SelectTrigger className="bg-input border-border font-mono">
                        <SelectValue placeholder="Selecione a placa..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhuma">Nenhuma</SelectItem>
                        {placas.map((placa) => (
                          <SelectItem key={placa} value={placa}>
                            {placa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Sinal</Label>
                    <Select
                      value={formData.sinal_medicao || "+"}
                      onValueChange={(val) => setFormData({ ...formData, sinal_medicao: val })}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+">+ Acrescentar</SelectItem>
                        <SelectItem value="-">- Descontar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Itens */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">Itens da Venda</Label>

              {/* Adicionar item */}
              <div className="grid grid-cols-[1fr_60px_90px_80px_36px] gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Descrição</Label>
                  <Input
                    placeholder="Ex: M.O OFICINA"
                    value={novoItem.desc}
                    onChange={(e) => setNovoItem({ ...novoItem, desc: e.target.value })}
                    className="bg-input border-border text-xs h-8"
                    onKeyDown={(e) => e.key === "Enter" && adicionarItem()}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Qtd</Label>
                  <Input
                    type="number"
                    min={1}
                    value={novoItem.qtd}
                    onChange={(e) => setNovoItem({ ...novoItem, qtd: Number(e.target.value) })}
                    className="bg-input border-border text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Valor Unit.</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={novoItem.val}
                    onChange={(e) => setNovoItem({ ...novoItem, val: Number(e.target.value) })}
                    className="bg-input border-border text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select
                    value={novoItem.tipo}
                    onValueChange={(val) => setNovoItem({ ...novoItem, tipo: val })}
                  >
                    <SelectTrigger className="bg-input border-border h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Produto">Produto</SelectItem>
                      <SelectItem value="Serviço">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={adicionarItem}
                  className="h-8 w-9 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  title="Adicionar item"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Lista de itens */}
              {formData.items.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-[1fr_50px_80px_80px_32px] gap-2 px-3 py-1.5 bg-muted/30 text-[10px] font-bold uppercase text-muted-foreground">
                    <div>Descrição</div>
                    <div className="text-center">Qtd</div>
                    <div className="text-right">Valor</div>
                    <div className="text-right">Total</div>
                    <div />
                  </div>
                  {formData.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_50px_80px_80px_32px] gap-2 px-3 py-2 border-t border-border items-center text-xs">
                      <div className="font-medium text-foreground truncate">{item.desc}</div>
                      <div className="text-center text-muted-foreground">{item.qtd}</div>
                      <div className="text-right text-muted-foreground">{formatCurrency(item.val)}</div>
                      <div className="text-right font-bold">{formatCurrency(item.qtd * item.val)}</div>
                      <button
                        type="button"
                        onClick={() => removerItem(item.id)}
                        className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desconto + Totais */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1">
                <Label>Desconto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.desconto}
                  onChange={(e) => recalcularForm(formData.items, Number(e.target.value))}
                  className="bg-input border-border"
                />
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-border text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><strong>{formatCurrency(formData.sub_total)}</strong></div>
                {formData.desconto > 0 && (
                  <div className="flex justify-between text-red-600"><span>Desconto</span><strong>- {formatCurrency(formData.desconto)}</strong></div>
                )}
                <div className="flex justify-between text-sm border-t pt-1 border-border"><span className="font-bold">Total</span><strong className="text-emerald-600">{formatCurrency(formData.total)}</strong></div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <Label>Observações</Label>
              <textarea
                rows={2}
                value={formData.observacoes || ""}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                placeholder="Observações opcionais..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground">
              {editingVenda ? "Salvar alterações" : "Cadastrar Venda"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}