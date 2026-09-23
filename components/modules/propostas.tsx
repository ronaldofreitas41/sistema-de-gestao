"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Menu,
  X,
  Calendar,
  Download,
  ImagePlus,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Proposta } from "@/lib/types";
import { deleteRegistro } from "@/lib/utils";
import {
  PageSizeSelect,
  PaginationControls,
  paginate,
} from "@/components/ui/pagination";
import { generatePropostaPDF } from "@/lib/pdf/pdfProposta";
import { RESPONSABILIDADES_PADRAO, SEGURO_PADRAO } from "@/lib/common";

const initialFormData: Omit<Proposta, "id"> = {
  empresaId: "",
  data: new Date().toISOString().split("T")[0],
  validade: "",
  contratante: "",
  obra: "",
  veiculo: "",
  modelo: "",
  ano: "",
  qtd: 1,
  cobrancaModo: "fechado",
  turnoFechado: 1,
  valorFechado: 0,
  km: "0",
  horimetro: "0",
  mostrarKmHr: false,
  linhas: [
    { turno: 1, vh: 0, gar: 0, vm: 0 },
    { turno: 2, vh: 0, gar: 0, vm: 0 },
    { turno: 3, vh: 0, gar: 0, vm: 0 },
  ],
  franquia: "",
  obs: "",
  mobilTipo: "contratante",
  mobilValor: 0,
  duracao: "12",
  tempoLocacao: 1,
  multaTipo: "com_multa",
  fidelidade: 6,
  multaPct: 0,
  resp: RESPONSABILIDADES_PADRAO,
  seguro: "",
  ciclo: "01 a 30/31",
  pagamento: "Conforme tratativas com a Contratante",
  criadoEm: "",
  criadoPor: "",
  numero: "",
  email: "",
  fotos: [],
  aprovada: false,
  ctAssinado: false,
  equipsExtra: [],
  temSeguro: "",
  manutTipo: "",
  incluirTurnos: false,
};

type EmpresaOption = {
  id: string | number;
  nome: string;
  razao_social?: string | null;
  logo?: string | null;
};
type EquipamentoOption = {
  id: string | number;
  tipo_equipamento?: string;
  tipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  ano?: string | null;
  km_atual?: string | number | null;
  horimetro?: string | number | null;
};

function extrairNumeroProposta(numero?: string | null) {
  const resultado = numero?.match(/(\d+)\s*$/);
  return resultado ? Number.parseInt(resultado[1], 10) : 0;
}

function formatarNumeroProposta(numero: number) {
  return `PROP - ${String(numero).padStart(5, "0")}`;
}

export function Propostas() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProposta, setEditingProposta] = useState<Proposta | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoOption[]>([]);
  const [informacaoManual, setInformacaoManual] = useState(false);
  const [responsabilidadeTipo, setResponsabilidadeTipo] = useState<
    "mh3" | "contratante"
  >("contratante");
  const [seguroIncluido, setSeguroIncluido] = useState(false);
  const [pagamentoTipo, setPagamentoTipo] = useState<"tratativas" | "outro">(
    "tratativas",
  );
  const [clausulaCustomizada, setClausulaCustomizada] = useState(false);
  const [clausulaTexto, setClausulaTexto] = useState("");

  const proximoNumero =
    Math.max(
      ...propostas.map((proposta) => extrairNumeroProposta(proposta.numero)),
      0,
    ) + 1;

  async function fetchPropostas() {
    try {
      const res = await fetch("/api/propostas");
      const responseData = await res.json();
      setPropostas(
        Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData?.data)
            ? responseData.data
            : [],
      );
    } catch (error) {
      console.error("Erro ao carregar propostas:", error);
    }
  }

  useEffect(() => {
    fetchPropostas();
    Promise.all([fetch("/api/empresas"), fetch("/api/equipamentos")])
      .then(async ([empresasResponse, equipamentosResponse]) => {
        const [empresasPayload, equipamentosPayload] = await Promise.all([
          empresasResponse.json(),
          equipamentosResponse.json(),
        ]);
        setEmpresas(
          Array.isArray(empresasPayload)
            ? empresasPayload
            : empresasPayload.data || [],
        );
        setEquipamentos(
          Array.isArray(equipamentosPayload)
            ? equipamentosPayload
            : equipamentosPayload.data || [],
        );
      })
      .catch((error) =>
        console.error("Erro ao carregar dados da proposta:", error),
      );
  }, []);

  const filteredPropostas = propostas.filter((p) => {
    const term = search.toLowerCase();
    return (
      (p.numero?.toLowerCase() || "").includes(term) ||
      (p.contratante?.toLowerCase() || "").includes(term) ||
      (p.obra?.toLowerCase() || "").includes(term) ||
      (p.veiculo?.toLowerCase() || "").includes(term) ||
      (p.modelo?.toLowerCase() || "").includes(term) ||
      (p.email?.toLowerCase() || "").includes(term)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const paginatedPropostas = paginate(filteredPropostas, page, pageSize);

  const openNewProposta = () => {
    setEditingProposta(null);
    setInformacaoManual(false);
    setResponsabilidadeTipo("contratante");
    setSeguroIncluido(false);
    setPagamentoTipo("tratativas");
    setClausulaCustomizada(false);
    setClausulaTexto("");
    setFormData({
      ...initialFormData,
      numero: formatarNumeroProposta(proximoNumero),
    });
    setDialogOpen(true);
  };

  const openEditProposta = (proposta: Proposta) => {
    setEditingProposta(proposta);
    setInformacaoManual(!proposta.empresaId);
    setResponsabilidadeTipo(
      proposta.resp === "Por conta da MH3 Rental." ? "mh3" : "contratante",
    );
    setSeguroIncluido(Boolean(proposta.seguro));
    setPagamentoTipo(
      proposta.pagamento === "Conforme tratativas com a Contratante"
        ? "tratativas"
        : "outro",
    );
    setFormData({
      empresaId: proposta.empresaId || "",
      data: proposta.data || "",
      validade: proposta.validade || "",
      contratante: proposta.contratante || "",
      obra: proposta.obra || "",
      veiculo: proposta.veiculo || "",
      modelo: proposta.modelo || "",
      ano: proposta.ano || "",
      qtd: proposta.qtd ?? 1,
      cobrancaModo: proposta.cobrancaModo || "fechado",
      turnoFechado: proposta.turnoFechado ?? 1,
      valorFechado: proposta.valorFechado ?? 0,
      km: proposta.km || "0",
      horimetro: proposta.horimetro || "0",
      mostrarKmHr: proposta.mostrarKmHr ?? true,
      linhas: proposta.linhas?.length
        ? proposta.linhas
        : initialFormData.linhas,
      franquia: proposta.franquia || "",
      obs: proposta.obs || "",
      mobilTipo: proposta.mobilTipo || "contratante",
      mobilValor: proposta.mobilValor ?? 0,
      duracao: proposta.duracao || "",
      tempoLocacao: proposta.tempoLocacao ?? 1,
      multaTipo: proposta.multaTipo || "com_multa",
      fidelidade: proposta.fidelidade ?? 6,
      multaPct: proposta.multaPct ?? 0,
      resp: proposta.resp || RESPONSABILIDADES_PADRAO,
      seguro: proposta.seguro || "",
      ciclo: proposta.ciclo || "01 a 30/31",
      pagamento: proposta.pagamento || "Conforme tratativas com a Contratante",
      criadoEm: proposta.criadoEm || "",
      criadoPor: proposta.criadoPor || "",
      numero: proposta.numero || "",
      email: proposta.email || "",
      fotos: proposta.fotos || [],
      aprovada: proposta.aprovada ?? false,
      ctAssinado: proposta.ctAssinado ?? false,
      equipsExtra: proposta.equipsExtra || [],
      temSeguro: proposta.temSeguro || "",
      manutTipo: proposta.manutTipo || "",
      incluirTurnos: proposta.incluirTurnos ?? false,
    });
    setDialogOpen(true);
  };

  function formatarData(data: string): string {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function parsarData(dataFormatada: string): string {
    if (!dataFormatada) return "";
    const partes = dataFormatada.split("/");
    if (partes.length !== 3) return "";
    const [dia, mes, ano] = partes;
    return `${ano}-${mes}-${dia}`;
  }

  function alterarLinha(turno: number, campo: "vh" | "gar", valor: string) {
    const numero = Number(valor) || 0;
    setFormData((atual) => ({
      ...atual,
      linhas: (atual.linhas || []).map((linha) =>
        linha.turno === turno
          ? {
            ...linha,
            [campo]: numero,
            vm: campo === "vh" ? numero * linha.gar : linha.vh * numero,
          }
          : linha,
      ),
    }));
  }

  function alterarFotos(event: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(event.target.files || []);
    Promise.all(
      arquivos.map(
        (arquivo) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(arquivo);
          }),
      ),
    ).then((fotos) => {
      setFormData((atual) => ({
        ...atual,
        fotos: [...(atual.fotos || []), ...fotos],
      }));
    });
  }

  const clausulaPrazo =
    formData.multaTipo === "sem_multa"
      ? `O presente contrato vigorará pelo prazo de ${formData.duracao || "12"} (doze) meses, contados a partir da data de início da locação, não havendo incidência de multa na hipótese de rescisão antecipada por qualquer das partes.`
      : formData.multaTipo === "valores_vigencia"
        ? `O presente contrato vigorará pelo prazo de ${formData.duracao || "12"} (doze) meses, contados a partir da data de início da locação.\n\nDA RESCISÃO OU DEVOLUÇÃO ANTECIPADA: OS VALORES MENSAIS SÃO DEVIDOS INTEGRALMENTE ATÉ O TERMO FINAL DA VIGÊNCIA CONTRATUAL, AINDA QUE A CONTRATANTE DEVOLVA OS EQUIPAMENTOS, REDUZA A QUANTIDADE CONTRATADA OU ENCERRE A OPERAÇÃO ANTES DESSE PRAZO. A DEVOLUÇÃO ANTECIPADA, TOTAL OU PARCIAL, NÃO REDUZ, NÃO SUSPENDE E NÃO EXTINGUE A OBRIGAÇÃO DE PAGAMENTO DOS MESES REMANESCENTES, POR EQUIPAMENTO, ATÉ O FIM DA VIGÊNCIA. PERMANECEM DEVIDAS AS DESPESAS DE DESMOBILIZAÇÃO E A DEVOLUÇÃO NAS CONDIÇÕES CONTRATUAIS.`
        : `1. DO PRAZO: O PRESENTE CONTRATO VIGORARÁ PELO PRAZO MÍNIMO DE ${formData.duracao || "12"} (DOZE) MESES, CONTADOS A PARTIR DA DATA DE INÍCIO DA LOCAÇÃO.\n2. DA FIDELIDADE: OS PRIMEIROS ${formData.fidelidade || 6} (SEIS) MESES DE VIGÊNCIA CONSTITUEM PERÍODO DE FIDELIDADE INTEGRAL.\n3. DA RESCISÃO ATÉ O 6º MÊS: CASO A RESCISÃO OCORRA ANTES DE COMPLETADO O 6º MÊS DE VIGÊNCIA, A CONTRATANTE OBRIGA-SE AO PAGAMENTO DOS ALUGUÉIS MENSAIS VINCENDOS ATÉ O ENCERRAMENTO DO PERÍODO DE FIDELIDADE, ACRESCIDOS DE MULTA COMPENSATÓRIA DE ${formData.multaPct || 0}% (ZERO POR CENTO), INCIDENTE SOBRE O SOMATÓRIO DOS ALUGUÉIS MENSAIS REMANESCENTES.\n4. DA RESCISÃO APÓS O 6º MÊS: OCORRENDO A RESCISÃO APÓS O 6º MÊS DE VIGÊNCIA, SERÁ DEVIDA MULTA COMPENSATÓRIA DE ${formData.multaPct || 0}%, INCIDENTE SOBRE O SOMATÓRIO DOS ALUGUÉIS MENSAIS REMANESCENTES ATÉ O TERMO FINAL DA VIGÊNCIA CONTRATUAL.\n\nA MESMA REGRA SE APLICA À DEVOLUÇÃO PARCIAL OU REDUÇÃO DA QUANTIDADE DE EQUIPAMENTOS, POR EQUIPAMENTO RETIRADO.`;

  const handleSave = async () => {
    const payload = {
      ...formData,
      resp: formData.resp,
      seguro: seguroIncluido ? formData.seguro || SEGURO_PADRAO : "",
      clausula: clausulaCustomizada ? clausulaTexto : undefined,
    };

    if (editingProposta) {
      await fetch(`/api/propostas/${editingProposta.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await fetchPropostas();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string | number) => {
    if (deletingId !== null) return;
    setDeletingId(id);
    try {
      await deleteRegistro(`/api/propostas/${id}`);
      setPropostas((prev) => prev.filter((p) => p.id !== id));
      await fetchPropostas();
    } finally {
      setDeletingId(null);
    }
  };

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
              className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-card p-2 text-foreground shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div
        className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"
          }`}
      >
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              className="rounded-xl border border-border bg-card p-2 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-2xl">
              Propostas
            </h1>
          </div>

          <Button
            onClick={openNewProposta}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Proposta
          </Button>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          {/* Filters */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, contratante, obra, veículo ou modelo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-input border-border"
                  />
                </div>
                <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
              </div>
            </CardContent>
          </Card>

          {/* Propostas Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Lista de Propostas ({filteredPropostas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">
                        Número
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Contratante
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Obra
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Veículo / Modelo
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Data / Validade
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Valor Fechado
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPropostas.map((proposta) => (
                      <TableRow key={proposta.id} className="border-border">
                        <TableCell className="font-mono text-xs font-semibold text-foreground">
                          {proposta.numero || proposta.id}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          <div>{proposta.contratante}</div>
                          <div className="text-xs text-muted-foreground">
                            {proposta.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {proposta.obra || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{proposta.veiculo || "-"}</div>
                          <div className="text-muted-foreground/70">
                            {proposta.modelo}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>Emissão: {proposta.data || "-"}</div>
                          <div>Validade: {proposta.validade || "-"}</div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">
                          {proposta.valorFechado
                            ? `R$ ${Number(
                              proposta.valorFechado,
                            ).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                              onClick={() => generatePropostaPDF({
                                ...proposta,
                                empresaLogo: empresas.find((empresa) => String(empresa.id) === String(proposta.empresaId))?.logo,
                              })}
                              title="Gerar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-100"
                              onClick={() => openEditProposta(proposta)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-100"
                              disabled={deletingId !== null}
                              onClick={() => handleDelete(proposta.id)}
                            >
                              {deletingId === proposta.id && (
                                <span className="absolute bottom-0 left-1 h-0.5 w-6 animate-pulse bg-current" />
                              )}
                              <Trash2 className="h-4 w-4" />
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
                total={filteredPropostas.length}
                onPageChange={setPage}
              />
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modal / Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)]! max-w-300! max-h-[94vh] overflow-y-auto bg-card border-border p-6 sm:w-[calc(100vw-2rem)]! sm:p-8" onMouseDown={(e) => e.detail > 1 && e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingProposta ? "Editar Proposta" : "Nova Proposta"}
            </DialogTitle>
            <DialogDescription>
              {editingProposta
                ? "Edite as informações da proposta selecionada."
                : "Preencha os campos abaixo para gerar uma nova proposta."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 px-1 sm:space-y-7">
            <div className="rounded-xl border border-border bg-muted/30 p-5 sm:p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">
                Empresa emitente desta proposta
              </p>
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                <Checkbox
                  id="informacao-manual"
                  checked={informacaoManual}
                  onCheckedChange={(checked) =>
                    setInformacaoManual(checked === true)
                  }
                />
                <Label
                  htmlFor="informacao-manual"
                  className="cursor-pointer text-sm font-medium"
                >
                  Informação manual
                </Label>
              </div>
              {!informacaoManual ? (
                <Select
                  value={formData.empresaId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, empresaId: value })
                  }
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Selecione a empresa cadastrada" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem
                        key={String(empresa.id)}
                        value={String(empresa.id)}
                      >
                        {empresa.nome || empresa.razao_social || "Empresa"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="contratante" className="text-foreground">
                      Nome da empresa ou pessoa
                    </Label>
                    <Input
                      id="contratante"
                      value={formData.contratante}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          contratante: event.target.value,
                        })
                      }
                      placeholder="Nome da empresa ou pessoa"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="obra" className="text-foreground">
                      Obra ou cidade
                    </Label>
                    <Input
                      id="obra"
                      value={formData.obra}
                      onChange={(event) =>
                        setFormData({ ...formData, obra: event.target.value })
                      }
                      placeholder="Obra ou cidade"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">
                      E-mail do cliente
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData({ ...formData, email: event.target.value })
                      }
                      placeholder="cliente@empresa.com.br"
                      className="bg-input border-border"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-5 sm:p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">
                Informações da proposta
              </p>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="numero" className="text-foreground">
                    Número Proposta
                  </Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    readOnly
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data" className="text-foreground">
                    Data
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="data"
                      type="date"
                      value={formData.data}
                      onChange={(e) =>
                        setFormData({ ...formData, data: e.target.value })
                      }
                      className="pl-9 bg-input border-border"
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validade" className="text-foreground">
                    Validade
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="validade"
                      type="date"
                      value={formData.validade}
                      onChange={(e) =>
                        setFormData({ ...formData, validade: e.target.value })
                      }
                      className="pl-9 bg-input border-border"
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Equipamento / Veículo */}
            <div className="rounded-xl border border-border bg-muted/20 p-5 sm:p-6 gap-2 space-y-4">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">
                Informações do Equipamento / Veículo
              </p>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tipo_equipamento" className="text-foreground">
                    Tipo de Equipamento
                  </Label>
                  <Input
                    id="tipo_equipamento"
                    placeholder="Ex: Caminhão, Empilhadeira, Escavadeira"
                    value={formData.veiculo || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, veiculo: e.target.value })
                    }
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo" className="text-foreground">
                    Marca / Modelo
                  </Label>
                  <Input
                    id="modelo"
                    placeholder="Marca e modelo do equipamento"
                    value={formData.modelo}
                    onChange={(e) =>
                      setFormData({ ...formData, modelo: e.target.value })
                    }
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ano" className="text-foreground">
                    Ano
                  </Label>
                  <Input
                    id="ano"
                    placeholder="AAAA"
                    value={formData.ano}
                    onChange={(e) =>
                      setFormData({ ...formData, ano: e.target.value })
                    }
                    className="bg-input border-border"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                <Checkbox
                  id="mostrar-km-horimetro"
                  checked={formData.mostrarKmHr}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, mostrarKmHr: checked === true })
                  }
                />
                <Label
                  htmlFor="mostrar-km-horimetro"
                  className="cursor-pointer text-sm font-medium"
                >
                  Mostrar km e horímetro do equipamento na proposta
                </Label>
              </div>


              {formData.mostrarKmHr && (
                <div className="grid grid-cols-1 gap-5 rounded-lg border border-border bg-muted/20 p-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="km">KM atual do equipamento</Label>
                    <Input
                      id="km"
                      value={formData.km}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horimetro">
                      Horímetro atual do equipamento
                    </Label>
                    <Input
                      id="horimetro"
                      value={formData.horimetro}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-5 rounded-xl border border-border bg-muted/20 p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Valores
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Escolha entre cobrança por hora trabalhada ou valor mensal
                  fechado.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label>Tipo de cobrança</Label>
                  <Select
                    value={formData.cobrancaModo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, cobrancaModo: value })
                    }
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hora">Por hora trabalhada</SelectItem>
                      <SelectItem value="fechado">
                        Valor mensal fechado
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pagamento">Pagamento</Label>
                  <Input
                    id="pagamento"
                    value={formData.pagamento}
                    onChange={(e) =>
                      setFormData({ ...formData, pagamento: e.target.value })
                    }
                    className="bg-input border-border"
                  />
                </div>
              </div>

              {formData.cobrancaModo === "hora" ? (
                <div className="overflow-x-auto">
                  <div className="grid min-w-2xl grid-cols-4 gap-3 text-xs font-semibold text-muted-foreground">
                    <span>Turno</span>
                    <span>Valor da hora (R$)</span>
                    <span>Garantia (h)</span>
                    <span>Valor mensal (R$)</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {(formData.linhas || []).slice(0, 3).map((linha) => (
                      <div
                        key={linha.turno}
                        className="grid min-w-2xl grid-cols-4 items-center gap-3"
                      >
                        <span className="font-semibold">{linha.turno}</span>
                        <Input
                          type="number"
                          value={linha.vh || ""}
                          onChange={(e) =>
                            alterarLinha(linha.turno, "vh", e.target.value)
                          }
                        />
                        <Input
                          type="number"
                          value={linha.gar || ""}
                          onChange={(e) =>
                            alterarLinha(linha.turno, "gar", e.target.value)
                          }
                        />
                        <Input
                          type="number"
                          value={linha.vm || ""}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Quantidade de turnos</Label>
                    <Select
                      value={String(formData.turnoFechado || 1)}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          turnoFechado: Number(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 turno</SelectItem>
                        <SelectItem value="2">2 turnos</SelectItem>
                        <SelectItem value="3">3 turnos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valorFechado">
                      Valor mensal fechado (R$)
                    </Label>
                    <Input
                      id="valorFechado"
                      type="number"
                      value={formData.valorFechado || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          valorFechado: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-5 sm:p-6">
              <Label
                htmlFor="franquia"
                className="font-semibold text-foreground"
              >
                Franquia KM/Mês
              </Label>
              <Input
                id="franquia"
                value={formData.franquia}
                onChange={(event) =>
                  setFormData({ ...formData, franquia: event.target.value })
                }
                placeholder="Ex.: 3.500 km/mês"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs" className="font-semibold text-foreground">
                Observações
              </Label>
              <Textarea
                id="obs"
                value={formData.obs}
                onChange={(event) =>
                  setFormData({ ...formData, obs: event.target.value })
                }
                placeholder="Digite observações adicionais da proposta"
                className="min-h-28 resize-y bg-input border-border"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-5 sm:p-6">
              <Label
                htmlFor="fotos"
                className="flex items-center gap-2 font-semibold text-foreground"
              >
                <ImagePlus className="h-4 w-4 text-primary" /> Fotos da proposta
              </Label>
              <Input
                id="fotos"
                type="file"
                accept="image/*"
                multiple
                onChange={alterarFotos}
              />
              {formData.fotos && formData.fotos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {formData.fotos.map((foto, index) => (
                    <div
                      key={`${foto}-${index}`}
                      className="relative overflow-hidden rounded-lg border border-border bg-background"
                    >
                      <img
                        src={foto}
                        alt={`Foto ${index + 1}`}
                        className="h-24 w-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white"
                        onClick={() =>
                          setFormData((atual) => ({
                            ...atual,
                            fotos: (atual.fotos || []).filter(
                              (_, fotoIndex) => fotoIndex !== index,
                            ),
                          }))
                        }
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5 rounded-xl border border-border bg-muted/20 p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Mobilização / Desmobilização
              </p>
              <Select
                value={formData.mobilTipo}
                onValueChange={(value) =>
                  setFormData({ ...formData, mobilTipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione quem será responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contratante">
                    Por conta da Contratante (informar valor)
                  </SelectItem>
                  <SelectItem value="mh3">Por conta da MH3 Rental</SelectItem>
                </SelectContent>
              </Select>
              {formData.mobilTipo === "contratante" && (
                <div className="space-y-2">
                  <Label htmlFor="mobilValor">
                    Valor da mobilização / desmobilização (R$)
                  </Label>
                  <Input
                    id="mobilValor"
                    type="number"
                    value={formData.mobilValor || ""}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        mobilValor: Number(event.target.value),
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-5 rounded-xl border border-border bg-muted/20 p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Prazo e fidelidade
              </p>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="duracao">Tempo de contrato (meses)</Label>
                  <Input
                    id="duracao"
                    type="number"
                    value={formData.duracao}
                    onChange={(event) =>
                      setFormData({ ...formData, duracao: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Multa contratual</Label>
                  <Select
                    value={formData.multaTipo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, multaTipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a condição" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="com_multa">
                        Com multa por rescisão
                      </SelectItem>
                      <SelectItem value="sem_multa">
                        Sem multa de rescisão
                      </SelectItem>
                      <SelectItem value="valores_vigencia">
                        Valores devidos até o final da vigência
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.multaTipo === "com_multa" && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fidelidade">
                      Fidelidade mínima (meses)
                    </Label>
                    <Input
                      id="fidelidade"
                      type="number"
                      value={formData.fidelidade ?? ""}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          fidelidade: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="multaPct">Multa por rescisão (%)</Label>
                    <Input
                      id="multaPct"
                      type="number"
                      value={formData.multaPct ?? ""}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          multaPct: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6 rounded-xl border border-border bg-muted/20 p-5 sm:space-y-7 sm:p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="clausula-prazo"
                    className="font-semibold text-foreground"
                  >
                    Cláusula de prazo, fidelidade e rescisão
                  </Label>
                  {clausulaCustomizada && (
                    <button
                      type="button"
                      onClick={() => {
                        setClausulaCustomizada(false);
                        setClausulaTexto("");
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Restaurar padrão
                    </button>
                  )}
                </div>
                <Textarea
                  id="clausula-prazo"
                  value={clausulaCustomizada ? clausulaTexto : clausulaPrazo}
                  onChange={(e) => {
                    setClausulaCustomizada(true);
                    setClausulaTexto(e.target.value);
                  }}
                  className="min-h-52 resize-y bg-input border-border font-mono text-xs leading-5 sm:min-h-56"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-foreground">
                  Responsabilidades
                </Label>
                <Select
                  value={responsabilidadeTipo}
                  onValueChange={(value) =>
                    setResponsabilidadeTipo(value as "mh3" | "contratante")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mh3">Por conta da MH3</SelectItem>
                    <SelectItem value="contratante">
                      Por conta da Contratante
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  id="resp"
                  value={formData.resp}
                  onChange={(e) =>
                    setFormData({ ...formData, resp: e.target.value })
                  }
                  className="min-h-72 resize-y bg-input border-border font-mono text-xs leading-5 sm:min-h-80"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="incluir-seguro"
                    checked={seguroIncluido}
                    onCheckedChange={(checked) => {
                      const incluir = checked === true;
                      setSeguroIncluido(incluir);
                      if (incluir && !formData.seguro)
                        setFormData({ ...formData, seguro: SEGURO_PADRAO });
                    }}
                  />
                  <Label
                    htmlFor="incluir-seguro"
                    className="cursor-pointer font-semibold text-foreground"
                  >
                    Incluir seguro na proposta
                  </Label>
                </div>
                {seguroIncluido && (
                  <Textarea
                    id="seguro"
                    value={formData.seguro}
                    onChange={(e) =>
                      setFormData({ ...formData, seguro: e.target.value })
                    }
                    className="min-h-44 resize-y bg-input border-border font-mono text-xs leading-5 sm:min-h-52"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 rounded-xl border border-border bg-muted/20 p-5 sm:p-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ciclo de medição</Label>
                <Select
                  value={formData.ciclo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, ciclo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ciclo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01 a 30/31">De 01 a 30/31</SelectItem>
                    <SelectItem value="21 a 20">De 21 a 20</SelectItem>
                    <SelectItem value="Conforme calendário do contratante">
                      Conforme calendário do contratante
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condições de pagamento</Label>
                <Select
                  value={pagamentoTipo}
                  onValueChange={(value) => {
                    const tipo = value as "tratativas" | "outro";
                    setPagamentoTipo(tipo);
                    if (tipo === "tratativas") {
                      setFormData({
                        ...formData,
                        pagamento: "Conforme tratativas com a Contratante",
                      });
                    } else {
                      setFormData({ ...formData, pagamento: "" });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a condição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tratativas">
                      Conforme tratativas com a Contratante
                    </SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {pagamentoTipo === "outro" && (
                  <Input
                    value={formData.pagamento}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        pagamento: event.target.value,
                      })
                    }
                    placeholder="Informe a condição de pagamento"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary text-primary-foreground"
            >
              {editingProposta ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
