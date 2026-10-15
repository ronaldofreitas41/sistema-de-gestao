"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Edit,
  Menu,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContaBancariaSelect } from "@/components/ui/conta-bancaria-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContaReceber } from "@/lib/types";
import { chamarApi, mensagemErro } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SortableTableHead, useSortableData } from "@/components/ui/sortable-table";

const hojeISO = () => new Date().toISOString().slice(0, 10);

const vazio = {
  cliente: "",
  competencia: new Date().toISOString().slice(0, 7),
  valor_total: "",
  observacoes: "",
  data_emissao: hojeISO(),
  data_vencimento: hojeISO(),
};

type Acao = "receber" | "remarcar" | "atrasado" | "retornar_medicao" | "estornar";

const TITULOS: Record<Acao, { titulo: string; descricao: string; botao: string }> = {
  receber: {
    titulo: "Registrar recebimento",
    descricao: "Informe em qual conta o valor entrou. O saldo da conta será atualizado.",
    botao: "Confirmar recebimento",
  },
  remarcar: {
    titulo: "Remarcar vencimento",
    descricao: "O recebimento passa para a nova data e o fluxo de caixa é atualizado.",
    botao: "Remarcar",
  },
  atrasado: {
    titulo: "Marcar como atrasado",
    descricao: "A conta sai do fluxo de caixa e dos recebimentos e passa para Prejuízos.",
    botao: "Enviar para prejuízos",
  },
  retornar_medicao: {
    titulo: "Retornar medição para aguardando",
    descricao: "A conta sai do Contas a Receber e a medição volta a ser editável. Fica registrado na auditoria.",
    botao: "Retornar medição",
  },
  estornar: {
    titulo: "Estornar recebimento",
    descricao: "O valor sai do saldo da conta e a cobrança volta a ficar em aberto.",
    botao: "Estornar",
  },
};

const ROTULO_STATUS: Record<string, string> = {
  pendente: "Pendente",
  pago: "Recebido",
  remarcado: "Remarcado",
  atrasado: "Atrasado",
  renegociado: "Renegociado",
  cancelado: "Cancelado",
};

const COR_STATUS: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  pago: "bg-emerald-100 text-emerald-800",
  remarcado: "bg-blue-100 text-blue-800",
  atrasado: "bg-red-100 text-red-800",
  renegociado: "bg-slate-200 text-slate-700",
  cancelado: "bg-slate-200 text-slate-700",
};

export function ContasReceber() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("abertas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContaReceber | null>(null);
  const [form, setForm] = useState(vazio);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [acao, setAcao] = useState<{ tipo: Acao; conta: ContaReceber } | null>(null);
  const [contaBanco, setContaBanco] = useState("");
  const [dataAcao, setDataAcao] = useState(hojeISO());
  const [motivo, setMotivo] = useState("");
  const [processando, setProcessando] = useState(false);

  async function carregar() {
    const response = await fetch("/api/contas-receber", { credentials: "include" });
    const payload = await response.json();
    setContas(payload.data || []);
  }
  useEffect(() => {
    carregar();
  }, []);

  function novaConta() {
    setEditing(null);
    setForm({ ...vazio, data_emissao: hojeISO(), data_vencimento: hojeISO() });
    setDialogOpen(true);
  }
  function editar(conta: ContaReceber) {
    setEditing(conta);
    setForm({
      cliente: conta.cliente || "",
      competencia: conta.competencia || "",
      valor_total: String(conta.valor_total || ""),
      observacoes: conta.observacoes || "",
      data_emissao: conta.data_emissao?.slice(0, 10) || "",
      data_vencimento: conta.data_vencimento?.slice(0, 10) || "",
    });
    setDialogOpen(true);
  }

  async function salvar() {
    if (!form.cliente.trim()) return alert("Informe o cliente.");
    if (!(Number(form.valor_total) > 0)) return alert("Informe o valor da conta.");
    if (!form.data_vencimento) return alert("Informe o vencimento.");
    try {
      await chamarApi(
        editing ? `/api/contas-receber/${editing.id}` : "/api/contas-receber",
        editing ? "PUT" : "POST",
        {
          ...form,
          status: undefined,
          valor_total: Number(form.valor_total) || 0,
          data_emissao: new Date(form.data_emissao || hojeISO()).toISOString(),
          data_vencimento: new Date(form.data_vencimento).toISOString(),
          ...(editing ? {} : { status: "pendente", vencimento_original: form.data_vencimento }),
        },
      );
      await carregar();
      setDialogOpen(false);
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível salvar a conta."));
    }
  }

  async function excluir(id: string) {
    setDeletingId(id);
    try {
      await chamarApi(`/api/contas-receber/${id}`, "DELETE");
      await carregar();
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível excluir a conta."));
    } finally {
      setDeletingId(null);
    }
  }

  function abrirAcao(tipo: Acao, conta: ContaReceber) {
    setAcao({ tipo, conta });
    setContaBanco("");
    setMotivo("");
    setDataAcao(tipo === "remarcar" ? conta.data_vencimento?.slice(0, 10) || hojeISO() : hojeISO());
  }

  async function confirmarAcao() {
    if (!acao) return;
    const { tipo, conta } = acao;
    if (tipo === "receber" && !contaBanco) return alert("Selecione a conta que recebeu.");
    if (tipo !== "receber" && motivo.trim().length < 5) return alert("Informe o motivo (mínimo 5 caracteres).");
    setProcessando(true);
    try {
      await chamarApi(`/api/contas-receber/${conta.id}/acao`, "POST", {
        acao: tipo,
        conta_banco_id: contaBanco,
        data_recebimento: dataAcao,
        nova_data: dataAcao,
        motivo,
      });
      setAcao(null);
      await carregar();
    } catch (erro) {
      alert(mensagemErro(erro));
    } finally {
      setProcessando(false);
    }
  }

  const filtradas = contas.filter((conta) => {
    const status = conta.status || "pendente";
    const passaStatus =
      filtroStatus === "todas"
        ? true
        : filtroStatus === "abertas"
          ? status === "pendente" || status === "remarcado"
          : status === filtroStatus;
    return (
      passaStatus &&
      `${conta.numero || ""} ${conta.cliente || ""} ${conta.competencia || ""} ${status}`
        .toLowerCase()
        .includes(busca.toLowerCase())
    );
  });
  const {
    sortedItems: contasOrdenadas,
    sortKey,
    sortDirection,
    toggleSort,
  } = useSortableData(filtradas);
  const totalAberto = filtradas.reduce((t, c) => t + (Number(c.valor_total) || 0), 0);
  const setField = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

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
              aria-label="Fechar menu"
              className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-card p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      <div className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}>
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              className="rounded-xl border border-border bg-card p-2 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold sm:text-2xl">Contas a receber</h1>
          </div>
          <Button onClick={novaConta}>
            <Plus className="mr-2 h-4 w-4" />
            Nova conta
          </Button>
        </header>
        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por número, cliente ou competência..."
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                />
              </div>
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v ?? "abertas")}>
                <SelectTrigger className="sm:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abertas">Em aberto (pendentes + remarcadas)</SelectItem>
                  <SelectItem value="pago">Recebidas</SelectItem>
                  <SelectItem value="atrasado">Atrasadas</SelectItem>
                  <SelectItem value="renegociado">Renegociadas</SelectItem>
                  <SelectItem value="todas">Todas</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Lista de contas ({filtradas.length}) — {formatCurrency(totalAberto)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead<ContaReceber> label="Nº" sortKey="numero" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(conta) => conta.numero} />
                      <SortableTableHead<ContaReceber> label="Cliente" sortKey="cliente" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(conta) => conta.cliente} />
                      <SortableTableHead<ContaReceber> label="Competência" sortKey="competencia" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(conta) => conta.competencia} />
                      <SortableTableHead<ContaReceber> label="Vencimento" sortKey="data_vencimento" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(conta) => conta.data_vencimento} />
                      <SortableTableHead<ContaReceber> label="Valor" sortKey="valor_total" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(conta) => Number(conta.valor_total) || 0} />
                      <SortableTableHead<ContaReceber> label="Status" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(conta) => conta.status} />
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasOrdenadas.map((conta) => {
                      const status = conta.status || "pendente";
                      const aberta = status === "pendente" || status === "remarcado";
                      const remarcada =
                        conta.vencimento_original &&
                        conta.data_vencimento &&
                        conta.vencimento_original.slice(0, 10) !== conta.data_vencimento.slice(0, 10);
                      return (
                        <TableRow key={conta.id}>
                          <TableCell className="font-mono text-xs">{conta.numero || "-"}</TableCell>
                          <TableCell className="font-medium">{conta.cliente || "-"}</TableCell>
                          <TableCell>{conta.competencia || "-"}</TableCell>
                          <TableCell>
                            {formatDate(conta.data_vencimento)}
                            {remarcada && (
                              <span className="block text-[11px] text-muted-foreground">
                                original {formatDate(conta.vencimento_original)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(Number(conta.valor_total || 0))}</TableCell>
                          <TableCell>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_STATUS[status] ?? "bg-slate-100"}`}>
                              {ROTULO_STATUS[status] ?? status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              {aberta && (
                                <>
                                  <Button variant="ghost" size="icon" title="Registrar recebimento" onClick={() => abrirAcao("receber", conta)}>
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" title="Remarcar vencimento" onClick={() => abrirAcao("remarcar", conta)}>
                                    <CalendarClock className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" title="Marcar como atrasado (prejuízo)" onClick={() => abrirAcao("atrasado", conta)}>
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                  </Button>
                                  {conta.medicao_id && (
                                    <Button variant="ghost" size="icon" title="Retornar medição para aguardando" onClick={() => abrirAcao("retornar_medicao", conta)}>
                                      <Undo2 className="h-4 w-4 text-amber-600" />
                                    </Button>
                                  )}
                                </>
                              )}
                              {status === "pago" && (
                                <Button variant="ghost" size="icon" title="Estornar recebimento" onClick={() => abrirAcao("estornar", conta)}>
                                  <RotateCcw className="h-4 w-4 text-amber-600" />
                                </Button>
                              )}
                              {status === "pendente" && !conta.medicao_id && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => editar(conta)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" disabled={deletingId === conta.id} onClick={() => excluir(conta.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar conta a receber" : "Nova conta a receber"}</DialogTitle>
            <DialogDescription>
              O número é gerado automaticamente. Contas de medições são criadas ao aprovar a medição.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={form.cliente} onChange={(e) => setField("cliente", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Competência</Label>
                <Input type="month" value={form.competencia} onChange={(e) => setField("competencia", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Valor total</Label>
                <Input type="number" step="0.01" value={form.valor_total} onChange={(e) => setField("valor_total", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Emissão</Label>
                <Input type="date" value={form.data_emissao} onChange={(e) => setField("data_emissao", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input type="date" value={form.data_vencimento} onChange={(e) => setField("data_vencimento", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={(e) => setField("observacoes", e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={salvar}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!acao} onOpenChange={(aberto) => !aberto && setAcao(null)}>
        <DialogContent>
          {acao && (
            <>
              <DialogHeader>
                <DialogTitle>{TITULOS[acao.tipo].titulo}</DialogTitle>
                <DialogDescription>
                  {acao.conta.numero} — {acao.conta.cliente} — {formatCurrency(Number(acao.conta.valor_total || 0))}
                  <br />
                  {TITULOS[acao.tipo].descricao}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {acao.tipo === "receber" && (
                  <>
                    <div className="space-y-2">
                      <Label>Conta que recebeu</Label>
                      <ContaBancariaSelect value={contaBanco} onChange={setContaBanco} />
                    </div>
                    <div className="space-y-2">
                      <Label>Data do recebimento</Label>
                      <Input type="date" value={dataAcao} onChange={(e) => setDataAcao(e.target.value)} />
                    </div>
                  </>
                )}
                {acao.tipo === "remarcar" && (
                  <div className="space-y-2">
                    <Label>Nova data de vencimento</Label>
                    <Input type="date" value={dataAcao} onChange={(e) => setDataAcao(e.target.value)} />
                  </div>
                )}
                {acao.tipo !== "receber" && (
                  <div className="space-y-2">
                    <Label>Motivo (auditoria)</Label>
                    <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo" />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAcao(null)}>Cancelar</Button>
                  <Button onClick={confirmarAcao} disabled={processando}>
                    {processando ? "Processando..." : TITULOS[acao.tipo].botao}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
