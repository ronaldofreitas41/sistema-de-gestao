"use client";

import { useEffect, useState } from "react";
import {
  Calculator,
  Edit,
  Menu,
  Plus,
  Search,
  Trash2,
  X,
  FileDown,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Medicao } from "@/lib/types";
import {
  deleteRegistro,
  formatCurrency,
  formatDate,
  gerarPdfMedicao,
  getPlacas,
} from "@/lib/utils";

type MedicaoApi = Medicao & {
  tipo_cobranca?: string | null;
  valor_terceiro?: string | number | null;
  horas_extras?: string | number | null;
  valor_hora_extra?: string | number | null;
};

type Parceiro = {
  id: string | number;
  nome: string;
};

type FormData = {
  placas: string;
  tipo_cobranca: string;
  valor: string;
  quantidade_horas: string;
  terceiro: string;
  valor_terceiro: string;
  horas_extras: string;
  valor_hora_extra: string;
  data_medicao: string;
  parceiro: string;
  observacoes: string;
  status: string;
  periodo: string;
  obs_internas: string;
};

const formularioInicial: FormData = {
  placas: "",
  tipo_cobranca: "",
  valor: "",
  quantidade_horas: "0",
  terceiro: "nao",
  valor_terceiro: "",
  horas_extras: "0",
  valor_hora_extra: "0",
  data_medicao: new Date().toISOString().slice(0, 10),
  parceiro: "",
  observacoes: "",
  status: "pendente",
  periodo: new Date().toISOString().slice(0, 7),
  obs_internas: "",
};



function placasDoFormulario(placas: string) {
  return placas
    .split(",")
    .map((placa) => placa.trim())
    .filter(Boolean);
}

export function Medicoes() {
  const [medicoes, setMedicoes] = useState<MedicaoApi[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [placasDisponiveis, setPlacasDisponiveis] = useState<string[]>([]);
  const [placaSelecionada, setPlacaSelecionada] = useState("");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MedicaoApi | null>(null);
  const [form, setForm] = useState<FormData>(formularioInicial);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function carregar() {
    const response = await fetch("/api/medicoes");
    const payload = await response.json();
    setMedicoes(payload.data || []);
  }

  useEffect(() => {
    carregar();
    getPlacas().then(setPlacasDisponiveis);
    fetch("/api/parceiros")
      .then((response) => response.json())
      .then((payload) => setParceiros(payload.data || []));
  }, []);

  function alterarCampo(campo: keyof FormData, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function alterarTipoCobranca(valor: string) {
    setForm((atual) => ({
      ...atual,
      tipo_cobranca: valor,
      quantidade_horas: valor === "Valor por Hora" ? atual.quantidade_horas : "0",
    }));
  }

  function alterarTipoTerceiro(valor: string) {
    setForm((atual) => ({
      ...atual,
      terceiro: valor,
      parceiro: valor === "sim" ? atual.parceiro : "",
      valor_terceiro: valor === "sim" ? atual.valor_terceiro : "",
    }));
  }

  function adicionarPlaca() {
    if (!placaSelecionada) return;
    const placas = placasDoFormulario(form.placas);
    if (placas.includes(placaSelecionada)) return;

    alterarCampo("placas", [...placas, placaSelecionada].join(", "));
    setPlacaSelecionada("");
  }

  function removerPlaca(placa: string) {
    alterarCampo(
      "placas",
      placasDoFormulario(form.placas)
        .filter((atual) => atual !== placa)
        .join(", "),
    );
  }

  function novaMedicao() {
    setEditing(null);
    setForm({
      ...formularioInicial,
      data_medicao: new Date().toISOString().slice(0, 10),
      periodo: new Date().toISOString().slice(0, 7),
    });
    setPlacaSelecionada("");
    setDialogOpen(true);
  }

  function editar(medicao: MedicaoApi) {
    setEditing(medicao);
    setForm({
      placas: medicao.placas?.join(", ") || "",
      tipo_cobranca: medicao.tipo_cobranca || medicao.tipoCobranca || "",
      valor: String(medicao.valor || ""),
      quantidade_horas: String(medicao.horas_extras || "0"),
      terceiro: medicao.terceiro ? "sim" : "nao",
      valor_terceiro: String(medicao.valor_terceiro || ""),
      horas_extras: String(medicao.horas_extras || "0"),
      valor_hora_extra: String(
        medicao.valor_hora_extra || medicao.valor_horas_extras || "0",
      ),
      data_medicao: medicao.data_medicao?.slice(0, 10) || "",
      parceiro: medicao.parceiro || "",
      observacoes: medicao.observacoes || "",
      status: medicao.status || "pendente",
      periodo: medicao.periodo || "",
      obs_internas: medicao.obs_internas || "",
    });
    setPlacaSelecionada("");
    setDialogOpen(true);
  }

  async function salvar() {
    const valorHora = Number(form.valor) || 0;
    const quantidadeHoras = Number(form.quantidade_horas) || 0;
    const payload = {
      placas: placasDoFormulario(form.placas),
      tipo_cobranca: form.tipo_cobranca,
      valor:
        form.tipo_cobranca === "Valor por Hora"
          ? valorHora * quantidadeHoras
          : valorHora,
      terceiro: form.terceiro === "sim",
      valor_terceiro: Number(form.valor_terceiro) || 0,
      horas_extras: ehValorPorHora
        ? quantidadeHoras
        : Number(form.horas_extras) || 0,
      valor_hora_extra: Number(form.valor_hora_extra) || 0,
      data_medicao: new Date(form.data_medicao).toISOString(),
      parceiro: form.parceiro,
      observacoes: form.observacoes,
      status: form.status,
      periodo: form.periodo,
      obs_internas: form.obs_internas,
    };

    await fetch(editing ? `/api/medicoes/${editing.id}` : "/api/medicoes", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await carregar();
    setDialogOpen(false);
  }

  async function excluir(id: string) {
    setDeletingId(id);
    try {
      await deleteRegistro(`/api/medicoes/${id}`);
      await carregar();
    } finally {
      setDeletingId(null);
    }
  }

  const filtradas = medicoes.filter((medicao) =>
    `${medicao.parceiro || ""} ${medicao.periodo || ""} ${(medicao.placas || []).join(" ")}`
      .toLowerCase()
      .includes(busca.toLowerCase()),
  );
  const placasAdicionadas = placasDoFormulario(form.placas);
  const ehValorPorHora = form.tipo_cobranca === "Valor por Hora";
  const ehTerceiro = form.terceiro === "sim";

  return (
    <div className="min-h-screen bg-background text-foreground">
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
              aria-label="Fechar menu"
              className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-card p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div
        className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}
      >
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
            <h1 className="text-lg font-bold sm:text-2xl">Medições</h1>
          </div>
          <Button onClick={novaMedicao}>
            <Plus className="mr-2 h-4 w-4" />
            Nova medição
          </Button>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          <Card>
            <CardContent className="pt-6">
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por parceiro, período ou placa..."
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Lista de medições ({filtradas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Placas</TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((medicao) => (
                      <TableRow key={medicao.id}>
                        <TableCell>{medicao.periodo || "-"}</TableCell>
                        <TableCell>
                          {medicao.placas?.join(", ") || "-"}
                        </TableCell>
                        <TableCell>{medicao.parceiro || "-"}</TableCell>
                        <TableCell>
                          {medicao.tipo_cobranca || medicao.tipoCobranca || "-"}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(Number(medicao.valor || 0))}
                        </TableCell>
                        <TableCell>{medicao.status}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Gerar PDF da medição"
                            onClick={() => gerarPdfMedicao(medicao)}
                          >
                            <FileDown className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editar(medicao)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === medicao.id}
                            onClick={() => excluir(medicao.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar medição" : "Nova medição"}
            </DialogTitle>
            <DialogDescription>
              Informe os dados da medição. Ao salvar, a conta a receber será
              criada automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Placas</Label>
              <div className="flex gap-2">
                <Select
                  value={placaSelecionada}
                  onValueChange={setPlacaSelecionada}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione uma placa" />
                  </SelectTrigger>
                  <SelectContent>
                    {placasDisponiveis.map((placa) => (
                      <SelectItem
                        key={placa}
                        value={placa}
                        disabled={placasAdicionadas.includes(placa)}
                      >
                        {placa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  onClick={adicionarPlaca}
                  disabled={!placaSelecionada}
                  aria-label="Adicionar placa"
                  title="Adicionar placa"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-border bg-slate-50 p-2">
                {placasAdicionadas.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Nenhuma placa adicionada.
                  </span>
                )}
                {placasAdicionadas.map((placa) => (
                  <div
                    key={placa}
                    className="flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => removerPlaca(placa)}
                      aria-label={`Remover placa ${placa}`}
                      title={`Remover placa ${placa}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span>{placa}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de cobrança</Label>
              <Select
                value={form.tipo_cobranca}
                onValueChange={alterarTipoCobranca}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Valor Direito">Valor Direto</SelectItem>
                  <SelectItem value="Valor por Hora">Valor por Hora</SelectItem>
                  <SelectItem value="Valor Mensal">Valor Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{ehValorPorHora ? "Valor da hora" : "Valor"}</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => alterarCampo("valor", e.target.value)}
              />
            </div>
            {ehValorPorHora && (
              <div className="space-y-2">
                <Label>Quantidade de horas</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.quantidade_horas}
                  onChange={(e) =>
                    alterarCampo("quantidade_horas", e.target.value)
                  }
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>É de terceiro?</Label>
              <Select
                value={form.terceiro}
                onValueChange={alterarTipoTerceiro}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ehTerceiro && (
              <div className="space-y-2">
                <Label>Valor do terceiro</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor_terceiro}
                  onChange={(e) =>
                    alterarCampo("valor_terceiro", e.target.value)
                  }
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Data da medição</Label>
              <Input
                type="date"
                value={form.data_medicao}
                onChange={(e) => alterarCampo("data_medicao", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Input
                type="month"
                value={form.periodo}
                onChange={(e) => alterarCampo("periodo", e.target.value)}
              />
            </div>
            {ehTerceiro && (
              <div className="space-y-2">
                <Label>Parceiro</Label>
                <Select
                  value={form.parceiro}
                  onValueChange={(value) => alterarCampo("parceiro", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o parceiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {parceiros.map((parceiro) => (
                      <SelectItem key={parceiro.id} value={parceiro.nome}>
                        {parceiro.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label>Observações</Label>
              <Input
                value={form.observacoes}
                onChange={(e) => alterarCampo("observacoes", e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar}>
              {editing ? "Salvar alterações" : "Criar medição"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
