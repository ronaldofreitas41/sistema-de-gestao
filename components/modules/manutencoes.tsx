"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Calculator,
  Check,
  Edit,
  FileDown,
  ImagePlus,
  Menu,
  MessageCircle,
  Plus,
  PackagePlus,
  Search,
  Trash2,
  X,
  Wrench,
} from "lucide-react";

import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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

import {
  deleteRegistro,
} from "@/lib/utils";
import { printManutencaoPDF } from "@/lib/pdf/pdfManutencao";
import { ManutencaoApi } from "@/lib/types";
import { chamarApi, mensagemErro } from "@/lib/api-client";
import { StatusSelect } from "@/components/ui/status-select";
import { lerImagemComprimida } from "@/lib/imagem";
import { compartilharWhatsApp } from "@/lib/whatsapp";


type Equipamento = {
  id: string | number;
  placa?: string | null;
  tipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
};

type FormData = {
  osNum: string;
  finStatus: string;
  eqId: string;
  eqLbl: string;
  placa: string;
  tipo: string;
  en: string;
  sa: string;
  km: string;
  hr: string;
  pkm: string;
  phr: string;
  custo: string;
  resp: string;
  ob: string;
  status: string;
  lancs: ItemOS[];
  checklist: ChecklistOS[];
  fotos: string[];
  pneus: PneuOS[];
};

type PneuOS = { pneu_id: string; numero: string };

type PneuEstoque = {
  id: string;
  numero: string;
  marca?: string | null;
  medida?: string | null;
  condicao?: string | null;
  situacao?: string | null;
};

type ItemOS = {
  desc: string;
  tipo: string;
  qtd: number;
  val: number;
};

type ChecklistOS = {
  nome: string;
  checked: boolean;
};

type ModeloChecklist = {
  id: string;
  nome: string;
};

type ItemChecklistModelo = {
  checklist_id: string;
  texto: string;
};

type ItemEstoque = {
  id: string | number;
  descricao: string;
  unidade?: string | null;
  quantidade?: number | string | null;
  custo_unitario?: number | string | null;
};

type AbaManutencao = "geral" | "produtos" | "checklist" | "fotos";
type CampoBasico = "osNum" | "resp" | "custo" | "km" | "hr" | "pkm" | "phr";

const formularioInicial: FormData = {
  osNum: "",
  finStatus: "aberta",
  eqId: "",
  eqLbl: "",
  placa: "",
  tipo: "",
  en: new Date().toISOString().slice(0, 10),
  sa: "",
  km: "",
  hr: "",
  pkm: "",
  phr: "",
  custo: "",
  resp: "",
  ob: "",
  status: "aberta",
  lancs: [],
  checklist: [],
  fotos: [],
  pneus: [],
};

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatarData(data?: string | null) {
  if (!data) return "-";

  const valor = data.slice(0, 10);
  const partes = valor.split("-");

  if (partes.length !== 3) return valor;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function normalizarStatus(status?: string | null) {
  return (status || "pendente").toLowerCase();
}

function extrairNumeroOs(osNum?: string | null) {
  const resultado = osNum?.match(/(\d+)\s*$/);
  return resultado ? Number.parseInt(resultado[1], 10) : 0;
}

function formatarNumeroOs(numero: number) {
  return `OS - ${String(numero).padStart(5, "0")}`;
}

const OPCOES_STATUS_OS = [
  { value: "aberta", label: "Em aberto", cor: "bg-amber-100 text-amber-800" },
  { value: "finalizada", label: "Finalizada", cor: "bg-emerald-100 text-emerald-800" },
];

const ROTULO_TIPO_OS: Record<string, string> = {
  PREVENTIVA: "Preventiva",
  "MANUTENÇÃO": "Manutenção / Corretiva",
  "TROCA DE PNEUS": "Troca de pneus",
};

function statusDaOS(status?: string | null) {
  const valor = normalizarStatus(status);
  return ["finalizada", "pago", "concluido", "concluída"].includes(valor) ? "finalizada" : "aberta";
}

export function Manutencoes() {
  const [manutencoes, setManutencoes] = useState<ManutencaoApi[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [pneusEstoque, setPneusEstoque] = useState<PneuEstoque[]>([]);
  const [pneuSelecionado, setPneuSelecionado] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManutencaoApi | null>(null);
  const [visualizando, setVisualizando] = useState<ManutencaoApi | null>(null);
  const [form, setForm] = useState<FormData>(formularioInicial);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [carregandoDetalheId, setCarregandoDetalheId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState("");

  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem("mh3_usuario");
      if (salvo) {
        const usuario = JSON.parse(salvo);
        setUsuarioLogado(usuario?.nome || usuario?.login || "");
      }
    } catch (error) {
      console.error("Erro ao ler o usuário logado:", error);
    }
  }, []);
  const [carregandoEquipamentos, setCarregandoEquipamentos] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaManutencao>("geral");
  const [modelosChecklist, setModelosChecklist] = useState<ModeloChecklist[]>([]);
  const [itensChecklistModelo, setItensChecklistModelo] = useState<ItemChecklistModelo[]>([]);
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [estoqueSelecionado, setEstoqueSelecionado] = useState("");
  const [checklistSelecionado, setChecklistSelecionado] = useState("");
  const [itemChecklistManual, setItemChecklistManual] = useState("");

  const carregarEquipamentos = useCallback(async () => {
    setCarregandoEquipamentos(true);
    try {
      const response = await fetch("/api/equipamentos");
      if (!response.ok) throw new Error("Não foi possível carregar os equipamentos.");

      const payload = await response.json();
      const lista = Array.isArray(payload) ? payload : payload.data;

      setEquipamentos(Array.isArray(lista) ? lista : []);
    } finally {
      setCarregandoEquipamentos(false);
    }
  }, []);

  const carregar = useCallback(async () => {
    const [manutencoesResponse] = await Promise.all([
      fetch(`/api/manutencoes?mes=${mes || "todos"}`, { credentials: "include" }),
      carregarEquipamentos(),
    ]);
    if (!manutencoesResponse.ok) {
      throw new Error("Não foi possível carregar as manutenções.");
    }
    const payload = await manutencoesResponse.json();

    setManutencoes(payload.data || []);
  }, [carregarEquipamentos, mes]);

  const carregarPneus = useCallback(async () => {
    try {
      const response = await fetch("/api/pneus", { credentials: "include" });
      const payload = await response.json();
      setPneusEstoque((Array.isArray(payload) ? payload : payload.data || []).filter((p: PneuEstoque) => p.situacao === "estoque"));
    } catch (erro) {
      console.error("Erro ao carregar pneus:", erro);
    }
  }, []);

  useEffect(() => {
    carregarPneus();
  }, [carregarPneus]);

  useEffect(() => {
    carregar();
    Promise.all([
      "/api/checklists",
      "/api/checklist-itens",
      "/api/estoque",
    ].map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) return [];
      const payload = await response.json();
      return Array.isArray(payload) ? payload : payload.data || [];
    }))
      .then(([checklistsData, checklistItemsData, stockData]) => {
        setModelosChecklist(checklistsData);
        setItensChecklistModelo(checklistItemsData);
        setItensEstoque(stockData);
      })
      .catch((error) => console.error("Erro ao carregar dados da OS:", error));
  }, [carregar]);

  function alterarCampo(campo: keyof FormData, valor: string) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }


  async function novaManutencao() {
    if (equipamentos.length === 0) {
      try {
        await carregarEquipamentos();
      } catch (error) {
        console.error(error);
      }
    }

    setEditing(null);
    setAbaAtiva("geral");
    setChecklistSelecionado("");
    setEstoqueSelecionado("");
    setForm({
      ...formularioInicial,
      osNum: proximoOs,
      en: new Date().toISOString().slice(0, 10),
      lancs: [],
      checklist: [],
      fotos: [],
      pneus: [],
    });
    setPneuSelecionado("");
    carregarPneus();
    setDialogOpen(true);
  }

  async function buscarManutencaoCompleta(id: string): Promise<ManutencaoApi> {
    const response = await fetch(`/api/manutencoes/${id}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Não foi possível carregar os detalhes da manutenção.");
    }
    return payload;
  }

  async function visualizar(manutencao: ManutencaoApi) {
    setCarregandoDetalheId(manutencao.id);
    try {
      setVisualizando(await buscarManutencaoCompleta(manutencao.id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível carregar a manutenção.");
    } finally {
      setCarregandoDetalheId(null);
    }
  }

  async function editar(manutencao: ManutencaoApi) {
    setCarregandoDetalheId(manutencao.id);
    let dados: ManutencaoApi;
    try {
      dados = await buscarManutencaoCompleta(manutencao.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível carregar a manutenção.");
      return;
    } finally {
      setCarregandoDetalheId(null);
    }

    setEditing(dados);
    setPneuSelecionado("");
    carregarPneus();
    setAbaAtiva("geral");
    setChecklistSelecionado("");
    setEstoqueSelecionado("");

    const equipamento = equipamentos.find(
      (item) => String(item.id) === String(dados.eqId) || item.placa === dados.placa
    );

    setForm({
      osNum: dados.osNum || "",
      finStatus: dados.finStatus || "aberta",
      eqId: equipamento ? String(equipamento.id) : dados.eqId || "",
      eqLbl: dados.eqLbl || "",
      placa: dados.placa || "",
      tipo: dados.tipo || "",
      en: dados.en?.slice(0, 10) || "",
      sa: dados.sa?.slice(0, 10) || "",
      km: String(dados.km || ""),
      hr: String(dados.hr || ""),
      pkm: String(dados.pkm || ""),
      phr: String(dados.phr || ""),
      custo: dados.custo || "",
      resp: dados.resp || "",
      ob: dados.ob || "",
      status: String(dados.status || "aberta").toLowerCase() === "finalizada" ? "finalizada" : "aberta",
      pneus: parseJsonArray((dados as unknown as { pneus?: unknown }).pneus).map((entry) => {
        const item = entry as Record<string, unknown>;
        return { pneu_id: String(item.pneu_id ?? ""), numero: String(item.numero ?? "") };
      }),
      lancs: parseJsonArray(dados.lancs).map((entry) => {
        const item = entry as Record<string, unknown>;
        return {
          desc: String(item.desc ?? item.descricao ?? ""),
          tipo: String(item.tipo ?? "Peça"),
          qtd: Number(item.qtd ?? item.quantidade ?? 1),
          val: Number(item.val ?? item.valor ?? 0),
        };
      }),
      checklist: parseJsonArray(dados.checklist).map((entry) => {
        const item = entry as Record<string, unknown>;
        return {
          nome: String(item.nome ?? item.texto ?? item.label ?? ""),
          checked: Boolean(item.checked ?? item.concluido ?? false),
        };
      }),
      fotos: parseJsonArray(dados.fotos).filter(
        (photo): photo is string => typeof photo === "string",
      ),
    });

    setDialogOpen(true);
  }

  async function alterarStatus(manutencao: ManutencaoApi, status: string) {
    await chamarApi(`/api/manutencoes/${manutencao.id}/status`, "POST", { status });
    await carregar();
  }

  async function enviarWhatsApp(manutencao: ManutencaoApi) {
    let arquivo: File | undefined;
    try {
      arquivo = await printManutencaoPDF(await buscarManutencaoCompleta(manutencao.id), "arquivo");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível gerar o PDF da O.S.");
      return;
    }
    await compartilharWhatsApp(
      [
        `*${manutencao.osNum}* — MH3 Rental`,
        `Veículo: ${manutencao.placa || "-"} ${manutencao.eqLbl ? `(${manutencao.eqLbl})` : ""}`.trim(),
        `Tipo: ${(manutencao.tipo && ROTULO_TIPO_OS[manutencao.tipo]) || manutencao.tipo || "-"}`,
        `Entrada: ${formatarData(manutencao.en)}`,
        `Status: ${statusDaOS(manutencao.status) === "finalizada" ? "Finalizada" : "Em aberto"}`,
        "Segue o PDF da O.S. em anexo.",
      ].join("\n"),
      undefined,
      arquivo,
    );
  }

  async function gerarPdf(manutencao: ManutencaoApi) {
    setCarregandoDetalheId(manutencao.id);
    try {
      const dados = await buscarManutencaoCompleta(manutencao.id);
      printManutencaoPDF(dados);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível carregar a manutenção.");
    } finally {
      setCarregandoDetalheId(null);
    }
  }

  function selecionarEquipamento(id: string) {
    const equipamento = equipamentos.find((item) => String(item.id) === id);

    alterarCampo("eqId", id);
    alterarCampo("placa", equipamento?.placa || "");
    alterarCampo(
      "eqLbl",
      [equipamento?.tipo, equipamento?.marca, equipamento?.modelo]
        .filter(Boolean)
        .join(" ")
    );
  }

  function adicionarItemManual() {
    setForm((atual) => ({
      ...atual,
      lancs: [...atual.lancs, { desc: "", tipo: "Peça", qtd: 1, val: 0 }],
    }));
  }

  function adicionarItemDoEstoque() {
    const item = itensEstoque.find((estoque) => String(estoque.id) === estoqueSelecionado);
    if (!item) return;
    setForm((atual) => ({
      ...atual,
      lancs: [
        ...atual.lancs,
        {
          desc: item.descricao,
          tipo: "Peça",
          qtd: 1,
          val: Number(item.custo_unitario) || 0,
        },
      ],
    }));
    setEstoqueSelecionado("");
  }

  function alterarItemOS(index: number, campo: keyof ItemOS, valor: string) {
    setForm((atual) => ({
      ...atual,
      lancs: atual.lancs.map((item, itemIndex) => itemIndex !== index
        ? item
        : {
            ...item,
            [campo]: campo === "desc" || campo === "tipo" ? valor : Number(valor) || 0,
          }),
    }));
  }

  function adicionarChecklistModelo(id: string) {
    setChecklistSelecionado(id);
    const itens = itensChecklistModelo
      .filter((item) => String(item.checklist_id) === id)
      .map((item) => ({ nome: item.texto, checked: false }));
    setForm((atual) => ({ ...atual, checklist: itens }));
  }

  function adicionarItemChecklistManual() {
    const nome = itemChecklistManual.trim();
    if (!nome) return;
    setForm((atual) => ({
      ...atual,
      checklist: [...atual.checklist, { nome, checked: false }],
    }));
    setItemChecklistManual("");
  }

  function adicionarFotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    Promise.all(files.map((file) => lerImagemComprimida(file)))
      .then((photos) => setForm((atual) => ({ ...atual, fotos: [...atual.fotos, ...photos] })))
      .catch(() => alert("Não foi possível carregar uma ou mais fotos."));
    event.target.value = "";
  }

  async function salvar() {
    if (salvando) return;
    if (!form.placa) return alert("Selecione a placa do veículo cadastrado na frota.");
    if (!form.tipo) return alert("Selecione o tipo da OS.");
    if (form.tipo === "TROCA DE PNEUS" && form.pneus.length === 0) {
      return alert("Na troca de pneus, selecione os pneus do estoque que serão retirados.");
    }

    setSalvando(true);

    try {
      const payload = {
        ...form,
        en: form.en || null,
        sa: form.sa || null,
        km: form.km || null,
        hr: form.hr || null,
        pkm: form.pkm || null,
        phr: form.phr || null,
      };

      await chamarApi(
        editing ? `/api/manutencoes/${editing.id}` : "/api/manutencoes",
        editing ? "PUT" : "POST",
        payload,
      );

      await carregar();
      await carregarPneus();
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      alert(mensagemErro(error, "Erro ao salvar a manutenção. Verifique os dados e tente novamente."));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (!confirm("Deseja realmente excluir esta manutenção?")) return;

    setDeletingId(id);

    try {
      if (!(await deleteRegistro(`/api/manutencoes/${id}`))) return;
      await carregar();
      await carregarPneus();
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível excluir a OS."));
    } finally {
      setDeletingId(null);
    }
  }

  const filtradas = useMemo(() => {
    return manutencoes.filter((manutencao) => {
      const texto = [
        manutencao.osNum || "",
        manutencao.placa || "",
        manutencao.eqLbl || "",
        manutencao.tipo || "",
        manutencao.status || "",
      ]
        .join(" ")
        .toLowerCase();

      const correspondeBusca = texto.includes(busca.toLowerCase());

      const status = normalizarStatus(manutencao.status);

      const correspondeStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "pendentes" &&
          ["pendente", "aberto", "aberta"].includes(status)) ||
        (filtroStatus === "concluidas" &&
          ["finalizada", "pago", "concluido", "concluída"].includes(status));

      return correspondeBusca && correspondeStatus;
    });
  }, [manutencoes, busca, filtroStatus]);
  const {
    sortedItems: manutencoesOrdenadas,
    sortKey,
    sortDirection,
    toggleSort,
  } = useSortableData(filtradas);

  const proximoOs = useMemo(() => {
    const maiorOs = manutencoes.reduce((maior, manutencao) => {
      return Math.max(maior, extrairNumeroOs(manutencao.osNum));
    }, 0);

    return formatarNumeroOs(maiorOs + 1);
  }, [manutencoes]);

  const pendentes = manutencoesOrdenadas.filter((manutencao) =>
    ["pendente", "aberto", "aberta"].includes(
      normalizarStatus(manutencao.status)
    )
  );

  const concluidas = manutencoesOrdenadas.filter((manutencao) =>
    ["finalizada", "pago", "concluido", "concluída"].includes(
      normalizarStatus(manutencao.status)
    )
  );

  const outras = manutencoesOrdenadas.filter((manutencao) => {
    const status = normalizarStatus(manutencao.status);

    return (
      !["pendente", "aberto", "aberta"].includes(status) &&
      !["finalizada", "pago", "concluido", "concluída"].includes(status)
    );
  });

  function renderTabela(
    titulo: string,
    registros: ManutencaoApi[],
    tipo: "abertas" | "concluidas" | "outras"
  ) {
    if (registros.length === 0) return null;

    return (
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border px-4 py-4">
          <CardTitle
            className={`flex items-center gap-2 text-base font-semibold ${
              tipo === "abertas"
                ? "text-primary"
                : tipo === "concluidas"
                  ? "text-emerald-700"
                  : "text-muted-foreground"
            }`}
          >
            <Calculator className="h-5 w-5" />
            {titulo} ({registros.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead<ManutencaoApi> label="O.S." sortKey="osNum" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(manutencao) => manutencao.osNum} />
                  <SortableTableHead<ManutencaoApi> label="Equipamento" sortKey="eqLbl" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(manutencao) => manutencao.eqLbl} />
                  <SortableTableHead<ManutencaoApi> label="Placa" sortKey="placa" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(manutencao) => manutencao.placa} />
                  <SortableTableHead<ManutencaoApi> label="Tipo" sortKey="tipo" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(manutencao) => manutencao.tipo} />
                  <SortableTableHead<ManutencaoApi> label="Entrada / Saída" sortKey="en" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(manutencao) => manutencao.en} />
                  <SortableTableHead<ManutencaoApi> label="Status" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} getValue={(manutencao) => manutencao.status} />
                  <TableHead className="text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {registros.map((manutencao) => (
                  <TableRow
                    key={manutencao.id}
                    className="transition-colors"
                  >
                    <TableCell className="text-xs">
                      <span className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                        {manutencao.osNum || "-"}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {manutencao.eqLbl || "-"}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      {manutencao.placa || "-"}
                    </TableCell>

                    <TableCell className="text-xs">
                      {(manutencao.tipo && ROTULO_TIPO_OS[manutencao.tipo]) || manutencao.tipo || "-"}
                    </TableCell>

                    <TableCell className="text-xs font-semibold text-emerald-700">
                      {formatarData(manutencao.en)} / {formatarData(manutencao.sa)}
                    </TableCell>

                    <TableCell>
                      <StatusSelect
                        value={statusDaOS(manutencao.status)}
                        opcoes={OPCOES_STATUS_OS}
                        disabled={statusDaOS(manutencao.status) === "finalizada"}
                        onChange={(novo) => alterarStatus(manutencao, novo)}
                      />
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Visualizar OS"
                          aria-label="Visualizar OS"
                          className="h-8 w-8 text-slate-600"
                          disabled={carregandoDetalheId === manutencao.id}
                          onClick={() => visualizar(manutencao)}
                        >
                          <Search className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Gerar PDF"
                          aria-label="Gerar PDF"
                          className="h-8 w-8 text-primary"
                          disabled={carregandoDetalheId === manutencao.id}
                          onClick={() => gerarPdf(manutencao)}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Compartilhar no WhatsApp"
                          aria-label="Compartilhar no WhatsApp"
                          className="h-8 w-8 text-emerald-600"
                          onClick={() => enviarWhatsApp(manutencao)}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Editar manutenção"
                          aria-label="Editar manutenção"
                          disabled={carregandoDetalheId === manutencao.id}
                          className="h-8 w-8 text-blue-600"
                          onClick={() => editar(manutencao)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Excluir manutenção"
                          aria-label="Excluir manutenção"
                          disabled={deletingId === manutencao.id}
                          className="h-8 w-8 text-destructive"
                          onClick={() => excluir(String(manutencao.id))}
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
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar desktop */}
      <div className="fixed inset-y-0 left-0 z-40 hidden md:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>

      {/* Sidebar mobile */}
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

      {/* Conteúdo principal */}
      <div
        className={`min-h-screen transition-[padding-left] duration-300 ${
          sidebarCollapsed ? "md:pl-18" : "md:pl-65"
        }`}
      >
        {/* Cabeçalho compacto */}
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

            <h1 className="text-lg font-bold sm:text-2xl">
              Manutenções
            </h1>
          </div>

          <Button
            onClick={novaManutencao}
            className="h-10"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova manutenção
          </Button>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          {/* Barra de busca e filtros */}
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  className="pl-9"
                  placeholder="Buscar por O.S., equipamento, placa..."
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Mês:</Label>
                <Input
                  type="month"
                  value={mes}
                  onChange={(event) => setMes(event.target.value)}
                  className="w-40"
                  aria-label="Mês das OS"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setMes("")}>
                  Todos
                </Button>
                <Label className="whitespace-nowrap">
                  Status:
                </Label>

                <Select
                  value={filtroStatus}
                  onValueChange={setFiltroStatus}
                >
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Filtrar status" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendentes">Em aberto</SelectItem>
                    <SelectItem value="concluidas">Finalizadas</SelectItem>
                  </SelectContent>
                </Select>

                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {filtradas.length} registro(s)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tabelas por status */}
          {renderTabela("OS em aberto", pendentes, "abertas")}
          {renderTabela("OS finalizadas", concluidas, "concluidas")}
          {renderTabela("Outras Manutenções", outras, "outras")}

          {filtradas.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Search className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Nenhuma manutenção encontrada
                </p>
                <p className="text-xs text-muted-foreground">
                  Altere os filtros ou cadastre uma nova manutenção.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Modal de cadastro/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[92vh] w-[calc(100vw-0.5rem)]! max-w-none! flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl!">
          <DialogHeader className="flex flex-row items-center border-b border-border px-5 py-4 pr-12 sm:px-6">
            <div className="flex items-center gap-3">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <DialogTitle className="text-sm font-semibold">
                OS — {form.osNum || (editing ? editing.osNum : proximoOs)}
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              Cadastro e edição de ordem de serviço.
            </DialogDescription>
          </DialogHeader>

          <div role="tablist" aria-label="Seções da ordem de serviço" className="flex shrink-0 overflow-x-auto border-b border-border px-4 sm:px-6">
            {([
              ["geral", "Geral"],
              ["produtos", "Produtos/Peças"],
              ["checklist", "Checklist"],
              ["fotos", "Fotos"],
            ] as [AbaManutencao, string][]).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={abaAtiva === tab}
                onClick={() => setAbaAtiva(tab)}
                className={`min-h-10 shrink-0 border-b-2 px-3 text-xs font-medium transition-colors ${
                  abaAtiva === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {abaAtiva === "geral" && (
              <div role="tabpanel" className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Veículo/equipamento</Label>
                  <select
                    id="equipamento-os"
                    value={equipamentos.find((equipamento) => String(equipamento.id) === form.eqId)?.placa || form.placa || ""}
                    onChange={(event) => {
                      const placa = event.target.value;
                      const equipamento = equipamentos.find((item) => item.placa?.toUpperCase() === placa.trim().toUpperCase());
                      if (equipamento) {
                        selecionarEquipamento(String(equipamento.id));
                      } else {
                        setForm((atual) => ({ ...atual, eqId: "", eqLbl: "", placa }));
                      }
                    }}
                    disabled={carregandoEquipamentos}
                    className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {carregandoEquipamentos ? "Carregando placas..." : "Selecione uma placa"}
                    </option>
                    {Array.from(new Set(equipamentos.map((equipamento) => equipamento.placa).filter((placa): placa is string => Boolean(placa)))).map((placa) => (
                      <option key={placa} value={placa}>
                        {placa}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Tipo de OS</Label>
                  <Select value={form.tipo} onValueChange={(value) => alterarCampo("tipo", value)}>
                    <SelectTrigger className="h-10 bg-muted/20"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREVENTIVA">Preventiva</SelectItem>
                      <SelectItem value="MANUTENÇÃO">Manutenção / Corretiva</SelectItem>
                      <SelectItem value="TROCA DE PNEUS">Troca de pneus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.tipo === "TROCA DE PNEUS" && (
                  <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50/60 p-3 sm:col-span-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Pneus retirados do estoque (pelo nº cadastrado)
                    </Label>
                    <div className="flex gap-2">
                      <Select value={pneuSelecionado} onValueChange={(valor) => setPneuSelecionado(valor ?? "")}>
                        <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Selecionar pneu em estoque" /></SelectTrigger>
                        <SelectContent>
                          {pneusEstoque
                            .filter((p) => !form.pneus.some((x) => x.pneu_id === p.id))
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {`Nº ${p.numero} — ${[p.marca, p.medida, p.condicao].filter(Boolean).join(" · ")}`}
                              </SelectItem>
                            ))}
                          {pneusEstoque.length === 0 && <SelectItem value="sem-pneus" disabled>Nenhum pneu em estoque</SelectItem>}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        disabled={!pneuSelecionado}
                        onClick={() => {
                          const pneu = pneusEstoque.find((p) => p.id === pneuSelecionado);
                          if (!pneu) return;
                          setForm((atual) => ({ ...atual, pneus: [...atual.pneus, { pneu_id: pneu.id, numero: pneu.numero }] }));
                          setPneuSelecionado("");
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" /> Adicionar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.pneus.length === 0 && <span className="text-xs text-muted-foreground">Nenhum pneu selecionado.</span>}
                      {form.pneus.map((p) => (
                        <span key={p.pneu_id} className="flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-xs">
                          Nº {p.numero}
                          <button
                            type="button"
                            aria-label={`Remover pneu ${p.numero}`}
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setForm((atual) => ({ ...atual, pneus: atual.pneus.filter((x) => x.pneu_id !== p.pneu_id) }))}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Ao salvar, os pneus saem do estoque e o sistema gera uma pendência de entrada de carcaça para cada pneu retirado.
                    </p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Entrada (data de criação)</Label>
                  <Input type="date" value={form.en} readOnly disabled title="A data de entrada é a da criação da OS e não pode ser alterada." className="h-10 bg-muted/20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Saída (conclusão)</Label>
                  <Input type="date" value={form.sa} onChange={(event) => alterarCampo("sa", event.target.value)} className="h-10 bg-muted/20" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">KM na entrada</Label>
                  <Input type="number" value={form.km} onChange={(event) => alterarCampo("km", event.target.value)} className="h-10 bg-muted/20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Horímetro</Label>
                  <Input type="number" value={form.hr} onChange={(event) => alterarCampo("hr", event.target.value)} className="h-10 bg-muted/20" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Próx. revisão KM</Label>
                  <Input type="number" value={form.pkm} onChange={(event) => alterarCampo("pkm", event.target.value)} className="h-10 bg-muted/20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Próx. revisão H</Label>
                  <Input type="number" value={form.phr} onChange={(event) => alterarCampo("phr", event.target.value)} className="h-10 bg-muted/20" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Custo desta OS</Label>
                  <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-muted/20 px-3 text-xs">
                    <span aria-hidden="true" className="text-primary">◉</span>
                    <span>Para MH3 (custo interno)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Cobranças ao cliente devem ser lançadas em Vendas.</p>
                  <Input type="number" min="0" step="0.01" value={form.custo} onChange={(event) => alterarCampo("custo", event.target.value)} className="h-9 bg-muted/20" placeholder="Custo interno da OS" aria-label="Custo interno da OS" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</Label>
                  <Select value={form.status} disabled={!!editing && statusDaOS(editing.status) === "finalizada"} onValueChange={(value) => setForm((atual) => ({ ...atual, status: value ?? "aberta", finStatus: value ?? "aberta" }))}>
                    <SelectTrigger className="h-10 bg-muted/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberta">Em aberto</SelectItem>
                      <SelectItem value="finalizada">Finalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Responsável (usuário que criou a OS)</Label>
                  <Input value={editing ? form.resp : usuarioLogado} readOnly disabled title="O responsável é o usuário que criou a OS." className="h-10 bg-muted/20" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Observações</Label>
                  <Textarea value={form.ob} onChange={(event) => alterarCampo("ob", event.target.value)} className="min-h-20 resize-y bg-muted/20" />
                </div>
              </div>
            )}

            {abaAtiva === "produtos" && (
              <div role="tabpanel" className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground">Produtos/Peças utilizados</h3>
                    <p className="mt-1 text-[10px] text-muted-foreground">Adicione materiais do estoque ou informe um item manualmente.</p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Select value={estoqueSelecionado} onValueChange={setEstoqueSelecionado}>
                      <SelectTrigger className="h-9 w-full sm:w-56"><SelectValue placeholder="Selecionar do estoque..." /></SelectTrigger>
                      <SelectContent>
                        {itensEstoque.length ? itensEstoque.map((item) => (
                          <SelectItem key={String(item.id)} value={String(item.id)}>
                            {item.descricao} {item.quantidade != null ? `(${item.quantidade} ${item.unidade || "un"})` : ""}
                          </SelectItem>
                        )) : <SelectItem value="sem-estoque" disabled>Estoque vazio</SelectItem>}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" className="h-9 text-emerald-700" onClick={adicionarItemDoEstoque} disabled={!estoqueSelecionado}>
                      <PackagePlus className="mr-1.5 h-4 w-4" /> Do estoque
                    </Button>
                    <Button type="button" className="h-9" onClick={adicionarItemManual}>
                      <Plus className="mr-1.5 h-4 w-4" /> Manual
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-[10px] uppercase">Descrição</TableHead>
                        <TableHead className="w-32 text-[10px] uppercase">Tipo</TableHead>
                        <TableHead className="w-24 text-[10px] uppercase">Qtd</TableHead>
                        <TableHead className="w-36 text-right text-[10px] uppercase">Valor</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.lancs.map((item, index) => (
                        <TableRow key={`${index}-${item.desc}`}>
                          <TableCell><Input aria-label="Descrição do item" value={item.desc} onChange={(event) => alterarItemOS(index, "desc", event.target.value)} className="h-9 min-w-40" /></TableCell>
                          <TableCell>
                            <Select value={item.tipo} onValueChange={(value) => alterarItemOS(index, "tipo", value)}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="Peça">Peça</SelectItem><SelectItem value="Serviço">Serviço</SelectItem></SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input aria-label="Quantidade" type="number" min="1" value={item.qtd} onChange={(event) => alterarItemOS(index, "qtd", event.target.value)} className="h-9" /></TableCell>
                          <TableCell><Input aria-label="Valor total do item" type="number" min="0" step="0.01" value={item.val} onChange={(event) => alterarItemOS(index, "val", event.target.value)} className="h-9 text-right" /></TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" aria-label="Remover item" title="Remover item" onClick={() => setForm((atual) => ({ ...atual, lancs: atual.lancs.filter((_, itemIndex) => itemIndex !== index) }))}>
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!form.lancs.length && (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">Nenhum item adicionado.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end border-t border-border pt-3 text-xs text-muted-foreground">
                  Total OS: <strong className="ml-2 text-emerald-700">R$ {form.lancs.reduce((total, item) => total + item.val, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            )}

            {abaAtiva === "checklist" && (
              <div role="tabpanel" className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="w-full sm:max-w-xs">
                    <Select value={checklistSelecionado} onValueChange={adicionarChecklistModelo}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Adicionar checklist..." /></SelectTrigger>
                      <SelectContent>
                        {modelosChecklist.length ? modelosChecklist.map((modelo) => (
                          <SelectItem key={modelo.id} value={modelo.id}>{modelo.nome}</SelectItem>
                        )) : <SelectItem value="sem-checklists" disabled>Nenhum modelo cadastrado</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Você pode somar vários itens manualmente.</span>
                </div>

                <div className="space-y-1 rounded-md border border-border bg-muted/10 p-3">
                  {form.checklist.map((item, index) => (
                    <div key={`${index}-${item.nome}`} className="flex min-h-10 items-center gap-3 border-b border-border/70 last:border-0">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={(checked) => setForm((atual) => ({
                          ...atual,
                          checklist: atual.checklist.map((checkItem, itemIndex) => itemIndex === index ? { ...checkItem, checked: checked === true } : checkItem),
                        }))}
                        aria-label={`Marcar ${item.nome}`}
                      />
                      <span className={`flex-1 text-sm ${item.checked ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.nome}</span>
                      <Button type="button" variant="ghost" size="icon" aria-label="Remover item do checklist" onClick={() => setForm((atual) => ({ ...atual, checklist: atual.checklist.filter((_, itemIndex) => itemIndex !== index) }))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {!form.checklist.length && (
                    <div className="flex min-h-28 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                      <Check className="h-5 w-5 text-muted-foreground/50" />
                      Selecione um checklist acima ou adicione um item manual abaixo.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checklist-manual" className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Incluir solicitação/item manual no checklist</Label>
                  <div className="flex gap-2">
                    <Input id="checklist-manual" value={itemChecklistManual} onChange={(event) => setItemChecklistManual(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), adicionarItemChecklistManual())} placeholder="Ex.: Trocar porca da roda 3, tampão do tanque..." />
                    <Button type="button" onClick={adicionarItemChecklistManual} disabled={!itemChecklistManual.trim()}><Plus className="mr-1 h-4 w-4" /> Item</Button>
                  </div>
                </div>
              </div>
            )}

            {abaAtiva === "fotos" && (
              <div role="tabpanel" className="space-y-4">
                <div>
                  <Label htmlFor="fotos-manutencao" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <ImagePlus className="h-4 w-4" /> Fotos da manutenção
                  </Label>
                  <Input id="fotos-manutencao" type="file" accept="image/*" multiple onChange={adicionarFotos} className="mt-3" />
                </div>
                {form.fotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {form.fotos.map((photo, index) => (
                      <div key={`${index}-${photo.slice(0, 20)}`} className="group relative aspect-4/3 overflow-hidden rounded-md border border-border bg-muted/20">
                        <img src={photo} alt={`Foto da manutenção ${index + 1}`} className="h-full w-full object-cover" />
                        <Button type="button" variant="destructive" size="icon" aria-label={`Remover foto ${index + 1}`} className="absolute right-2 top-2 h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => setForm((atual) => ({ ...atual, fotos: atual.fotos.filter((_, photoIndex) => photoIndex !== index) }))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    Nenhuma foto adicionada.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border bg-background px-4 py-3 sm:px-6">
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
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : editing
                  ? "Salvar OS"
                  : "Salvar OS"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!visualizando} onOpenChange={(aberto) => !aberto && setVisualizando(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{visualizando?.osNum ?? "Ordem de serviço"}</DialogTitle>
            <DialogDescription>Detalhes da ordem de serviço.</DialogDescription>
          </DialogHeader>
          {visualizando && (() => {
            const lista = (valor: unknown) => (Array.isArray(valor) ? valor : []) as Array<Record<string, any>>;
            const itens = lista(visualizando.lancs);
            const pneus = lista(visualizando.pneus);
            const checklist = lista(visualizando.checklist);
            return (
              <div className="space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Veículo", visualizando.placa || visualizando.eqLbl],
                    ["Tipo", (visualizando.tipo && ROTULO_TIPO_OS[visualizando.tipo]) || visualizando.tipo],
                    ["Status", statusDaOS(visualizando.status) === "finalizada" ? "Finalizada" : "Em aberto"],
                    ["Entrada", formatarData(visualizando.en)],
                    ["Saída", formatarData(visualizando.sa)],
                    ["Responsável", visualizando.resp],
                    ["Km / Horímetro", `${visualizando.km ?? "-"} / ${visualizando.hr ?? "-"}`],
                    ["Próxima revisão", `${visualizando.pkm ?? "-"} km / ${visualizando.phr ?? "-"} h`],
                  ].map(([rotulo, valor]) => (
                    <div key={rotulo as string}>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">{rotulo}</p>
                      <p className="font-medium">{(valor as string) || "-"}</p>
                    </div>
                  ))}
                </div>
                {pneus.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Pneus retirados do estoque</p>
                    <p>{pneus.map((p) => p.numero || p.pneu_id).join(", ")}</p>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Produtos / peças e serviços</p>
                  {itens.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum lançamento.</p>
                  ) : (
                    <ul className="divide-y rounded-md border">
                      {itens.map((item, indice) => (
                        <li key={indice} className="flex justify-between gap-2 px-3 py-2">
                          <span>{item.desc} <span className="text-muted-foreground">({item.tipo}, {item.qtd}x)</span></span>
                          <strong>{Number(item.val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {checklist.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Checklist</p>
                    <ul className="space-y-1">
                      {checklist.map((item, indice) => (
                        <li key={indice}>{item.checked ? "✓" : "○"} {item.nome}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {visualizando.ob && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Observações</p>
                    <p className="whitespace-pre-wrap">{visualizando.ob}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}