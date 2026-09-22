"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Gauge,
  Menu,
  Pencil,
  Phone,
  Plus,
  Search,
  TimerReset,
  X,
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

type Equipamento = {
  id: string | number;
  placa?: string | null;
  tipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
};

type Manutencao = {
  id: string;
  osNum?: string | null;
  eqId?: string | null;
  placa?: string | null;
  tipo?: string | null;
  en?: string | null;
  km?: string | number | null;
  hr?: string | number | null;
};

type Revisao = {
  id: string | number;
  equipamento_id?: string | number | null;
  km_atual?: string | number | null;
  km_proxima?: string | number | null;
  horas_atual?: string | number | null;
  horas_proxima?: string | number | null;
  data_realizacao?: string | null;
  status?: string | null;
  observacoes?: string | null;
};

type FormData = {
  equipamentoId: string;
  dataContato: string;
  contato: string;
  telefone: string;
  telefone2: string;
  ultimaRevisaoKm: string;
  ultimaRevisaoHr: string;
  intervaloKm: string;
  intervaloHr: string;
  kmAtual: string;
  hrAtual: string;
  observacoes: string;
};

const formularioInicial: FormData = {
  equipamentoId: "",
  dataContato: new Date().toISOString().slice(0, 10),
  contato: "",
  telefone: "",
  telefone2: "",
  ultimaRevisaoKm: "",
  ultimaRevisaoHr: "",
  intervaloKm: "",
  intervaloHr: "",
  kmAtual: "",
  hrAtual: "",
  observacoes: "",
};

function numero(valor?: string | number | null) {
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : 0;
}

function formatarNumero(valor: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
    valor,
  );
}

function lerObservacoes(
  valor?: string | null,
): Partial<FormData> & { ultimaOs?: string } {
  if (!valor) return {};

  try {
    const dados = JSON.parse(valor);
    return typeof dados === "object" && dados ? dados : { observacoes: valor };
  } catch {
    return { observacoes: valor };
  }
}

function nomeEquipamento(equipamento?: Equipamento) {
  if (!equipamento) return "Equipamento não identificado";
  return [
    equipamento.placa,
    equipamento.tipo,
    equipamento.marca,
    equipamento.modelo,
  ]
    .filter(Boolean)
    .join(" - ");
}

function calcularSituacao(form: FormData) {
  const kmLimite = numero(form.ultimaRevisaoKm) + numero(form.intervaloKm);
  const hrLimite = numero(form.ultimaRevisaoHr) + numero(form.intervaloHr);
  const kmInformado = numero(form.kmAtual);
  const hrInformado = numero(form.hrAtual);
  const kmUsado = Boolean(form.kmAtual && form.intervaloKm);
  const hrUsado = Boolean(form.hrAtual && form.intervaloHr);
  const vencida =
    (kmUsado && kmInformado >= kmLimite) ||
    (hrUsado && hrInformado >= hrLimite);

  return {
    kmLimite,
    hrLimite,
    faltaKm: kmUsado ? kmLimite - kmInformado : null,
    faltaHr: hrUsado ? hrLimite - hrInformado : null,
    vencida,
  };
}

export default function AcompRevisaoPage() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [revisoes, setRevisoes] = useState<Revisao[]>([]);
  const [form, setForm] = useState<FormData>(formularioInicial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Revisao | null>(null);
  const [busca, setBusca] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [equipamentosResponse, manutencoesResponse, revisoesResponse] =
        await Promise.all([
          fetch("/api/equipamentos"),
          fetch("/api/manutencoes"),
          fetch("/api/revisoes"),
        ]);
      const [equipamentosPayload, manutencoesPayload, revisoesPayload] =
        await Promise.all([
          equipamentosResponse.json(),
          manutencoesResponse.json(),
          revisoesResponse.json(),
        ]);

      setEquipamentos(equipamentosPayload.data || []);
      setManutencoes(manutencoesPayload.data || []);
      setRevisoes(revisoesPayload.data || []);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function alterar(campo: keyof FormData, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function ultimaPreventiva(equipamentoId: string) {
    return manutencoes
      .filter(
        (item) =>
          String(item.eqId) === equipamentoId &&
          (item.tipo || "").toLowerCase().includes("preventiva"),
      )
      .sort((a, b) => String(b.en || "").localeCompare(String(a.en || "")))[0];
  }

  function preencherEquipamento(id: string) {
    alterar("equipamentoId", id);
    const ultima = ultimaPreventiva(id);
    const registro = revisoes.find(
      (item) => String(item.equipamento_id) === id,
    );
    const dados = lerObservacoes(registro?.observacoes);

    if (ultima && !registro) {
      setForm((atual) => ({
        ...atual,
        equipamentoId: id,
        ultimaRevisaoKm: String(ultima.km || ""),
        ultimaRevisaoHr: String(ultima.hr || ""),
        observacoes: `Última OS preventiva: ${ultima.osNum || "não informada"}`,
      }));
    }

    if (registro) {
      setForm((atual) => ({
        ...atual,
        equipamentoId: id,
        dataContato:
          registro.data_realizacao?.slice(0, 10) || atual.dataContato,
        ultimaRevisaoKm: String(registro.km_atual || ""),
        ultimaRevisaoHr: String(registro.horas_atual || ""),
        intervaloKm: String(dados.intervaloKm || ""),
        intervaloHr: String(dados.intervaloHr || ""),
        kmAtual: String(dados.kmAtual || ""),
        hrAtual: String(dados.hrAtual || ""),
        contato: dados.contato || "",
        telefone: dados.telefone || "",
        telefone2: dados.telefone2 || "",
        observacoes: dados.observacoes || "",
      }));
    }
  }

  function abrirNovo() {
    setEditing(null);
    setForm({
      ...formularioInicial,
      dataContato: new Date().toISOString().slice(0, 10),
    });
    setDialogOpen(true);
  }

  function abrirEdicao(revisao: Revisao) {
    setEditing(revisao);
    const dados = lerObservacoes(revisao.observacoes);
    setForm({
      ...formularioInicial,
      equipamentoId: String(revisao.equipamento_id || ""),
      dataContato:
        revisao.data_realizacao?.slice(0, 10) || formularioInicial.dataContato,
      ultimaRevisaoKm: String(revisao.km_atual || ""),
      ultimaRevisaoHr: String(revisao.horas_atual || ""),
      intervaloKm: String(dados.intervaloKm || ""),
      intervaloHr: String(dados.intervaloHr || ""),
      kmAtual: String(dados.kmAtual || ""),
      hrAtual: String(dados.hrAtual || ""),
      contato: dados.contato || "",
      telefone: dados.telefone || "",
      telefone2: dados.telefone2 || "",
      observacoes: dados.observacoes || "",
    });
    setDialogOpen(true);
  }

  async function salvar() {
    if (!form.equipamentoId || salvando) return;
    setSalvando(true);
    const calculo = calcularSituacao(form);
    const dados = {
      ultimaOs: ultimaPreventiva(form.equipamentoId)?.osNum || "",
      intervaloKm: form.intervaloKm,
      intervaloHr: form.intervaloHr,
      kmAtual: form.kmAtual,
      hrAtual: form.hrAtual,
      contato: form.contato,
      telefone: form.telefone,
      telefone2: form.telefone2,
      observacoes: form.observacoes,
    };
    const payload = {
      equipamento_id: form.equipamentoId,
      tipo: "Acompanhamento de revisão",
      km_atual: form.ultimaRevisaoKm || null,
      km_proxima: calculo.kmLimite || null,
      horas_atual: form.ultimaRevisaoHr || null,
      horas_proxima: calculo.hrLimite || null,
      data_realizacao: form.dataContato || null,
      status: calculo.vencida ? "vencida" : "em_dia",
      observacoes: JSON.stringify(dados),
    };

    try {
      const response = await fetch(
        editing ? `/api/revisoes/${editing.id}` : "/api/revisoes",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok)
        throw new Error("Não foi possível salvar o acompanhamento.");
      await carregar();
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar o acompanhamento de revisão.");
    } finally {
      setSalvando(false);
    }
  }

  const registros = useMemo(() => {
    return revisoes
      .map((revisao) => {
        const equipamento = equipamentos.find(
          (item) => String(item.id) === String(revisao.equipamento_id),
        );
        const dados = lerObservacoes(revisao.observacoes);
        const kmAtual = numero(dados.kmAtual);
        const hrAtual = numero(dados.hrAtual);
        const faltaKm =
          revisao.km_proxima == null || !dados.kmAtual
            ? null
            : numero(revisao.km_proxima) - kmAtual;
        const faltaHr =
          revisao.horas_proxima == null || !dados.hrAtual
            ? null
            : numero(revisao.horas_proxima) - hrAtual;
        const vencida =
          (faltaKm !== null && faltaKm <= 0) ||
          (faltaHr !== null && faltaHr <= 0) ||
          revisao.status === "vencida";
        return { revisao, equipamento, dados, faltaKm, faltaHr, vencida };
      })
      .filter(
        ({ equipamento, dados }) =>
          nomeEquipamento(equipamento)
            .toLowerCase()
            .includes(busca.toLowerCase()) ||
          String(dados.contato || "")
            .toLowerCase()
            .includes(busca.toLowerCase()),
      );
  }, [revisoes, equipamentos, busca]);

  const vencidas = registros.filter((item) => item.vencida).length;

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
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Controle de frota
              </p>
              <h1 className="text-lg font-bold sm:text-2xl">Acomp. Revisão</h1>
            </div>
          </div>
          <Button onClick={abrirNovo}>
            <Plus className="mr-2 h-4 w-4" />
            Novo acompanhamento
          </Button>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Acompanhamentos
                  </p>
                  <p className="mt-1 text-2xl font-bold">{registros.length}</p>
                </div>
                <TimerReset className="h-6 w-6 text-primary" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Revisões vencidas
                  </p>
                  <p className="mt-1 text-2xl font-bold text-destructive">
                    {vencidas}
                  </p>
                </div>
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Regra de alerta
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    KM ou horímetro, o primeiro
                  </p>
                </div>
                <Gauge className="h-6 w-6 text-amber-600" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por placa ou contato..."
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                A base de cálculo é a última OS preventiva + os intervalos
                informados.
              </p>
            </CardContent>
          </Card>

          {carregando ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Carregando acompanhamentos...
              </CardContent>
            </Card>
          ) : registros.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nenhum acompanhamento lançado.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {registros.map(
                ({
                  revisao,
                  equipamento,
                  dados,
                  faltaKm,
                  faltaHr,
                  vencida,
                }) => (
                  <Card
                    key={String(revisao.id)}
                    className={vencida ? "border-destructive/40" : ""}
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border">
                      <div>
                        <CardTitle className="text-base">
                          {nomeEquipamento(equipamento)}
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Última OS preventiva:{" "}
                          {dados.ultimaOs || "Não informada"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Editar acompanhamento"
                        aria-label="Editar acompanhamento"
                        onClick={() => abrirEdicao(revisao)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-5">
                      <div
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${vencida ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-700"}`}
                      >
                        {vencida ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {vencida ? "REVISÃO VENCIDA" : "Em dia"}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">
                            Falta de KM
                          </p>
                          <p
                            className={`mt-1 font-semibold ${faltaKm !== null && faltaKm <= 0 ? "text-destructive" : ""}`}
                          >
                            {faltaKm === null
                              ? "Não informado"
                              : faltaKm <= 0
                                ? `Venceu ${formatarNumero(Math.abs(faltaKm))} KM`
                                : `${formatarNumero(faltaKm)} KM`}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">
                            Falta de horímetro
                          </p>
                          <p
                            className={`mt-1 font-semibold ${faltaHr !== null && faltaHr <= 0 ? "text-destructive" : ""}`}
                          >
                            {faltaHr === null
                              ? "Não informado"
                              : faltaHr <= 0
                                ? `Venceu ${formatarNumero(Math.abs(faltaHr))} H`
                                : `${formatarNumero(faltaHr)} H`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Contato:{" "}
                          {revisao.data_realizacao
                            ? revisao.data_realizacao
                                .slice(0, 10)
                                .split("-")
                                .reverse()
                                .join("/")
                            : "-"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {dados.contato || "Contato não informado"}
                          {dados.telefone ? ` · ${dados.telefone}` : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          )}
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Editar acompanhamento"
                : "Novo acompanhamento de revisão"}
            </DialogTitle>
            <DialogDescription>
              Informe a última revisão e a leitura recebida no contato. O
              sistema calcula o que falta e alerta quando o primeiro limite for
              ultrapassado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Equipamento</Label>
              <Select
                value={form.equipamentoId}
                onValueChange={preencherEquipamento}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a placa" />
                </SelectTrigger>
                <SelectContent>
                  {equipamentos
                    .filter((item) => item.placa)
                    .map((item) => (
                      <SelectItem key={String(item.id)} value={String(item.id)}>
                        {nomeEquipamento(item)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data do contato</Label>
              <Input
                type="date"
                value={form.dataContato}
                onChange={(event) => alterar("dataContato", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do contato</Label>
              <Input
                placeholder="Encarregado ou motorista"
                value={form.contato}
                onChange={(event) => alterar("contato", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone principal</Label>
              <Input
                value={form.telefone}
                onChange={(event) => alterar("telefone", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone 2</Label>
              <Input
                value={form.telefone2}
                onChange={(event) => alterar("telefone2", event.target.value)}
              />
            </div>
            <div className="border-t border-border pt-4 sm:col-span-2">
              <p className="text-sm font-semibold">Última revisão preventiva</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pode ser lançada manualmente quando não houver registro
                anterior.
              </p>
            </div>
            <div className="space-y-2">
              <Label>KM da última revisão</Label>
              <Input
                type="number"
                min="0"
                value={form.ultimaRevisaoKm}
                onChange={(event) =>
                  alterar("ultimaRevisaoKm", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Horímetro da última revisão</Label>
              <Input
                type="number"
                min="0"
                value={form.ultimaRevisaoHr}
                onChange={(event) =>
                  alterar("ultimaRevisaoHr", event.target.value)
                }
              />
            </div>
            <div className="border-t border-border pt-4 sm:col-span-2">
              <p className="text-sm font-semibold">Intervalo configurado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                O vencimento será a última revisão + intervalo. O primeiro
                limite atingido gera o alerta.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Intervalo de KM</Label>
              <Input
                type="number"
                min="0"
                value={form.intervaloKm}
                onChange={(event) => alterar("intervaloKm", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Intervalo de horímetro</Label>
              <Input
                type="number"
                min="0"
                value={form.intervaloHr}
                onChange={(event) => alterar("intervaloHr", event.target.value)}
              />
            </div>
            <div className="border-t border-border pt-4 sm:col-span-2">
              <p className="text-sm font-semibold">
                Leitura informada no contato
              </p>
            </div>
            <div className="space-y-2">
              <Label>KM atual</Label>
              <Input
                type="number"
                min="0"
                value={form.kmAtual}
                onChange={(event) => alterar("kmAtual", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Horímetro atual</Label>
              <Input
                type="number"
                min="0"
                value={form.hrAtual}
                onChange={(event) => alterar("hrAtual", event.target.value)}
              />
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-4 sm:col-span-2">
              <p className="mb-2 text-sm font-semibold">Resultado do cálculo</p>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <span>
                  Próximo KM:{" "}
                  <strong>
                    {form.intervaloKm
                      ? formatarNumero(calcularSituacao(form).kmLimite)
                      : "-"}
                  </strong>
                </span>
                <span>
                  Próximo horímetro:{" "}
                  <strong>
                    {form.intervaloHr
                      ? formatarNumero(calcularSituacao(form).hrLimite)
                      : "-"}
                  </strong>
                </span>
                <span>
                  Falta de KM:{" "}
                  <strong>
                    {calcularSituacao(form).faltaKm === null
                      ? "-"
                      : formatarNumero(calcularSituacao(form).faltaKm ?? 0)}
                  </strong>
                </span>
                <span>
                  Falta de horímetro:{" "}
                  <strong>
                    {calcularSituacao(form).faltaHr === null
                      ? "-"
                      : formatarNumero(calcularSituacao(form).faltaHr ?? 0)}
                  </strong>
                </span>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Observações</Label>
              <Input
                value={form.observacoes}
                onChange={(event) => alterar("observacoes", event.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={salvar}
              disabled={salvando || !form.equipamentoId}
            >
              {salvando ? "Salvando..." : "Salvar acompanhamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
