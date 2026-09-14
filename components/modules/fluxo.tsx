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
  Plus,
  Search,
  Edit,
  Trash2,
  Menu,
  X,
  Landmark,
  Building2,
  TrendingUp,
  TrendingDown,
  Scale,
  CalendarCheck,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { formatCurrency } from "@/lib/utils";
import { ContasBancarias } from "@/lib/types";
import { PageSizeSelect, PaginationControls, paginate } from "@/components/ui/pagination";

export function Fluxo() {
  const [contas, setContas] = useState<ContasBancarias[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContasBancarias | null>(
    null,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mesAno, setMesAno] = useState("2026-09");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function fetchContas() {
    try {
      const res = await fetch("/api/contas-bancarias");
      const responseData = await res.json();
      setContas(Array.isArray(responseData) ? responseData : Array.isArray(responseData?.data) ? responseData.data : []);
    } catch (error) {
      console.error("Erro ao carregar contas bancárias:", error);
    }
  }

  useEffect(() => {
    fetchContas();
  }, []);

  const [formData, setFormData] = useState({
    banco: "",
    nome: "",
    conta: "",
    tipo: "",
    saldo: "",
    saldo_polpanca: "",
    fluxo: true,
    agencia: "",
  });

  const filteredContas = contas.filter((c) => {
    const term = search.toLowerCase();
    return (
      (c.conta?.toLowerCase() || "").includes(term) ||
      (c.banco?.toLowerCase() || "").includes(term) ||
      (c.agencia.toLowerCase() || "").includes(term) ||
      (c.conta?.toLowerCase() || "").includes(term)
    );
  });

  const saldoTotal = contas.reduce(
    (acc, c: ContasBancarias) =>
      acc + (Number(c.saldo) || 0) + (Number(c.saldo_polpanca) || 0),
    0,
  );

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const paginatedContas = paginate(filteredContas, page, pageSize);

  const openNewConta = () => {
    setEditingConta(null);
    setFormData({
      banco: "",
      nome: "",
      conta: "",
      tipo: "",
      saldo: "",
      saldo_polpanca: "",
      fluxo: true,
      agencia: "",
    });
    setDialogOpen(true);
  };

  const openEditConta = (conta: ContasBancarias) => {
    setEditingConta(conta);
    setFormData({
      banco: conta.banco || "",
      nome: conta.nome || "",
      conta: conta.conta || "",
      tipo: conta.tipo || "Corrente",
      saldo: conta.saldo ? String(conta.saldo) : "0",
      saldo_polpanca: conta.saldo_polpanca ? String(conta.saldo_polpanca) : "0",
      fluxo: conta.fluxo ?? true,
      agencia: conta.agencia || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      saldo: Number(formData.saldo) || 0,
      saldo_polpanca: Number(formData.saldo_polpanca) || 0,
    };

    if (editingConta) {
      await fetch(`/api/contas-bancarias/${editingConta.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/contas-bancarias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await fetchContas();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string | number) => {
    await fetch(`/api/contas-bancarias/${id}`, {
      method: "DELETE",
    });
    setContas((prev) => prev.filter((c) => c.id !== id));
    await fetchContas();
  };

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
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl border border-border bg-card p-2 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-foreground">
              Fluxo de Caixa
            </h1>
          </div>
        </header>

        <main className="mx-auto w-full space-y-6 p-4 sm:p-6">
          {/* Seção Contas Bancárias */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Landmark className="h-5 w-5 text-muted-foreground" />
                Contas Bancárias
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar conta..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-44 pl-8 text-xs bg-input border-border"
                  />
                </div>
                <PageSizeSelect pageSize={pageSize} onChange={setPageSize} options={[5, 10, 25, 50]} />
                <Button
                  onClick={openNewConta}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-md h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Conta
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Search className="h-3.5 w-3.5 mr-1" /> Conferir baixas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground">
                        Nome
                      </TableHead>
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground">
                        Banco
                      </TableHead>
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground">
                        Agencia/Conta
                      </TableHead>
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground">
                        Tipo
                      </TableHead>
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground">
                        Saldo
                      </TableHead>
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground">
                        Poup./Aplic.
                      </TableHead>
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground">
                        Fluxo
                      </TableHead>
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedContas.map((c) => (
                      <TableRow key={c.id} className="border-border">
                        <TableCell className="font-bold text-foreground uppercase">
                          {c.nome}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground uppercase">
                          {c.banco}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {c.agencia} / {c.conta}
                        </TableCell>
                        <TableCell>
                          <span className="text-[11px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium border dark:bg-blue-100 dark:text-blue-600">
                            • {c.tipo}
                          </span>
                        </TableCell>
                        <TableCell
                          className={`font-bold text-sm ${
                            c.saldo < 0 ? "text-red-600" : "text-emerald-600"
                          }`}
                        >
                          {formatCurrency(Number(c.saldo))}
                        </TableCell>
                        <TableCell className="text-xs text-blue-600 font-medium">
                          {formatCurrency(Number(c.saldo_polpanca || 0))}
                        </TableCell>
                        <TableCell>
                          <span className="text-[11px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                            • {c.fluxo !== false ? "Sim" : "Não"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            >
                              Acerto
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditConta(c)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-600"
                              onClick={() => handleDelete(c.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <PaginationControls
                page={page}
                pageSize={pageSize}
                total={filteredContas.length}
                onPageChange={setPage}
              />

              {/* Card Saldo Total */}
              <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-600 flex items-center justify-between text-xs dark:bg-red-100 dark:border-red-600">
                <span className="text-muted-foreground">
                  Saldo Total (contas + poupança/aplicação):
                </span>
                <span
                  className={`text-base font-bold ${saldoTotal < 0 ? "text-red-600" : "text-emerald-600"}`}
                >
                  {formatCurrency(saldoTotal)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cabeçalho do Fluxo */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Fluxo de caixa — entradas e saídas
            </span>
            <div className="flex items-center gap-2">
              <Select
                value={mesAno}
                onValueChange={(value) => {
                  if (value) setMesAno(value);
                }}
              >
                <SelectTrigger className="w-30 h-8 text-xs bg-card border-border">
                  <SelectValue placeholder={mesAno} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(2026, 8 - i, 1); // começa em set/2026
                    const val = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                    return (
                      <SelectItem key={val} value={val}>
                        {val}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Enquadramento das Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-l-4 border-l-emerald-500 border-border">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Entradas do Mês
                </p>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  R$ 0,00
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-l-4 border-l-red-500 border-border">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Saídas do Mês
                </p>
                <p className="text-2xl font-black text-red-600 mt-1">R$ 0,00</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-l-4 border-l-blue-500 border-border">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Saldo do Mês
                </p>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  R$ 0,00
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-l-4 border-l-red-600 border-border">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  A Pagar no Mês
                </p>
                <p className="text-2xl font-black text-red-600 mt-1">
                  R$ 140.233,58
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Barra Informativa */}
          <div className="p-3 bg-card border border-border rounded-lg text-xs flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              <span>
                Mês anterior (2026-08) — Recebido{" "}
                <strong className="text-emerald-600">R$ 154.403,48</strong> ·
                Pago <strong className="text-red-600">R$ 437.350,23</strong>
              </span>
            </div>
            <div>
              Este mês — Recebido{" "}
              <strong className="text-emerald-600">R$ 0,00</strong> · Pago{" "}
              <strong className="text-red-600">R$ 0,00</strong> · A pagar{" "}
              <strong className="text-red-600">R$ 140.233,58</strong>
            </div>
          </div>

          <div className="p-3 bg-blue-900 text-white rounded-lg text-xs flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-300 shrink-0" />
            <span>
              <strong>7 lançamento(s)</strong> constam como pagos mas{" "}
              <strong>não têm a data do pagamento guardada</strong> (R$ 2.074,00
              no total). Por isso não entram no mês — fluxo de caixa é pela data
              em que o dinheiro andou. Eles continuam inteiros nas telas de
              Contas a Pagar e Contas a Receber.
            </span>
          </div>

          {/* Tabelas de Entradas e Saídas lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="py-3 px-4 border-b border-border">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Entradas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs text-muted-foreground">
                Nada recebido neste mês ainda
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="py-3 px-4 border-b border-border">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" /> Saídas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs text-muted-foreground">
                Nada pago neste mês ainda
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Modal / Dialog Conta Bancária */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingConta ? "Editar Conta Bancária" : "Nova Conta Bancária"}
            </DialogTitle>
            <DialogDescription>
              Insira os dados da conta corrente ou aplicação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="conta">Nome da Conta / Identificação</Label>
              <Input
                id="conta"
                placeholder="Ex: BRADESCO, BRADESCO PJ"
                value={formData.conta}
                onChange={(e) =>
                  setFormData({ ...formData, conta: e.target.value })
                }
                className="bg-input border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="banco">Banco</Label>
                <Input
                  id="banco"
                  placeholder="Ex: BRADESCO"
                  value={formData.banco}
                  onChange={(e) =>
                    setFormData({ ...formData, banco: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agencia">Agência</Label>
                <Input
                  id="agencia"
                  placeholder="1503"
                  value={formData.agencia}
                  onChange={(e) =>
                    setFormData({ ...formData, agencia: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conta">Conta</Label>
                <Input
                  id="conta"
                  placeholder="26197-1"
                  value={formData.conta}
                  onChange={(e) =>
                    setFormData({ ...formData, conta: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(val) =>
                    setFormData({ ...formData, tipo: val ?? "" })
                  }
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Corrente">Corrente</SelectItem>
                    <SelectItem value="Poupança">Poupança</SelectItem>
                    <SelectItem value="Investimento">Investimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="saldo">Saldo (R$)</Label>
                <Input
                  id="saldo"
                  type="number"
                  step="0.01"
                  value={formData.saldo}
                  onChange={(e) =>
                    setFormData({ ...formData, saldo: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="saldo_polpanca">Poupança / Aplicação (R$)</Label>
              <Input
                id="saldo_polpanca"
                type="number"
                step="0.01"
                value={formData.saldo_polpanca}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    saldo_polpanca: e.target.value,
                  })
                }
                className="bg-input border-border"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary text-primary-foreground"
            >
              {editingConta ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
