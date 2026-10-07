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
import { PlacaInput } from "@/components/ui/placa-input";
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
  calcularPlacasMedicao,
  calcularValorPlaca,
  obterPlacasMedicao,
  type PlacaMedicao,
} from "@/lib/medicoes";
import { gerarPdfMedicao } from "@/lib/pdf/pdfMedicao";
import {
  deleteRegistro,
  formatCurrency,
  formatDate,
  getPlacas,
} from "@/lib/utils";

type FormPlaca = {
  placa: string;
  valor: number;
  dias_trabalhados?: number;
  valor_calculado?: number;
};

type MedicaoApi = Omit<Medicao, "placas"> & {
  placas: Array<string | PlacaMedicao>;
  cliente_id?: string | number | null;
  empresa_id?: string | number | null;
  tipo_cobranca?: string | null;
  dias_mes?: string | number | null;
  valor_terceiro?: string | number | null;
  horas_extras?: string | number | null;
  valor_hora_extra?: string | number | null;
  vendas?: VendaMedicao[] | null;
};

type VendaMedicao = {
  id: string;
  numero: string;
  cliente: string;
  total: number | string;
  sinal_medicao?: string | null;
  placa_medicao?: string | null;
};

type VendaApi = VendaMedicao & {
  em_medicao: boolean;
  status?: string | null;
};

type Parceiro = {
  id: string | number;
  nome: string;
};

type Cliente = {
  id: string | number;
  nome: string;
};

type Empresa = {
  id: string | number;
  nome: string;
  razao_social?: string | null;
  cnpj?: string | null;
  logo?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
  email?: string | null;
  ativo?: boolean;
};

type FormData = {
  placas: FormPlaca[];
  valor_sem_placa: string;
  tipo_cobranca: string;
  quantidade_horas: string;
  terceiro: string;
  valor_terceiro: string;
  horas_extras: string;
  valor_hora_extra: string;
  data_medicao: string;
  cliente_id: string;
  empresa_id: string;
  parceiro: string;
  observacoes: string;
  status: string;
  periodo_inicio: string;
  periodo_fim: string;
  dias_trabalhados: string;
  obs_internas: string;
  vendas: VendaMedicao[];
};

function dataInputLocal(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function intervaloMesAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  return {
    inicio: dataInputLocal(new Date(ano, mes, 1)),
    fim: dataInputLocal(new Date(ano, mes + 1, 0)),
  };
}

function separarPeriodo(periodo?: string | null) {
  if (!periodo) return { inicio: "", fim: "" };
  const intervalo = periodo.match(
    /^(\d{4}-\d{2}-\d{2})\s*(?:a|até)\s*(\d{4}-\d{2}-\d{2})$/i,
  );
  if (intervalo) return { inicio: intervalo[1], fim: intervalo[2] };

  const mes = periodo.match(/^(\d{4})-(\d{2})$/);
  if (mes) {
    const ano = Number(mes[1]);
    const numeroMes = Number(mes[2]);
    return {
      inicio: `${mes[1]}-${mes[2]}-01`,
      fim: dataInputLocal(new Date(ano, numeroMes, 0)),
    };
  }

  const data = periodo.match(/^(\d{4}-\d{2}-\d{2})$/)?.[1] || "";
  return { inicio: data, fim: data };
}

function calcularValorVendas(vendas: VendaMedicao[]) {
  return vendas.reduce((total, venda) => {
    const sinal = venda.sinal_medicao === "-" ? -1 : 1;
    return total + sinal * (Number(venda.total) || 0);
  }, 0);
}

function formatarPeriodoExibicao(periodo?: string | null) {
  const { inicio, fim } = separarPeriodo(periodo);
  const formatar = (data: string) =>
    data ? data.split("-").reverse().join("/") : "";
  if (!inicio) return periodo || "-";
  return `${formatar(inicio)} a ${formatar(fim)}`;
}

const periodoInicial = intervaloMesAtual();

const formularioInicial: FormData = {
  placas: [],
  valor_sem_placa: "0",
  tipo_cobranca: "Valor Direito",
  quantidade_horas: "0",
  terceiro: "nao",
  valor_terceiro: "",
  horas_extras: "0",
  valor_hora_extra: "0",
  data_medicao: new Date().toISOString().slice(0, 10),
  cliente_id: "",
  empresa_id: "",
  parceiro: "",
  observacoes: "",
  status: "pendente",
  periodo_inicio: periodoInicial.inicio,
  periodo_fim: periodoInicial.fim,
  dias_trabalhados: "",
  obs_internas: "",
  vendas: [],
};

export function Medicoes() {
  const [medicoes, setMedicoes] = useState<MedicaoApi[]>([]);
  const [vendas, setVendas] = useState<VendaApi[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [placasDisponiveis, setPlacasDisponiveis] = useState<string[]>([]);
  const [placaSelecionada, setPlacaSelecionada] = useState("");
  const [valorPlaca, setValorPlaca] = useState("");
  const [vendaSelecionadaId, setVendaSelecionadaId] = useState("");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MedicaoApi | null>(null);
  const [form, setForm] = useState<FormData>(formularioInicial);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [diasMes, setDiasMes] = useState(30);

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
    fetch("/api/clientes")
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar os clientes.");
        const payload = await response.json();
        setClientes(payload.data || []);
      })
      .catch((error) => console.error("Erro ao carregar clientes da medição:", error));
    fetch("/api/empresas")
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar as empresas.");
        const payload = await response.json();
        setEmpresas(payload.data || []);
      })
      .catch((error) => console.error("Erro ao carregar empresas da medição:", error));
    fetch("/api/vendas")
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Não foi possível carregar as vendas.");
        const payload = await response.json();
        setVendas(payload.data || []);
      })
      .catch((error) =>
        console.error("Erro ao carregar vendas para medição:", error),
      );
  }, []);

  function alterarCampo(
    campo: Exclude<keyof FormData, "placas" | "vendas">,
    valor: string,
  ) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function gerarPdf(medicao: MedicaoApi, tipoDocumento: "cliente" | "terceiro" = "cliente") {
    const cliente = clientes.find(
      (item) => String(item.id) === String(medicao.cliente_id),
    )?.nome || "";
    const empresa = medicao.terceiro
      ? empresas.find((item) => String(item.id) === String(medicao.empresa_id))
      : undefined;
    gerarPdfMedicao({ ...medicao, cliente, empresa }, tipoDocumento);
  }

  function alterarTipoCobranca(valor: string) {
    setForm((atual) => ({
      ...atual,
      tipo_cobranca: valor,
      quantidade_horas:
        valor === "Valor por Hora" ? atual.quantidade_horas : "0",
    }));
  }

  function alterarDiasMes(valor: string) {
    const dias = Number(valor);
    setDiasMes(dias);
    setForm((atual) => ({
      ...atual,
      placas: atual.placas.map((placa) => ({
        ...placa,
        valor_calculado: calcularValorPlaca(
          placa.valor,
          atual.tipo_cobranca,
          dias,
          atual.tipo_cobranca === "Valor Mensal"
            ? Number(placa.dias_trabalhados) || 0
            : Number(atual.quantidade_horas) || 0,
        ),
      })),
    }));
  }

  function alterarDataPeriodo(
    campo: "periodo_inicio" | "periodo_fim",
    valor: string,
  ) {
    setForm((atual) => {
      const periodoAtualizado = { ...atual, [campo]: valor };
      return {
        ...periodoAtualizado,
      };
    });
  }

  function alterarTipoTerceiro(valor: string) {
    setForm((atual) => ({
      ...atual,
      terceiro: valor,
      empresa_id: valor === "sim" ? atual.empresa_id : "",
      parceiro: valor === "sim" ? atual.parceiro : "",
      valor_terceiro: valor === "sim" ? atual.valor_terceiro : "",
    }));
  }

  function adicionarPlaca() {
    const placa = placaSelecionada.trim().toUpperCase();
    if (!placa) return;
    if (form.placas.some((atual) => atual.placa === placa)) return;

    const diasTrabalhados = Number(form.dias_trabalhados) || 0;
    const valor = Math.round((Number(valorPlaca) || 0) * 100) / 100;
    setForm((atual) => ({
      ...atual,
      placas: [
        ...atual.placas,
        {
          placa,
          valor,
          ...(atual.tipo_cobranca === "Valor Mensal"
            ? { dias_trabalhados: diasTrabalhados }
            : {}),
          valor_calculado: calcularValorPlaca(
            valor,
            atual.tipo_cobranca,
            diasMes,
            atual.tipo_cobranca === "Valor Mensal"
              ? diasTrabalhados
              : Number(atual.quantidade_horas) || 0,
          ),
        },
      ],
    }));
    setPlacaSelecionada("");
    setValorPlaca("");
  }

  function adicionarVenda() {
    const venda = vendas.find((item) => item.id === vendaSelecionadaId);
    if (!venda) return;
    if (form.vendas.some((item) => item.id === venda.id)) {
      setVendaSelecionadaId("");
      return;
    }

    setForm((atual) => ({
      ...atual,
      vendas: [
        ...atual.vendas,
        {
          id: venda.id,
          numero: venda.numero,
          cliente: venda.cliente,
          total: venda.total,
          sinal_medicao: venda.sinal_medicao,
          placa_medicao: venda.placa_medicao,
        },
      ],
    }));
    setVendaSelecionadaId("");
  }

  function removerVenda(id: string) {
    setForm((atual) => ({
      ...atual,
      vendas: atual.vendas.filter((venda) => venda.id !== id),
    }));
  }

  function removerPlaca(placa: string) {
    setForm((atual) => ({
      ...atual,
      placas: atual.placas.filter((atual) => atual.placa !== placa),
    }));
  }

  function novaMedicao() {
    setEditing(null);
    const intervalo = intervaloMesAtual();
    setForm({
      ...formularioInicial,
      data_medicao: new Date().toISOString().slice(0, 10),
      periodo_inicio: intervalo.inicio,
      periodo_fim: intervalo.fim,
      dias_trabalhados: "",
    });
    setDiasMes(30);
    setPlacaSelecionada("");
    setValorPlaca("");
    setVendaSelecionadaId("");
    setDialogOpen(true);
  }

  function editar(medicao: MedicaoApi) {
    setEditing(medicao);
    const intervalo = separarPeriodo(medicao.periodo);
    const tipoCobranca = medicao.tipo_cobranca || medicao.tipoCobranca || "";
    const vendasMedicao = Array.isArray(medicao.vendas) ? medicao.vendas : [];
    const valorBase = (Number(medicao.valor) || 0) - calcularValorVendas(vendasMedicao);
    const quantidadeHoras = Number(medicao.horas_extras) || 0;
    const placasSalvas = Array.isArray(medicao.placas) ? medicao.placas : [];
    const placasDetalhadas = placasSalvas.length > 0 && placasSalvas.every(
      (placa) =>
        typeof placa !== "string" && typeof placa.valor !== "undefined",
    );
    const placasNormalizadas = obterPlacasMedicao(placasSalvas);
    const diasTrabalhadosInicial = placasNormalizadas.find(
      (placa) => typeof placa.dias_trabalhados === "number",
    )?.dias_trabalhados;
    const valorPorVeiculoLegado =
      placasNormalizadas.length > 0
        ? valorBase /
        placasNormalizadas.length /
        (tipoCobranca === "Valor por Hora" && quantidadeHoras > 0
          ? quantidadeHoras
          : 1)
        : 0;
    setForm({
      placas: placasNormalizadas.map((placa) => ({
        placa: placa.placa,
        valor: placasDetalhadas
          ? Number(placa.valor) || 0
          : valorPorVeiculoLegado,
        ...(typeof placa.dias_trabalhados === "number"
          ? { dias_trabalhados: placa.dias_trabalhados }
          : {}),
        ...(typeof placa.valor_calculado === "number"
          ? { valor_calculado: placa.valor_calculado }
          : {}),
      })),
      valor_sem_placa:
        placasNormalizadas.length === 0 ? String(valorBase) : "0",
      tipo_cobranca: tipoCobranca,
      quantidade_horas: String(quantidadeHoras),
      terceiro: medicao.terceiro ? "sim" : "nao",
      valor_terceiro: String(medicao.valor_terceiro || ""),
      horas_extras: String(medicao.horas_extras || "0"),
      valor_hora_extra: String(
        medicao.valor_hora_extra || medicao.valor_horas_extras || "0",
      ),
      data_medicao: medicao.data_medicao?.slice(0, 10) || "",
      cliente_id: medicao.cliente_id == null ? "" : String(medicao.cliente_id),
      empresa_id: medicao.empresa_id == null ? "" : String(medicao.empresa_id),
      parceiro: medicao.parceiro || "",
      observacoes: medicao.observacoes || "",
      status: medicao.status || "pendente",
      periodo_inicio: intervalo.inicio,
      periodo_fim: intervalo.fim,
      dias_trabalhados: diasTrabalhadosInicial === undefined
        ? ""
        : String(diasTrabalhadosInicial),
      obs_internas: medicao.obs_internas || "",
      vendas: vendasMedicao,
    });
    setDiasMes(Number(medicao.dias_mes) || 30);
    setPlacaSelecionada("");
    setValorPlaca("");
    setVendaSelecionadaId("");
    setDialogOpen(true);
  }

  async function salvar() {
    if (ehTerceiro && !form.empresa_id) {
      alert("Selecione a empresa da medição de terceiro.");
      return;
    }
    const quantidadeHoras = Number(form.quantidade_horas) || 0;
    const diasTrabalhados = Number(form.dias_trabalhados) || 0;
    const diasMesCalculo = Number(diasMes) || 0;
    const valorBase = form.placas.reduce(
      (total, placa) =>
        total + (Number(placa.valor_calculado) || 0),
      Number(form.valor_sem_placa) || 0,
    );
    const payload = {
      placas: form.placas,
      tipo_cobranca: form.tipo_cobranca,
      valor: valorBase + (editing ? calcularValorVendas(form.vendas) : 0),
      valor_sem_placa: Number(form.valor_sem_placa) || 0,
      vendas: form.vendas,
      terceiro: form.terceiro === "sim",
      valor_terceiro: Number(form.valor_terceiro) || 0,
      dias_mes: form.tipo_cobranca === "Valor Mensal" ? diasMesCalculo || null : null,
      dias_trabalhados: diasTrabalhados,
      horas_extras: ehValorPorHora
        ? quantidadeHoras
        : Number(form.horas_extras) || 0,
      valor_hora_extra: Number(form.valor_hora_extra) || 0,
      data_medicao: form.data_medicao
        ? new Date(form.data_medicao).toISOString()
        : new Date().toISOString(),
      cliente_id: form.cliente_id || null,
      empresa_id: ehTerceiro ? form.empresa_id : null,
      parceiro: form.parceiro,
      observacoes: form.observacoes,
      status: form.status,
      periodo:
        form.periodo_inicio && form.periodo_fim
          ? `${form.periodo_inicio} a ${form.periodo_fim}`
          : "",
      obs_internas: form.obs_internas,
    };
    try {
      const response = await fetch(
        editing ? `/api/medicoes/${editing.id}` : "/api/medicoes",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const resposta = await response.json().catch(() => null);
        throw new Error(
          resposta?.error || "Não foi possível salvar a medição.",
        );
      }
      await carregar();
      setDialogOpen(false);
    } catch (error) {
      console.error("Erro ao salvar medição:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a medição.",
      );
    }
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
    `${medicao.parceiro || ""} ${medicao.periodo || ""} ${obterPlacasMedicao(
      medicao.placas,
    )
      .map((placa) => placa.placa)
      .join(" ")}`
      .toLowerCase()
      .includes(busca.toLowerCase()),
  );
  const placasAdicionadas = form.placas;
  const ehValorPorHora = form.tipo_cobranca === "Valor por Hora";
  const ehTerceiro = form.terceiro === "sim";
  const quantidadeHorasForm = Number(form.quantidade_horas) || 0;
  const valorBaseForm = form.placas.reduce(
    (total, placa) =>
      total + (Number(placa.valor_calculado) || 0),
    Number(form.valor_sem_placa) || 0,
  );
  const vendasJaVinculadas = new Set(
    medicoes
      .filter((medicao) => String(medicao.id) !== String(editing?.id))
      .flatMap((medicao) =>
        (Array.isArray(medicao.vendas) ? medicao.vendas : []).map(
          (venda) => venda.id,
        ),
      ),
  );
  const vendasDisponiveis = vendas.filter(
    (venda) =>
      venda.em_medicao &&
      venda.status !== "cancelado" &&
      !vendasJaVinculadas.has(venda.id) &&
      !form.vendas.some((selecionada) => selecionada.id === venda.id),
  );

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
                        <TableCell>
                          {formatarPeriodoExibicao(medicao.periodo)}
                        </TableCell>
                        <TableCell>
                          {obterPlacasMedicao(medicao.placas)
                            .map((placa) => placa.placa)
                            .join(", ") || "-"}
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
                          {medicao.terceiro &&
                            Number(medicao.valor_terceiro || 0) > 0 ? (
                            <div className="inline-flex items-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="PDF do cliente"
                                aria-label="Gerar PDF do cliente"
                                onClick={() =>
                                  gerarPdf(medicao, "cliente")
                                }
                              >
                                <FileDown className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="PDF do terceiro"
                                aria-label="Gerar PDF do terceiro"
                                onClick={() =>
                                  gerarPdf(medicao, "terceiro")
                                }
                              >
                                <FileDown className="h-4 w-4 text-amber-600" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Gerar PDF da medição"
                              aria-label="Gerar PDF da medição"
                              onClick={() =>
                                gerarPdf(medicao, "cliente")
                              }
                            >
                              <FileDown className="h-4 w-4 text-primary" />
                            </Button>
                          )}
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
              <Label>Placas desta medição</Label>
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <PlacaInput
                    id="placa-cadastrada-medicao"
                    value={placaSelecionada}
                    options={placasDisponiveis.filter(
                      (placa) =>
                        !placasAdicionadas.some(
                          (adicionada) => adicionada.placa === placa,
                        ),
                    )}
                    onValueChange={setPlacaSelecionada}
                    placeholder="Selecionar placa..."
                    showManualInput={false}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={valorPlaca}
                    onChange={(event) => setValorPlaca(event.target.value)}
                    placeholder={
                      form.tipo_cobranca === "Valor Mensal"
                        ? "Valor mensal (R$)"
                        : ehValorPorHora
                          ? "Valor/hora (R$)"
                          : "Valor (R$)"
                    }
                    aria-label="Valor desta placa"
                    className="sm:max-w-48"
                  />
                  <Button
                    type="button"
                    className="sm:w-auto"
                    onClick={adicionarPlaca}
                    disabled={!placaSelecionada}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
                <Input
                  value={placaSelecionada}
                  onChange={(event) =>
                    setPlacaSelecionada(event.target.value.toUpperCase())
                  }
                  placeholder="Ou digite uma placa manualmente"
                  aria-label="Digitar placa manualmente"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de cobrança por veículo</Label>
                <Select
                  value={form.tipo_cobranca || "Valor Direito"}
                  onValueChange={alterarTipoCobranca}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de cobrança" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Valor Direito">Valor direto</SelectItem>
                    <SelectItem value="Valor por Hora">
                      Valor por hora
                    </SelectItem>
                    <SelectItem value="Valor Mensal">Valor mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.tipo_cobranca === "Valor Mensal" && (
                <>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Dias no mês</Label>
                    <Input
                      type="number"
                      min="28"
                      max="31"
                      step="1"
                      value={diasMes}
                      onChange={(e) => alterarDiasMes(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Dias trabalhados no mês</Label>
                    <Input
                      type="number"
                      min="0"
                      max="31"
                      step="1"
                      value={form.dias_trabalhados}
                      onChange={(e) => alterarCampo("dias_trabalhados", e.target.value)}
                    />
                  </div>
                </>
              )}
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
              <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-border bg-slate-50 p-2">
                {placasAdicionadas.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Nenhuma placa adicionada.
                  </span>
                )}
                {placasAdicionadas.map((placa) => (
                  <div
                    key={placa.placa}
                    className="flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => removerPlaca(placa.placa)}
                      aria-label={`Remover placa ${placa.placa}`}
                      title={`Remover placa ${placa.placa}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span>
                      {placa.placa}: {formatCurrency(placa.valor)}
                      {" → "}
                      {formatCurrency(
                        placa.valor_calculado ??
                        calcularValorPlaca(
                          placa.valor,
                          form.tipo_cobranca,
                          diasMes,
                          form.tipo_cobranca === "Valor Mensal"
                            ? Number(placa.dias_trabalhados) || 0
                            : quantidadeHorasForm,
                        ),
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Vendas marcadas para medição</Label>
              {!editing && (
                <div className="flex gap-2">
                  <Select
                    value={vendaSelecionadaId}
                    onValueChange={setVendaSelecionadaId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar venda cadastrada" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendasDisponiveis.map((venda) => (
                        <SelectItem key={venda.id} value={venda.id}>
                          {`Venda ${venda.numero} — ${venda.cliente} — ${venda.placa_medicao || "Sem placa"} — ${venda.sinal_medicao === "-" ? "-" : "+"} ${formatCurrency(Number(venda.total) || 0)}`}
                        </SelectItem>
                      ))}
                      {vendasDisponiveis.length === 0 && (
                        <SelectItem value="sem-vendas" disabled>
                          Nenhuma venda disponível para medição
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    onClick={adicionarVenda}
                    disabled={!vendaSelecionadaId}
                    aria-label="Adicionar venda à medição"
                    title="Adicionar venda à medição"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-border bg-slate-50 p-2">
                {form.vendas.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    {editing
                      ? "Nenhuma venda vinculada a esta medição."
                      : "Nenhuma venda adicionada."}
                  </span>
                ) : (
                  form.vendas.map((venda) => (
                    <div
                      key={venda.id}
                      className="flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-sm"
                    >
                      {!editing && (
                        <button
                          type="button"
                          onClick={() => removerVenda(venda.id)}
                          aria-label={`Remover venda ${venda.numero}`}
                          title={`Remover venda ${venda.numero}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <span>
                        Venda {venda.numero}:{" "}
                        {venda.sinal_medicao === "-" ? "−" : "+"}
                        {formatCurrency(Number(venda.total) || 0)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Ajuste das vendas:{" "}
                {formatCurrency(calcularValorVendas(form.vendas))}. Total da
                medição:{" "}
                {formatCurrency(
                  valorBaseForm + calcularValorVendas(form.vendas),
                )}
              </p>
            </div>
            <div className="space-y-2">
              <Label>É de terceiro?</Label>
              <Select value={form.terceiro} onValueChange={alterarTipoTerceiro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Cliente</Label>
              <Select
                value={form.cliente_id}
                onValueChange={(value) => alterarCampo("cliente_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente da medição" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={String(cliente.id)}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                  {clientes.length === 0 && (
                    <SelectItem value="sem-clientes" disabled>
                      Nenhum cliente cadastrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {ehTerceiro && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Empresa <span className="text-destructive">*</span></Label>
                <Select
                  value={form.empresa_id}
                  onValueChange={(value) => alterarCampo("empresa_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar empresa da medição" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={String(empresa.id)}>
                        {empresa.razao_social || empresa.nome}
                      </SelectItem>
                    ))}
                    {empresas.length === 0 && (
                      <SelectItem value="sem-empresas" disabled>
                        Nenhuma empresa ativa cadastrada
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
              <div className="space-y-2">
                <Label>Período — De</Label>
                <Input
                  type="date"
                  value={form.periodo_inicio}
                  onChange={(event) =>
                    alterarDataPeriodo("periodo_inicio", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Período — Até</Label>
                <Input
                  type="date"
                  value={form.periodo_fim}
                  onChange={(event) =>
                    alterarDataPeriodo("periodo_fim", event.target.value)
                  }
                />
              </div>
            </div>
            {ehTerceiro && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Parceiro</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={
                      parceiros.some(
                        (parceiro) => parceiro.nome === form.parceiro,
                      )
                        ? form.parceiro
                        : ""
                    }
                    onValueChange={(value) => alterarCampo("parceiro", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar parceiro cadastrado" />
                    </SelectTrigger>
                    <SelectContent>
                      {parceiros.map((parceiro) => (
                        <SelectItem key={parceiro.id} value={parceiro.nome}>
                          {parceiro.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={form.parceiro}
                    onChange={(event) =>
                      alterarCampo("parceiro", event.target.value)
                    }
                    placeholder="Ou digite o parceiro manualmente"
                    aria-label="Digitar parceiro manualmente"
                  />
                </div>
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
