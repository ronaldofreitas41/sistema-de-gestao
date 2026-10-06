"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Calculator,
  Check,
  Edit,
  FileDown,
  ImagePlus,
  Menu,
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

import {
  deleteRegistro,
} from "@/lib/utils";
import { printManutencaoPDF } from "@/lib/pdf/pdfManutencao";
import { ManutencaoApi } from "@/lib/types";


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
  status: "pendente",
  lancs: [],
  checklist: [],
  fotos: [],
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

function BadgeStatus({ status }: { status?: string | null }) {
  const valor = normalizarStatus(status);

  const estilos: Record<string, string> = {
    pago: "bg-emerald-100 text-emerald-700 border-emerald-200",
    concluido: "bg-emerald-100 text-emerald-700 border-emerald-200",
    concluída: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pendente: "bg-amber-100 text-amber-700 border-amber-200",
    aberto: "bg-amber-100 text-amber-700 border-amber-200",
    aberta: "bg-amber-100 text-amber-700 border-amber-200",
    cancelado: "bg-destructive/10 text-destructive border-destructive/20",
    cancelada: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const classe =
    estilos[valor] || "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${classe}`}
    >
      {status || "Pendente"}
    </span>
  );
}

export function Manutencoes() {
  const [manutencoes, setManutencoes] = useState<ManutencaoApi[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManutencaoApi | null>(null);
  const [form, setForm] = useState<FormData>(formularioInicial);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
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
      fetch("/api/manutencoes"),
      carregarEquipamentos(),
    ]);
    const payload = await manutencoesResponse.json();

    setManutencoes(payload.data || []);
  }, [carregarEquipamentos]);

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
    });
    setDialogOpen(true);
  }

  function editar(manutencao: ManutencaoApi) {
    setEditing(manutencao);
    setAbaAtiva("geral");
    setChecklistSelecionado("");
    setEstoqueSelecionado("");

    const equipamento = equipamentos.find(
      (item) => String(item.id) === String(manutencao.eqId) || item.placa === manutencao.placa
    );

    setForm({
      osNum: manutencao.osNum || "",
      finStatus: manutencao.finStatus || "aberta",
      eqId: equipamento ? String(equipamento.id) : manutencao.eqId || "",
      eqLbl: manutencao.eqLbl || "",
      placa: manutencao.placa || "",
      tipo: manutencao.tipo || "",
      en: manutencao.en?.slice(0, 10) || "",
      sa: manutencao.sa?.slice(0, 10) || "",
      km: String(manutencao.km || ""),
      hr: String(manutencao.hr || ""),
      pkm: String(manutencao.pkm || ""),
      phr: String(manutencao.phr || ""),
      custo: manutencao.custo || "",
      resp: manutencao.resp || "",
      ob: manutencao.ob || "",
      status: manutencao.status || "pendente",
      lancs: parseJsonArray(manutencao.lancs).map((entry) => {
        const item = entry as Record<string, unknown>;
        return {
          desc: String(item.desc ?? item.descricao ?? ""),
          tipo: String(item.tipo ?? "Peça"),
          qtd: Number(item.qtd ?? item.quantidade ?? 1),
          val: Number(item.val ?? item.valor ?? 0),
        };
      }),
      checklist: parseJsonArray(manutencao.checklist).map((entry) => {
        const item = entry as Record<string, unknown>;
        return {
          nome: String(item.nome ?? item.texto ?? item.label ?? ""),
          checked: Boolean(item.checked ?? item.concluido ?? false),
        };
      }),
      fotos: parseJsonArray(manutencao.fotos).filter(
        (photo): photo is string => typeof photo === "string",
      ),
    });

    setDialogOpen(true);
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
    Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })))
      .then((photos) => setForm((atual) => ({ ...atual, fotos: [...atual.fotos, ...photos] })))
      .catch(() => alert("Não foi possível carregar uma ou mais fotos."));
    event.target.value = "";
  }

  async function salvar() {
    if (salvando) return;

    setSalvando(true);

    try {
      const payload = {
        ...form,
        en: form.en ? new Date(form.en).toISOString() : null,
        sa: form.sa ? new Date(form.sa).toISOString() : null,
        km: form.km || null,
        hr: form.hr || null,
        pkm: form.pkm || null,
        phr: form.phr || null,
      };

      const response = await fetch(
        editing ? `/api/manutencoes/${editing.id}` : "/api/manutencoes",
        {
          method: editing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível salvar a manutenção.");
      }

      await carregar();
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar a manutenção. Verifique os dados e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (!confirm("Deseja realmente excluir esta manutenção?")) return;

    setDeletingId(id);

    try {
      await deleteRegistro(`/api/manutencoes/${id}`);
      await carregar();
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
          ["pago", "concluido", "concluída"].includes(status));

      return correspondeBusca && correspondeStatus;
    });
  }, [manutencoes, busca, filtroStatus]);

  const proximoOs = useMemo(() => {
    const maiorOs = manutencoes.reduce((maior, manutencao) => {
      return Math.max(maior, extrairNumeroOs(manutencao.osNum));
    }, 0);

    return formatarNumeroOs(maiorOs + 1);
  }, [manutencoes]);

  const pendentes = filtradas.filter((manutencao) =>
    ["pendente", "aberto", "aberta"].includes(
      normalizarStatus(manutencao.status)
    )
  );

  const concluidas = filtradas.filter((manutencao) =>
    ["pago", "concluido", "concluída"].includes(
      normalizarStatus(manutencao.status)
    )
  );

  const outras = filtradas.filter((manutencao) => {
    const status = normalizarStatus(manutencao.status);

    return (
      !["pendente", "aberto", "aberta"].includes(status) &&
      !["pago", "concluido", "concluída"].includes(status)
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
                  <TableHead>
                    O.S.
                  </TableHead>
                  <TableHead>
                    Equipamento
                  </TableHead>
                  <TableHead>
                    Placa
                  </TableHead>
                  <TableHead>
                    Tipo
                  </TableHead>
                  <TableHead>
                    Entrada / Saída
                  </TableHead>
                  <TableHead>
                    Status
                  </TableHead>
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
                      {manutencao.tipo || "-"}
                    </TableCell>

                    <TableCell className="text-xs font-semibold text-emerald-700">
                      {formatarData(manutencao.en)} / {formatarData(manutencao.sa)}
                    </TableCell>

                    <TableCell>
                      <BadgeStatus status={manutencao.status} />
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Gerar PDF"
                          aria-label="Gerar PDF"
                          className="h-8 w-8 text-primary"
                          onClick={() => printManutencaoPDF(manutencao)}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Editar manutenção"
                          aria-label="Editar manutenção"
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
                    <SelectItem value="pendentes">Pendentes</SelectItem>
                    <SelectItem value="concluidas">Concluídas</SelectItem>
                  </SelectContent>
                </Select>

                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {filtradas.length} registro(s)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tabelas por status */}
          {renderTabela("Manutenções Pendentes", pendentes, "abertas")}
          {renderTabela("Manutenções Concluídas", concluidas, "concluidas")}
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
                  <Select value={form.eqId} onValueChange={selecionarEquipamento}>
                    <SelectTrigger className="h-10 bg-muted/20">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {carregandoEquipamentos ? (
                        <SelectItem value="carregando" disabled>Carregando equipamentos...</SelectItem>
                      ) : equipamentos.filter((equipamento) => equipamento.placa).length > 0 ? (
                        equipamentos.filter((equipamento) => equipamento.placa).map((equipamento) => (
                          <SelectItem key={String(equipamento.id)} value={String(equipamento.id)}>
                            {equipamento.placa} — {[equipamento.tipo, equipamento.marca, equipamento.modelo].filter(Boolean).join(" ")}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="nenhum" disabled>Nenhum equipamento com placa cadastrado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Tipo de OS</Label>
                  <Select value={form.tipo} onValueChange={(value) => alterarCampo("tipo", value)}>
                    <SelectTrigger className="h-10 bg-muted/20"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Preventiva">Preventiva</SelectItem>
                      <SelectItem value="Revisão">Revisão</SelectItem>
                      <SelectItem value="Revisão preventiva">Revisão preventiva</SelectItem>
                      <SelectItem value="Troca de Pneus">Troca de Pneus</SelectItem>
                      <SelectItem value="Troca de Peças">Troca de Peças</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Entrada</Label>
                  <Input type="date" value={form.en} onChange={(event) => alterarCampo("en", event.target.value)} className="h-10 bg-muted/20" />
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
                  <Select value={form.status} onValueChange={(value) => alterarCampo("status", value)}>
                    <SelectTrigger className="h-10 bg-muted/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status financeiro</Label>
                  <Select value={form.finStatus} onValueChange={(value) => alterarCampo("finStatus", value)}>
                    <SelectTrigger className="h-10 bg-muted/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="paga">Paga</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Responsável</Label>
                  <Input value={form.resp} onChange={(event) => alterarCampo("resp", event.target.value)} className="h-10 bg-muted/20" placeholder="Nome do responsável" />
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
    </div>
  );
}