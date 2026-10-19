"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  Edit,
  FileDown,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  X,
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
import { SortableTableHead, useSortableData } from "@/components/ui/sortable-table";
import { Medicao } from "@/lib/types";
import {
  calcularValorPlaca,
  obterPlacasMedicao,
  totalMedicao,
  type PlacaMedicao,
} from "@/lib/medicoes";
import { gerarPdfMedicao } from "@/lib/pdf/pdfMedicao";
import { chamarApi, mensagemErro } from "@/lib/api-client";
import { StatusSelect } from "@/components/ui/status-select";
import { compartilharWhatsApp } from "@/lib/whatsapp";
import { deleteRegistro, formatCurrency, getPlacas } from "@/lib/utils";

const TIPO_HORA = "Valor por Hora";
const TIPO_MENSAL = "Valor Mensal";

type VendaMedicao = {
  id: string;
  numero: string;
  cliente: string;
  total: number | string;
  sinal_medicao?: string | null;
  placa_medicao?: string | null;
};

type VendaApi = VendaMedicao & { em_medicao: boolean; status?: string | null };

type MedicaoApi = Omit<Medicao, "placas"> & {
  placas: Array<string | PlacaMedicao>;
  cliente_id?: string | number | null;
  cliente_nome?: string | null;
  obra?: string | null;
  empresa_id?: string | number | null;
  tipo_cobranca?: string | null;
  dias_mes?: string | number | null;
  valor_terceiro?: string | number | null;
  horas_extras?: string | number | null;
  vendas?: VendaMedicao[] | null;
};

type Parceiro = { id: string | number; nome: string };
type Cliente = { id: string | number; nome: string };
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
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
};

type PlacaForm = {
  placa: string;
  valor: string;
  quantidade: string;
  valor_parceiro: string;
  /** Horas ou dias trabalhados na medição do parceiro (podem diferir do contratante). */
  quantidade_parceiro: string;
  horas_contratadas_parceiro: string;
  /** Modalidade da placa (só na frota; na parceria vale a do contrato). */
  tipo: string;
  equipamento: string;
  horas_contratadas: string;
};

const placaVazia = (): PlacaForm => ({
  placa: "",
  valor: "",
  quantidade: "",
  valor_parceiro: "",
  quantidade_parceiro: "",
  horas_contratadas_parceiro: "",
  tipo: "",
  equipamento: "",
  horas_contratadas: "",
});

type FormState = {
  empresa_id: string;
  modalidade: "" | "frota" | "parceria";
  cliente_id: string;
  cliente_nome: string;
  obra: string;
  data_medicao: string;
  periodo_inicio: string;
  periodo_fim: string;
  data_vencimento: string;
  tipo_cobranca: "" | typeof TIPO_HORA | typeof TIPO_MENSAL;
  dias_mes: string;
  placas: PlacaForm[];
  valor_excedente: string;
  vendas: VendaMedicao[];
  corretor_nome: string;
  corretor_valor: string;
  observacoes: string;
  obs_internas: string;
  parceiro: string;
  desconto_percentual: string;
  parceiro_vencimento: string;
  parceiro_vendas: VendaMedicao[];
  parceiro_corretor_nome: string;
  parceiro_corretor_valor: string;
  parceiro_observacoes: string;
};

const hojeISO = () => new Date().toISOString().slice(0, 10);

function dataInputLocal(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function intervaloMesAtual() {
  const hoje = new Date();
  return {
    inicio: dataInputLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    fim: dataInputLocal(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
  };
}

function separarPeriodo(periodo?: string | null) {
  if (!periodo) return { inicio: "", fim: "" };
  const intervalo = periodo.match(/^(\d{4}-\d{2}-\d{2})\s*(?:a|até)\s*(\d{4}-\d{2}-\d{2})$/i);
  if (intervalo) return { inicio: intervalo[1], fim: intervalo[2] };
  const mes = periodo.match(/^(\d{4})-(\d{2})$/);
  if (mes) {
    return {
      inicio: `${mes[1]}-${mes[2]}-01`,
      fim: dataInputLocal(new Date(Number(mes[1]), Number(mes[2]), 0)),
    };
  }
  return { inicio: "", fim: "" };
}

function formatarPeriodoExibicao(periodo?: string | null) {
  const { inicio, fim } = separarPeriodo(periodo);
  const formatar = (data: string) => (data ? data.split("-").reverse().join("/") : "");
  return inicio ? `${formatar(inicio)} a ${formatar(fim)}` : periodo || "-";
}

function formularioInicial(): FormState {
  const intervalo = intervaloMesAtual();
  return {
    empresa_id: "",
    modalidade: "",
    cliente_id: "",
    cliente_nome: "",
    obra: "",
    data_medicao: hojeISO(),
    periodo_inicio: intervalo.inicio,
    periodo_fim: intervalo.fim,
    data_vencimento: "",
    tipo_cobranca: "",
    dias_mes: "30",
    placas: [],
    valor_excedente: "",
    vendas: [],
    corretor_nome: "",
    corretor_valor: "",
    observacoes: "",
    obs_internas: "",
    parceiro: "",
    desconto_percentual: "",
    parceiro_vencimento: "",
    parceiro_vendas: [],
    parceiro_corretor_nome: "",
    parceiro_corretor_valor: "",
    parceiro_observacoes: "",
  };
}

const OPCOES_STATUS = [
  { value: "aguardando", label: "Aguardando", cor: "bg-amber-100 text-amber-800" },
  { value: "aprovado", label: "Aprovado", cor: "bg-emerald-100 text-emerald-800" },
];

function ListaVendas({
  titulo,
  selecionadas,
  disponiveis,
  onAdicionar,
  onRemover,
}: {
  titulo: string;
  selecionadas: VendaMedicao[];
  disponiveis: VendaApi[];
  onAdicionar: (venda: VendaApi) => void;
  onRemover: (id: string) => void;
}) {
  const [escolhida, setEscolhida] = useState("");
  return (
    <div className="space-y-2">
      <Label>{titulo}</Label>
      <div className="flex gap-2">
        <Select value={escolhida} onValueChange={(v) => setEscolhida(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar venda cadastrada" />
          </SelectTrigger>
          <SelectContent>
            {disponiveis.map((venda) => (
              <SelectItem key={venda.id} value={venda.id}>
                {`Venda ${venda.numero} — ${venda.cliente} — ${venda.placa_medicao || "Sem placa"} — ${venda.sinal_medicao === "-" ? "-" : "+"} ${formatCurrency(Number(venda.total) || 0)}`}
              </SelectItem>
            ))}
            {disponiveis.length === 0 && (
              <SelectItem value="sem-vendas" disabled>
                Nenhuma venda disponível para medição
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="icon"
          disabled={!escolhida}
          aria-label="Adicionar venda"
          onClick={() => {
            const venda = disponiveis.find((v) => v.id === escolhida);
            if (venda) onAdicionar(venda);
            setEscolhida("");
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-border bg-slate-50 p-2">
        {selecionadas.length === 0 ? (
          <span className="text-sm text-muted-foreground">Nenhuma venda adicionada.</span>
        ) : (
          selecionadas.map((venda) => (
            <div key={venda.id} className="flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-sm">
              <button
                type="button"
                onClick={() => onRemover(venda.id)}
                aria-label={`Remover venda ${venda.numero}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <span>
                Venda {venda.numero}: {venda.sinal_medicao === "-" ? "−" : "+"}
                {formatCurrency(Number(venda.total) || 0)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function Medicoes() {
  const [medicoes, setMedicoes] = useState<MedicaoApi[]>([]);
  const [vendas, setVendas] = useState<VendaApi[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [placasFrota, setPlacasFrota] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MedicaoApi | null>(null);
  const [form, setForm] = useState<FormState>(formularioInicial);
  const [novaPlaca, setNovaPlaca] = useState<PlacaForm>(placaVazia);
  const [equipamentosPorPlaca, setEquipamentosPorPlaca] = useState<Record<string, string>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const response = await fetch("/api/medicoes", { credentials: "include" });
    const payload = await response.json();
    setMedicoes(payload.data || []);
  }

  useEffect(() => {
    carregar();
    getPlacas().then(setPlacasFrota);
    const carregarLista = (url: string, setter: (dados: any[]) => void) =>
      fetch(url, { credentials: "include" })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Falha ao carregar ${url}`);
          const payload = await response.json();
          setter(payload.data || []);
        })
        .catch((erro) => console.error(erro));
    carregarLista("/api/parceiros", setParceiros);
    carregarLista("/api/equipamentos", (lista) =>
      setEquipamentosPorPlaca(
        Object.fromEntries(
          lista
            .filter((e) => e.placa)
            .map((e) => [
              String(e.placa).toUpperCase().replace(/\s+/g, ""),
              [e.tipo, e.marca, e.modelo].filter(Boolean).join(" ") || "Equipamento",
            ]),
        ),
      ),
    );
    carregarLista("/api/clientes", setClientes);
    carregarLista("/api/empresas", setEmpresas);
    carregarLista("/api/vendas", setVendas);
  }, []);

  // Dias do mês acompanham o período escolhido (o usuário ainda pode ajustar).
  useEffect(() => {
    if (editing || !form.periodo_inicio) return;
    const [ano, mes] = form.periodo_inicio.split("-").map(Number);
    if (!ano || !mes) return;
    const dias = String(new Date(ano, mes, 0).getDate());
    setForm((atual) => (atual.dias_mes === dias ? atual : { ...atual, dias_mes: dias }));
  }, [form.periodo_inicio, editing]);

  const campo = <K extends keyof FormState>(chave: K, valor: FormState[K]) =>
    setForm((atual) => ({ ...atual, [chave]: valor }));

  const ehParceria = form.modalidade === "parceria";
  const diasMes = Number(form.dias_mes) || 30;

  /** Na parceria vale o tipo único do contrato; na frota cada placa tem o seu. */
  const tipoDaPlaca = (p: PlacaForm) => (ehParceria ? form.tipo_cobranca : p.tipo);
  const tipoNova = tipoDaPlaca(novaPlaca);
  const ehHora = tipoNova === TIPO_HORA;
  const algumaMensal = tipoNova === TIPO_MENSAL || form.placas.some((p) => tipoDaPlaca(p) === TIPO_MENSAL);

  function valorLinha(valorUnitario: string, quantidade: string, tipo: string) {
    if (!tipo) return 0;
    return calcularValorPlaca(Number(valorUnitario) || 0, tipo, diasMes, Number(quantidade) || 0);
  }

  const subtotalContratante = form.placas.reduce((t, p) => t + valorLinha(p.valor, p.quantidade, tipoDaPlaca(p)), 0);
  const quantidadeParceiro = (p: PlacaForm) => p.quantidade_parceiro || p.quantidade;
  const subtotalParceiro = form.placas.reduce((t, p) => t + valorLinha(p.valor_parceiro, quantidadeParceiro(p), tipoDaPlaca(p)), 0);
  const excedente = Number(form.valor_excedente) || 0;
  const totaisContratante = totalMedicao(subtotalContratante, excedente, 0, form.vendas);
  const totaisParceiro = totalMedicao(
    subtotalParceiro,
    excedente,
    Number(form.desconto_percentual) || 0,
    form.parceiro_vendas,
  );
  const corretores = (Number(form.corretor_valor) || 0) + (Number(form.parceiro_corretor_valor) || 0);
  const lucro = totaisContratante.total - totaisParceiro.total - corretores;

  const vendasUsadasEmOutras = useMemo(() => {
    const idsGrupo = new Set<string>(
      editing ? [String(editing.id), ...medicoes.filter((m) => String(m.medicao_principal_id) === String(editing.id)).map((m) => String(m.id))] : [],
    );
    return new Set(
      medicoes
        .filter((m) => !idsGrupo.has(String(m.id)))
        .flatMap((m) => (Array.isArray(m.vendas) ? m.vendas : []).map((v) => v.id)),
    );
  }, [medicoes, editing]);

  const vendasDisponiveis = (jaEscolhidas: VendaMedicao[], outraLista: VendaMedicao[]) =>
    vendas.filter(
      (venda) =>
        venda.em_medicao &&
        venda.status !== "cancelado" &&
        !vendasUsadasEmOutras.has(venda.id) &&
        !jaEscolhidas.some((v) => v.id === venda.id) &&
        !outraLista.some((v) => v.id === venda.id),
    );

  const paraVenda = (venda: VendaApi): VendaMedicao => ({
    id: venda.id,
    numero: venda.numero,
    cliente: venda.cliente,
    total: venda.total,
    sinal_medicao: venda.sinal_medicao,
    placa_medicao: venda.placa_medicao,
  });

  function alterarModalidade(valor: "frota" | "parceria") {
    setForm((atual) => ({ ...atual, modalidade: valor, placas: [] }));
    setNovaPlaca(placaVazia());
  }

  function adicionarPlaca() {
    const placa = novaPlaca.placa.trim().toUpperCase().replace(/\s+/g, "");
    if (!form.modalidade) return alert("Selecione primeiro se a medição é com frota ou com parceria.");
    if (!tipoNova) {
      return alert(ehParceria ? "Selecione o tipo de lançamento (hora ou mensal)." : "Selecione o tipo de contrato da placa (hora ou mensal).");
    }
    if (!placa) return alert("Informe a placa.");
    if (form.modalidade === "frota" && !placasFrota.some((p) => p.toUpperCase().replace(/\s+/g, "") === placa)) {
      return alert("Para medição com frota, a placa deve estar cadastrada na frota.");
    }
    if (form.placas.some((p) => p.placa === placa)) return alert("Esta placa já foi adicionada.");
    if (!(Number(novaPlaca.valor) > 0)) return alert(ehHora ? "Informe o valor da hora." : "Informe o valor mensal.");
    if (!(Number(novaPlaca.quantidade) > 0)) return alert(ehHora ? "Informe as horas trabalhadas." : "Informe os dias trabalhados.");
    if (ehParceria && !(Number(novaPlaca.valor_parceiro) >= 0 && novaPlaca.valor_parceiro !== "")) {
      return alert("Informe o valor do parceiro para esta placa.");
    }
    if (ehParceria && novaPlaca.quantidade_parceiro !== "" && !(Number(novaPlaca.quantidade_parceiro) >= 0)) {
      return alert(ehHora ? "Informe as horas trabalhadas do parceiro." : "Informe os dias trabalhados do parceiro.");
    }
    const equipamento = novaPlaca.equipamento.trim() || equipamentosPorPlaca[placa] || "";
    setForm((atual) => ({ ...atual, placas: [...atual.placas, { ...novaPlaca, placa, tipo: tipoNova, equipamento }] }));
    setNovaPlaca(placaVazia());
  }

  function novaMedicao() {
    setEditing(null);
    setForm(formularioInicial());
    setNovaPlaca(placaVazia());
    setDialogOpen(true);
  }

  function editar(medicao: MedicaoApi) {
    const principal = medicao.papel === "parceiro"
      ? medicoes.find((m) => String(m.id) === String(medicao.medicao_principal_id)) ?? medicao
      : medicao;
    const parceiro = medicoes.find(
      (m) => m.papel === "parceiro" && String(m.medicao_principal_id) === String(principal.id),
    );
    const intervalo = separarPeriodo(principal.periodo);
    const tipo = (principal.tipo_cobranca === "Misto" ? "" : principal.tipo_cobranca || "") as FormState["tipo_cobranca"];
    const placasParceiro = parceiro ? obterPlacasMedicao(parceiro.placas) : [];
    const placas: PlacaForm[] = obterPlacasMedicao(principal.placas).map((p) => {
      const tipoPlaca = p.tipo_cobranca || principal.tipo_cobranca || "";
      return {
        placa: p.placa,
        valor: String(p.valor ?? ""),
        quantidade: String(tipoPlaca === TIPO_HORA ? p.horas_trabalhadas ?? "" : p.dias_trabalhados ?? ""),
        valor_parceiro: String(placasParceiro.find((pp) => pp.placa === p.placa)?.valor ?? ""),
        quantidade_parceiro: String(
          (tipoPlaca === TIPO_HORA
            ? placasParceiro.find((pp) => pp.placa === p.placa)?.horas_trabalhadas
            : placasParceiro.find((pp) => pp.placa === p.placa)?.dias_trabalhados) ?? "",
        ),
        horas_contratadas_parceiro: String(placasParceiro.find((pp) => pp.placa === p.placa)?.horas_contratadas ?? ""),
        tipo: tipoPlaca,
        equipamento: p.equipamento || "",
        horas_contratadas: p.horas_contratadas ? String(p.horas_contratadas) : "",
      };
    });
    setEditing(principal);
    setForm({
      empresa_id: principal.empresa_id == null ? "" : String(principal.empresa_id),
      modalidade: (principal.modalidade === "parceria" ? "parceria" : "frota"),
      cliente_id: principal.cliente_id == null ? "" : String(principal.cliente_id),
      cliente_nome: principal.cliente_nome || "",
      obra: principal.obra || "",
      data_medicao: principal.data_medicao?.slice(0, 10) || hojeISO(),
      periodo_inicio: intervalo.inicio,
      periodo_fim: intervalo.fim,
      data_vencimento: principal.data_vencimento?.slice(0, 10) || "",
      tipo_cobranca: tipo,
      dias_mes: String(principal.dias_mes || 30),
      placas,
      valor_excedente: Number(principal.valor_excedente) ? String(principal.valor_excedente) : "",
      vendas: Array.isArray(principal.vendas) ? principal.vendas : [],
      corretor_nome: principal.corretor_nome || "",
      corretor_valor: Number(principal.corretor_valor) ? String(principal.corretor_valor) : "",
      observacoes: principal.observacoes || "",
      obs_internas: principal.obs_internas || "",
      parceiro: parceiro?.parceiro || "",
      desconto_percentual: Number(parceiro?.desconto_percentual) ? String(parceiro?.desconto_percentual) : "",
      parceiro_vencimento: parceiro?.data_vencimento?.slice(0, 10) || "",
      parceiro_vendas: Array.isArray(parceiro?.vendas) ? parceiro!.vendas! : [],
      parceiro_corretor_nome: parceiro?.corretor_nome || "",
      parceiro_corretor_valor: Number(parceiro?.corretor_valor) ? String(parceiro?.corretor_valor) : "",
      parceiro_observacoes: parceiro?.observacoes || "",
    });
    setNovaPlaca(placaVazia());
    setDialogOpen(true);
  }

  async function salvar() {
    if (!form.empresa_id) return alert("Selecione a empresa do grupo.");
    if (!form.modalidade) return alert("Informe se a medição é com parceria ou com frota cadastrada.");
    if (!form.placas.length) return alert("Adicione ao menos uma placa.");
    if (form.placas.some((p) => !tipoDaPlaca(p))) return alert("Informe se cada placa é por hora ou mensal.");
    if (form.placas.some((p) => !(Number(p.quantidade) > 0))) {
      return alert("Informe as horas ou os dias trabalhados de cada placa.");
    }
    const tiposUsados = [...new Set(form.placas.map(tipoDaPlaca))];
    const tipoMedicao = tiposUsados.length > 1 ? "Misto" : tiposUsados[0];
    if (ehParceria) {
      if (!form.parceiro.trim()) return alert("Informe o parceiro.");
    }

    const payload = {
      modalidade: form.modalidade,
      empresa_id: form.empresa_id,
      cliente_id: form.cliente_nome.trim() ? null : form.cliente_id || null,
      cliente_nome: form.cliente_nome.trim(),
      obra: form.obra.trim(),
      tipo_cobranca: tipoMedicao,
      dias_mes: algumaMensal ? diasMes : null,
      placas: form.placas.map((p) => {
        const tipoPlaca = tipoDaPlaca(p);
        return {
          placa: p.placa,
          equipamento: p.equipamento || equipamentosPorPlaca[p.placa] || "",
          tipo_cobranca: tipoPlaca,
          valor: Number(p.valor) || 0,
          ...(tipoPlaca === TIPO_MENSAL
            ? { dias_trabalhados: Number(p.quantidade) || 0 }
            : {
                horas_trabalhadas: Number(p.quantidade) || 0,
                ...(Number(p.horas_contratadas) > 0 ? { horas_contratadas: Number(p.horas_contratadas) } : {}),
              }),
          ...(ehParceria
            ? {
                valor_parceiro: Number(p.valor_parceiro) || 0,
                quantidade_parceiro: Number(quantidadeParceiro(p)) || 0,
                ...(Number(p.horas_contratadas_parceiro) > 0
                  ? { horas_contratadas_parceiro: Number(p.horas_contratadas_parceiro) }
                  : {}),
              }
            : {}),
        };
      }),
      valor_excedente: excedente,
      vendas: form.vendas.map((v) => ({ id: v.id })),
      data_medicao: form.data_medicao,
      data_vencimento: form.data_vencimento,
      periodo: form.periodo_inicio && form.periodo_fim ? `${form.periodo_inicio} a ${form.periodo_fim}` : "",
      observacoes: form.observacoes,
      obs_internas: form.obs_internas,
      corretor_nome: form.corretor_nome,
      corretor_valor: Number(form.corretor_valor) || 0,
      ...(ehParceria
        ? {
            parceiro_medicao: {
              parceiro: form.parceiro,
              desconto_percentual: Number(form.desconto_percentual) || 0,
              data_vencimento: form.parceiro_vencimento,
              vendas: form.parceiro_vendas.map((v) => ({ id: v.id })),
              corretor_nome: form.parceiro_corretor_nome,
              corretor_valor: Number(form.parceiro_corretor_valor) || 0,
              observacoes: form.parceiro_observacoes,
            },
          }
        : {}),
    };

    setSalvando(true);
    try {
      await chamarApi(editing ? `/api/medicoes/${editing.id}` : "/api/medicoes", editing ? "PUT" : "POST", payload);
      await carregar();
      setDialogOpen(false);
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível salvar a medição."));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(medicao: MedicaoApi) {
    const principalId = medicao.papel === "parceiro" ? medicao.medicao_principal_id : medicao.id;
    if (!confirm("Excluir esta medição (e a medição do parceiro vinculada)?")) return;
    setProcessandoId(String(medicao.id));
    try {
      if (!(await deleteRegistro(`/api/medicoes/${principalId}`))) return;
      await carregar();
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível excluir a medição."));
    } finally {
      setProcessandoId(null);
    }
  }

  async function aprovar(medicao: MedicaoApi) {
    const mensagem =
      medicao.papel === "parceiro"
        ? "Aprovar a medição do parceiro? Os valores entram no Contas a Pagar e ela não poderá mais ser editada."
        : "Aprovar a medição do contratante? O valor entra no Contas a Receber e ela não poderá mais ser editada ou excluída.";
    if (!confirm(mensagem)) return;
    setProcessandoId(String(medicao.id));
    try {
      await chamarApi(`/api/medicoes/${medicao.id}/acao`, "POST", { acao: "aprovar" });
      await carregar();
    } finally {
      setProcessandoId(null);
    }
  }

  async function retornar(medicao: MedicaoApi) {
    const motivo = prompt("Motivo para retornar esta medição para AGUARDANDO (vai para a auditoria):");
    if (!motivo) return;
    setProcessandoId(String(medicao.id));
    try {
      await chamarApi(`/api/medicoes/${medicao.id}/acao`, "POST", { acao: "retornar", motivo });
      await carregar();
    } finally {
      setProcessandoId(null);
    }
  }

  function gerarPdf(medicao: MedicaoApi, modo: "baixar" | "arquivo" = "baixar") {
    const cliente =
      medicao.cliente_nome?.trim() ||
      clientes.find((item) => String(item.id) === String(medicao.cliente_id))?.nome ||
      "";
    const empresa = empresas.find((item) => String(item.id) === String(medicao.empresa_id));
    return gerarPdfMedicao({ ...medicao, cliente, empresa }, equipamentosPorPlaca, modo);
  }

  async function enviarWhatsApp(medicao: MedicaoApi) {
    const arquivo = await gerarPdf(medicao, "arquivo");
    const placas = obterPlacasMedicao(medicao.placas).map((p) => p.placa).join(", ") || "-";
    const quem = medicao.papel === "parceiro"
      ? `Parceiro: ${medicao.parceiro || "-"}`
      : `Contratante: ${medicao.cliente_nome?.trim() || clientes.find((c) => String(c.id) === String(medicao.cliente_id))?.nome || "-"}`;
    await compartilharWhatsApp(
      [
        `*Medição ${medicao.numero}* — ${nomeEmpresa(medicao.empresa_id)}`,
        quem,
        medicao.obra ? `Obra: ${medicao.obra}` : "",
        `Período: ${formatarPeriodoExibicao(medicao.periodo)}`,
        `Placas: ${placas}`,
        `*Total: ${formatCurrency(Number(medicao.valor || 0))}*`,
        "Segue o PDF da medição em anexo.",
      ].filter(Boolean).join("\n"),
      undefined,
      arquivo,
    );
  }

  async function alterarStatus(medicao: MedicaoApi, novo: string) {
    if (novo === "aprovado") return aprovar(medicao);
    if (novo === "aguardando") return retornar(medicao);
  }

  const nomeEmpresa = (id?: string | number | null) => {
    const empresa = empresas.find((e) => String(e.id) === String(id));
    return empresa ? empresa.razao_social || empresa.nome : "-";
  };

  const filtradas = medicoes.filter((medicao) => {
    if (filtroStatus !== "todas" && medicao.status !== filtroStatus) return false;
    return `${medicao.numero || ""} ${medicao.parceiro || ""} ${medicao.periodo || ""} ${obterPlacasMedicao(medicao.placas)
      .map((placa) => placa.placa)
      .join(" ")}`
      .toLowerCase()
      .includes(busca.toLowerCase());
  });
  const { sortedItems: medicoesOrdenadas, sortKey, sortDirection, toggleSort } = useSortableData(filtradas);

  const principalAprovada = (medicao: MedicaoApi) =>
    medicoes.find((m) => String(m.id) === String(medicao.medicao_principal_id))?.status === "aprovado";

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
            <h1 className="text-lg font-bold sm:text-2xl">Medições</h1>
          </div>
          <Button onClick={novaMedicao}>
            <Plus className="mr-2 h-4 w-4" />
            Nova medição
          </Button>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por número, parceiro, período ou placa..."
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                />
              </div>
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v ?? "todas")}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos os status</SelectItem>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="aprovado">Aprovadas</SelectItem>
                </SelectContent>
              </Select>
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
                      <SortableTableHead<MedicaoApi> label="Nº" sortKey="numero" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(m) => m.numero} />
                      <SortableTableHead<MedicaoApi> label="Tipo" sortKey="papel" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(m) => m.papel} />
                      <SortableTableHead<MedicaoApi> label="Empresa" sortKey="empresa" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(m) => nomeEmpresa(m.empresa_id)} />
                      <SortableTableHead<MedicaoApi> label="Placas" sortKey="placas" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(m) => obterPlacasMedicao(m.placas).map((p) => p.placa).join(", ")} />
                      <SortableTableHead<MedicaoApi> label="Período" sortKey="periodo" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(m) => m.periodo || m.data_medicao} />
                      <SortableTableHead<MedicaoApi> label="Vencimento" sortKey="data_vencimento" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(m) => m.data_vencimento} />
                      <SortableTableHead<MedicaoApi> label="Valor" sortKey="valor" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(m) => Number(m.valor || 0)} />
                      <SortableTableHead<MedicaoApi> label="Status" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(m) => m.status} />
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicoesOrdenadas.map((medicao) => {
                      const ehParceiro = medicao.papel === "parceiro";
                      const aguardando = medicao.status === "aguardando";
                      const bloqueadaPorContratante = ehParceiro && aguardando && !principalAprovada(medicao);
                      return (
                        <TableRow key={medicao.id}>
                          <TableCell className="font-mono text-xs">{medicao.numero || medicao.id}</TableCell>
                          <TableCell>{ehParceiro ? "Parceiro" : "Contratante"}</TableCell>
                          <TableCell>{nomeEmpresa(medicao.empresa_id)}</TableCell>
                          <TableCell>
                            {obterPlacasMedicao(medicao.placas).map((p) => p.placa).join(", ") || "-"}
                          </TableCell>
                          <TableCell>{formatarPeriodoExibicao(medicao.periodo)}</TableCell>
                          <TableCell>
                            {medicao.data_vencimento ? medicao.data_vencimento.slice(0, 10).split("-").reverse().join("/") : "-"}
                          </TableCell>
                          <TableCell>{formatCurrency(Number(medicao.valor || 0))}</TableCell>
                          <TableCell>
                            <StatusSelect
                              value={medicao.status}
                              opcoes={OPCOES_STATUS}
                              disabled={bloqueadaPorContratante || processandoId === String(medicao.id)}
                              onChange={(novo) => alterarStatus(medicao, novo)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button variant="ghost" size="icon" title="Baixar PDF" onClick={() => gerarPdf(medicao)}>
                                <FileDown className="h-4 w-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Compartilhar no WhatsApp" onClick={() => enviarWhatsApp(medicao)}>
                                <MessageCircle className="h-4 w-4 text-emerald-600" />
                              </Button>
                              {aguardando && (
                                <>
                                  <Button variant="ghost" size="icon" title="Editar" onClick={() => editar(medicao)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {!ehParceiro && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Excluir"
                                      disabled={processandoId === String(medicao.id)}
                                      onClick={() => excluir(medicao)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
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
              <p className="mt-3 text-xs text-muted-foreground">
                Medições aprovadas não podem ser editadas nem excluídas. Para corrigir uma medição do contratante já
                aprovada, volte o status para "Aguardando" na própria lista (ou em Contas a Receber).
              </p>
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar medição ${editing.numero ?? ""}` : "Nova medição"}</DialogTitle>
            <DialogDescription>
              A medição é criada como AGUARDANDO. Só entra no Contas a Receber / Pagar depois de aprovada.
              {ehParceria && " Com parceria, a medição do parceiro é gerada junto e só pode ser aprovada depois da do contratante."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Empresa do grupo <span className="text-destructive">*</span></Label>
              <Select value={form.empresa_id} onValueChange={(v) => campo("empresa_id", v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={String(empresa.id)}>
                      {empresa.razao_social || empresa.nome}
                    </SelectItem>
                  ))}
                  {empresas.length === 0 && (
                    <SelectItem value="sem-empresas" disabled>Nenhuma empresa cadastrada</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Medição com <span className="text-destructive">*</span></Label>
              <Select
                value={form.modalidade}
                onValueChange={(v) => v && alterarModalidade(v as "frota" | "parceria")}
                disabled={!!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Frota cadastrada ou parceria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frota">Frota cadastrada (empresa do grupo)</SelectItem>
                  <SelectItem value="parceria">Parceria (placa manual)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Contratante (cliente)</Label>
              <Select
                value={form.cliente_nome.trim() ? "" : form.cliente_id}
                onValueChange={(v) => setForm((atual) => ({ ...atual, cliente_id: v ?? "", cliente_nome: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente da medição" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={String(cliente.id)}>{cliente.nome}</SelectItem>
                  ))}
                  {clientes.length === 0 && (
                    <SelectItem value="sem-clientes" disabled>Nenhum cliente cadastrado</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Input
                value={form.cliente_nome}
                onChange={(e) => setForm((atual) => ({ ...atual, cliente_nome: e.target.value, cliente_id: "" }))}
                placeholder="Ou digite o contratante manualmente"
                maxLength={255}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Obra</Label>
              <Input value={form.obra} onChange={(e) => campo("obra", e.target.value)} placeholder="Nome ou local da obra (aparece no PDF)" maxLength={150} />
            </div>

            <div className="space-y-2">
              <Label>Data da medição</Label>
              <Input type="date" value={form.data_medicao} onChange={(e) => campo("data_medicao", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Vencimento (contratante)</Label>
              <Input type="date" value={form.data_vencimento} onChange={(e) => campo("data_vencimento", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Período — de</Label>
              <Input type="date" value={form.periodo_inicio} onChange={(e) => campo("periodo_inicio", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Período — até</Label>
              <Input type="date" value={form.periodo_fim} onChange={(e) => campo("periodo_fim", e.target.value)} />
            </div>

            {ehParceria && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Tipo de contrato (parceria) <span className="text-destructive">*</span></Label>
                <Select
                  value={form.tipo_cobranca}
                  onValueChange={(v) => setForm((atual) => ({ ...atual, tipo_cobranca: (v ?? "") as FormState["tipo_cobranca"], placas: [] }))}
                  disabled={!!editing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Por hora ou mensal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TIPO_HORA}>Por hora (valor hora × horas trabalhadas)</SelectItem>
                    <SelectItem value={TIPO_MENSAL}>Mensal (valor mensal ÷ dias do mês × dias trabalhados)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Medição com parceiro aceita apenas um tipo de contrato. Na frota, cada placa pode ser por hora ou mensal.
                </p>
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label>Placas desta medição</Label>
              {form.modalidade && (!ehParceria || form.tipo_cobranca) ? (
                <>
                  <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      {form.modalidade === "frota" ? (
                        <PlacaInput
                          id="placa-medicao"
                          value={novaPlaca.placa}
                          options={placasFrota.filter((p) => !form.placas.some((a) => a.placa === p.toUpperCase().replace(/\s+/g, "")))}
                          onValueChange={(placa) =>
                            setNovaPlaca((atual) => ({
                              ...atual,
                              placa,
                              equipamento: equipamentosPorPlaca[placa.toUpperCase().replace(/\s+/g, "")] ?? atual.equipamento,
                            }))
                          }
                          placeholder="Placa da frota..."
                          showManualInput={false}
                        />
                      ) : (
                        <Input
                          value={novaPlaca.placa}
                          onChange={(e) => setNovaPlaca((atual) => ({ ...atual, placa: e.target.value.toUpperCase() }))}
                          placeholder="Placa (manual)"
                          aria-label="Placa manual"
                        />
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        value={novaPlaca.equipamento}
                        onChange={(e) => setNovaPlaca((atual) => ({ ...atual, equipamento: e.target.value }))}
                        placeholder="Equipamento (ex.: Caminhão Munck)"
                        aria-label="Equipamento"
                        maxLength={100}
                      />
                    </div>
                    {!ehParceria && (
                      <div className="sm:col-span-2">
                        <Select
                          value={novaPlaca.tipo}
                          onValueChange={(v) => setNovaPlaca((atual) => ({ ...atual, tipo: v ?? "" }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Contrato da placa" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={TIPO_HORA}>Por hora</SelectItem>
                            <SelectItem value={TIPO_MENSAL}>Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={novaPlaca.valor}
                      onChange={(e) => setNovaPlaca((atual) => ({ ...atual, valor: e.target.value }))}
                      placeholder={ehHora ? "Valor hora (R$)" : "Valor mensal (R$)"}
                    />
                    {ehHora && (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={novaPlaca.horas_contratadas}
                        onChange={(e) => setNovaPlaca((atual) => ({ ...atual, horas_contratadas: e.target.value }))}
                        placeholder="Horas contratadas"
                      />
                    )}
                    <Input
                      type="number"
                      min="0"
                      step={ehHora ? "0.01" : "1"}
                      value={novaPlaca.quantidade}
                      onChange={(e) => setNovaPlaca((atual) => ({ ...atual, quantidade: e.target.value }))}
                      placeholder={ehHora ? "Horas trabalhadas" : "Dias trabalhados"}
                    />
                    {ehParceria && (
                      <>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={novaPlaca.valor_parceiro}
                          onChange={(e) => setNovaPlaca((atual) => ({ ...atual, valor_parceiro: e.target.value }))}
                          placeholder={ehHora ? "Valor hora parceiro" : "Valor mensal parceiro"}
                        />
                        {ehHora && (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={novaPlaca.horas_contratadas_parceiro}
                            onChange={(e) => setNovaPlaca((atual) => ({ ...atual, horas_contratadas_parceiro: e.target.value }))}
                            placeholder="Horas contratadas parceiro"
                          />
                        )}
                        <Input
                          type="number"
                          min="0"
                          step={ehHora ? "0.01" : "1"}
                          value={novaPlaca.quantidade_parceiro}
                          onChange={(e) => setNovaPlaca((atual) => ({ ...atual, quantidade_parceiro: e.target.value }))}
                          placeholder={ehHora ? "Horas trabalhadas parceiro" : "Dias trabalhados parceiro"}
                        />
                      </>
                    )}
                    {tipoNova && (
                      <p className="text-sm sm:col-span-6">
                        Total calculado: <strong>{formatCurrency(valorLinha(novaPlaca.valor, novaPlaca.quantidade, tipoNova))}</strong>
                        {ehParceria && (
                          <>
                            {" · "}Parceiro:{" "}
                            <strong>{formatCurrency(valorLinha(novaPlaca.valor_parceiro, novaPlaca.quantidade_parceiro || novaPlaca.quantidade, tipoNova))}</strong>
                          </>
                        )}
                        {!ehHora && ` (valor mensal ÷ ${diasMes} dias × dias trabalhados)`}
                      </p>
                    )}
                    <Button type="button" onClick={adicionarPlaca}>
                      <Plus className="mr-1 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                  {algumaMensal && (
                    <div className="flex items-center gap-2">
                      <Label className="whitespace-nowrap">Dias do mês (contratos mensais)</Label>
                      <Select value={form.dias_mes} onValueChange={(v) => campo("dias_mes", v ?? "30")}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Dias do mês" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="28">28 dias</SelectItem>
                          <SelectItem value="29">29 dias</SelectItem>
                          <SelectItem value="30">30 dias</SelectItem>
                          <SelectItem value="31">31 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Equipamento</TableHead>
                          <TableHead>Placa</TableHead>
                          <TableHead>Contrato</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Trabalhado</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          {ehParceria && <TableHead className="text-right">Total parceiro</TableHead>}
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.placas.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={ehParceria ? 8 : 7} className="text-center text-sm text-muted-foreground">
                              Nenhuma placa adicionada.
                            </TableCell>
                          </TableRow>
                        )}
                        {form.placas.map((p) => {
                          const tipoPlaca = tipoDaPlaca(p);
                          const hora = tipoPlaca === TIPO_HORA;
                          return (
                            <TableRow key={p.placa}>
                              <TableCell>{p.equipamento || equipamentosPorPlaca[p.placa] || "-"}</TableCell>
                              <TableCell className="font-medium">{p.placa}</TableCell>
                              <TableCell>{hora ? "Por hora" : "Mensal"}</TableCell>
                              <TableCell>{formatCurrency(Number(p.valor) || 0)}</TableCell>
                              <TableCell>
                                {hora
                                  ? `${p.quantidade}h${Number(p.horas_contratadas) > 0 ? ` de ${p.horas_contratadas}h` : ""}`
                                  : `${p.quantidade} de ${diasMes} dias`}
                                {ehParceria && (
                                  <span className="block text-xs text-muted-foreground">
                                    Parceiro: {hora ? `${quantidadeParceiro(p)}h` : `${quantidadeParceiro(p)} dias`}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(valorLinha(p.valor, p.quantidade, tipoPlaca))}</TableCell>
                              {ehParceria && (
                                <TableCell className="text-right">{formatCurrency(valorLinha(p.valor_parceiro, quantidadeParceiro(p), tipoPlaca))}</TableCell>
                              )}
                              <TableCell className="text-right">
                                <button
                                  type="button"
                                  aria-label={`Remover placa ${p.placa}`}
                                  onClick={() => setForm((atual) => ({ ...atual, placas: atual.placas.filter((x) => x.placa !== p.placa) }))}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  Selecione a modalidade (frota ou parceria){ehParceria ? " e o tipo de contrato (hora ou mensal)" : ""} para adicionar placas.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Excedente (R$) — se necessário</Label>
              <Input type="number" min="0" step="0.01" value={form.valor_excedente} onChange={(e) => campo("valor_excedente", e.target.value)} />
            </div>
            <div />

            <div className="sm:col-span-2">
              <ListaVendas
                titulo="Vendas/avarias na medição do contratante (+ acrescenta / − desconta)"
                selecionadas={form.vendas}
                disponiveis={vendasDisponiveis(form.vendas, form.parceiro_vendas)}
                onAdicionar={(v) => campo("vendas", [...form.vendas, paraVenda(v)])}
                onRemover={(id) => campo("vendas", form.vendas.filter((v) => v.id !== id))}
              />
            </div>

            <div className="space-y-2">
              <Label>Comissão corretor — nome (contratante)</Label>
              <Input value={form.corretor_nome} onChange={(e) => campo("corretor_nome", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Comissão corretor — valor (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.corretor_valor} onChange={(e) => campo("corretor_valor", e.target.value)} />
            </div>

            {ehParceria && (
              <div className="space-y-4 rounded-lg border border-amber-300 bg-amber-50/60 p-4 sm:col-span-2">
                <p className="text-sm font-semibold">Medição do parceiro (gerada junto)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Parceiro <span className="text-destructive">*</span></Label>
                    <Select
                      value={parceiros.some((p) => p.nome === form.parceiro) ? form.parceiro : ""}
                      onValueChange={(v) => campo("parceiro", v ?? "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar parceiro cadastrado" />
                      </SelectTrigger>
                      <SelectContent>
                        {parceiros.map((parceiro) => (
                          <SelectItem key={parceiro.id} value={parceiro.nome}>{parceiro.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input value={form.parceiro} onChange={(e) => campo("parceiro", e.target.value)} placeholder="Ou digite o parceiro" />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento (parceiro)</Label>
                    <Input type="date" value={form.parceiro_vencimento} onChange={(e) => campo("parceiro_vencimento", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Desconto (%)</Label>
                    <Input type="number" min="0" max="100" step="0.01" value={form.desconto_percentual} onChange={(e) => campo("desconto_percentual", e.target.value)} />
                  </div>
                  <div />
                  <div className="space-y-2">
                    <Label>Comissão corretor — nome</Label>
                    <Input value={form.parceiro_corretor_nome} onChange={(e) => campo("parceiro_corretor_nome", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Comissão corretor — valor (R$)</Label>
                    <Input type="number" min="0" step="0.01" value={form.parceiro_corretor_valor} onChange={(e) => campo("parceiro_corretor_valor", e.target.value)} />
                  </div>
                </div>
                <ListaVendas
                  titulo="Vendas/avarias na medição do parceiro (+ acrescenta / − desconta)"
                  selecionadas={form.parceiro_vendas}
                  disponiveis={vendasDisponiveis(form.parceiro_vendas, form.vendas)}
                  onAdicionar={(v) => campo("parceiro_vendas", [...form.parceiro_vendas, paraVenda(v)])}
                  onRemover={(id) => campo("parceiro_vendas", form.parceiro_vendas.filter((v) => v.id !== id))}
                />
                <div className="space-y-2">
                  <Label>Observações do parceiro</Label>
                  <Input value={form.parceiro_observacoes} onChange={(e) => campo("parceiro_observacoes", e.target.value)} />
                </div>
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label>Observações (aparecem no PDF)</Label>
              <Input value={form.observacoes} onChange={(e) => campo("observacoes", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Observações internas (não saem no PDF)</Label>
              <Input maxLength={100} value={form.obs_internas} onChange={(e) => campo("obs_internas", e.target.value)} />
            </div>

            <div className="rounded-lg border border-border bg-slate-50 p-3 text-sm sm:col-span-2">
              <div className="flex flex-wrap justify-between gap-2">
                <span>Contratante (a receber): <strong>{formatCurrency(totaisContratante.total)}</strong></span>
                {ehParceria && (
                  <>
                    <span>Parceiro (a pagar): <strong>{formatCurrency(totaisParceiro.total)}</strong>
                      {totaisParceiro.desconto > 0 && ` (desc. ${formatCurrency(totaisParceiro.desconto)})`}
                    </span>
                    <span className={lucro < 0 ? "text-red-600" : "text-emerald-700"}>
                      Lucro da operação (interno): <strong>{formatCurrency(lucro)}</strong>
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                O corretor e o lucro não aparecem no PDF.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : editing ? "Salvar alterações" : "Criar medição"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
