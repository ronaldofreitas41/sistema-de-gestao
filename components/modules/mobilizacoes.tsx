"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Menu, Search, X, LoaderPinwheel, FileText, Upload, Camera, RotateCcw, Download, Eye, Edit, Trash2 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionButtons } from "@/components/ui/action-buttons";
import { deleteRegistro } from "@/lib/utils";

type FotoGrupo = {
  maxFotos: number;
  fotos: File[];
};

type Mobilizacao = {
  id: string | number;
  equipamento_id?: string | number | null;
  contrato_id?: string | number | null;
  tipo?: string | null;
  data?: string | null;
  data_chegada?: string | null;
  local_origem?: string | null;
  local_destino?: string | null;
  km?: string | number | null;
  responsavel?: string | null;
  observacoes?: string | null;
  pneus_por_eixo?: Record<string, any> | null;
  estepe?: string | null;
  checklist_id?: string | null;
  fotos?: Record<string, string[]> | null;
  status?: string | null;
  ciclo?: string | null;
  placa?: string | null;
  cliente?: string | null;
  codigo?: string | null;
};

type MobilizacaoForm = Omit<Mobilizacao, "id">;

const formularioInicial: MobilizacaoForm = {
  equipamento_id: "",
  contrato_id: "",
  tipo: "MOBILIZAÇÃO(saída do veículo/equipamento)",
  data: "",
  local_origem: "",
  local_destino: "",
  km: "",
  responsavel: "",
  observacoes: "",
  pneus_por_eixo: {
    "1º Eixo": { pneu: "", rebaba: "", retornado: "Não" },
    "2º Eixo": { pneu: "", rebaba: "", retornado: "Não" },
    "3º Eixo": { pneu: "", rebaba: "", retornado: "Não" },
    "4º Eixo": { pneu: "", rebaba: "", retornado: "Não" },
    Estepe: { pneu: "", rebaba: "", retornado: "Não" },
  },
  estepe: "Não",
  checklist_id: "",
  fotos: {
    frente: [],
    traseira: [],
    lateral_esquerda: [],
    lateral_direita: [],
    painel_km: [],
    implementos: [],
    interior_cabine: [],
    macaco_chave: [],
    triangulo_reboque: [],
    cabo_forca: [],
    calco_cones: [],
    outros_acessorios: [],
    avarias: [],
    cnh_motorista: [],
  },
};

export function Mobilizacoes() {
  const [mobilizacoes, setMobilizacoes] = useState<Mobilizacao[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Mobilizacao | null>(null);
  const [form, setForm] = useState<MobilizacaoForm>(formularioInicial);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [excluindo, setExcluindo] = useState<string | number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [contratos, setContratos] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [anoFiltro, setAnoFiltro] = useState("todos");
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);

  async function carregar() {
    try {
      const response = await fetch("/api/mobilizacoes");
      const payload = await response.json();
      setMobilizacoes(Array.isArray(payload) ? payload : payload.data || []);
    } catch (error) {
      console.error("Erro ao carregar mobilizações:", error);
    }
  }

  async function carregarDados() {
    try {
      const [contratosRes, equipamentosRes, checklistsRes] = await Promise.all([
        fetch("/api/contratos"),
        fetch("/api/equipamentos"),
        fetch("/api/checklists"),
      ]);

      if (contratosRes.ok) {
        const data = await contratosRes.json();
        setContratos(Array.isArray(data) ? data : data.data || []);
      }
      if (equipamentosRes.ok) {
        const data = await equipamentosRes.json();
        setEquipamentos(Array.isArray(data) ? data : data.data || []);
      }
      if (checklistsRes.ok) {
        const data = await checklistsRes.json();
        setChecklists(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  }

  useEffect(() => {
    carregar();
    carregarDados();
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.toLowerCase();
    return mobilizacoes.filter((m) =>
      [m.tipo, m.local_origem, m.local_destino, m.responsavel].some(
        (valor) => String(valor || "").toLowerCase().includes(termo)
      )
    );
  }, [mobilizacoes, busca]);

  function alterar(campo: keyof MobilizacaoForm, valor: any) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function atualizarPneuEixo(eixo: string, campo: string, valor: string) {
    setForm((atual) => ({
      ...atual,
      pneus_por_eixo: {
        ...atual.pneus_por_eixo,
        [eixo]: {
          ...(atual.pneus_por_eixo?.[eixo] || {}),
          [campo]: valor,
        },
      },
    }));
  }

  function adicionarFoto(grupo: string, event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;

    const fotosArray = Array.from(files);
    setForm((atual) => ({
      ...atual,
      fotos: {
        ...(atual.fotos || {}),
        [grupo]: [
          ...(atual.fotos?.[grupo] || []),
          ...fotosArray.map((f) => f.name), // Armazenar nomes ou converter para base64
        ],
      },
    }));
  }

  function removerFoto(grupo: string, index: number) {
    setForm((atual) => ({
      ...atual,
      fotos: {
        ...(atual.fotos || {}),
        [grupo]: (atual.fotos?.[grupo] || []).filter((_, i) => i !== index),
      },
    }));
  }

  function novaMobilizacao() {
    setEditando(null);
    setForm(formularioInicial);
    setDialogOpen(true);
  }

  function editar(mobilizacao: Mobilizacao) {
    setEditando(mobilizacao);
    setForm({
      equipamento_id: mobilizacao.equipamento_id,
      contrato_id: mobilizacao.contrato_id,
      tipo: mobilizacao.tipo,
      data: mobilizacao.data,
      local_origem: mobilizacao.local_origem,
      local_destino: mobilizacao.local_destino,
      km: mobilizacao.km,
      responsavel: mobilizacao.responsavel,
      observacoes: mobilizacao.observacoes,
      pneus_por_eixo: mobilizacao.pneus_por_eixo || formularioInicial.pneus_por_eixo,
      estepe: mobilizacao.estepe || "Não",
      checklist_id: mobilizacao.checklist_id,
      fotos: mobilizacao.fotos || formularioInicial.fotos,
    });
    setDialogOpen(true);
  }

  async function salvar() {
    if (!form.equipamento_id || !form.contrato_id || salvando) return;
    setSalvando(true);
    try {
      const response = await fetch(
        editando ? `/api/mobilizacoes/${editando.id}` : "/api/mobilizacoes",
        {
          method: editando ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (!response.ok) throw new Error("Não foi possível salvar a mobilização.");
      await carregar();
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      alert("Não foi possível salvar a mobilização.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string | number) {
    try {
      await deleteRegistro(`/api/mobilizacoes/${id}`);
      await carregar();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  }

  function downloadPDF(mobilizacao: Mobilizacao) {
    // Implementar geração de PDF
    alert("Funcionalidade de download de PDF em desenvolvimento");
  }

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
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold sm:text-2xl">Mobilização / Desmobilização</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Button variant="outline" size="sm">
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpar Tudo
            </Button>
            <Button onClick={novaMobilizacao} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Novas
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-9">
          {/* Descrição e Filtros */}
          <div className="space-y-4">
            

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Label htmlFor="ano-filtro" className="font-semibold">Filtro por ano:</Label>
                <select
                  id="ano-filtro"
                  value={anoFiltro}
                  onChange={(e) => setAnoFiltro(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="todos">Todos os anos</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="arquivadas"
                  checked={mostrarArquivadas}
                  onCheckedChange={(checked) => setMostrarArquivadas(Boolean(checked))}
                />
                <Label htmlFor="arquivadas" className="text-xs font-semibold text-muted-foreground uppercase cursor-pointer">
                  Mostrar Arquivadas
                </Label>
              </div>
            </div>
          </div>

          {/* Tabela de Mobilizações */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold uppercase">Código</TableHead>
                      <TableHead className="text-xs font-semibold uppercase">Tipo</TableHead>
                      <TableHead className="text-xs font-semibold uppercase">Placa</TableHead>
                      <TableHead className="text-xs font-semibold uppercase">Contratante/Cliente</TableHead>
                      <TableHead className="text-xs font-semibold uppercase">Saída</TableHead>
                      <TableHead className="text-xs font-semibold uppercase">Chegada</TableHead>
                      <TableHead className="text-xs font-semibold uppercase">Ciclo</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.length > 0 ? (
                      filtradas.map((mobilizacao) => (
                        <TableRow key={String(mobilizacao.id)} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="whitespace-nowrap font-medium text-primary">
                            <div className="flex flex-col gap-1">
                              <span>{mobilizacao.codigo || `MOB-${String(mobilizacao.id).padStart(5, "0")}`}</span>
                              <div className="flex gap-1">
                                <Badge variant="secondary" className="text-xs">Rab</Badge>
                                <Badge variant="outline" className="text-xs">Vigente</Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-sm">{mobilizacao.tipo ? mobilizacao.tipo.split("(")[0].trim() : "-"}</span>
                              <div className="flex gap-1">
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                                  Falta desemb.
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">{mobilizacao.placa || "-"}</TableCell>
                          <TableCell className="text-sm">{mobilizacao.cliente || "-"}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {mobilizacao.data ? new Date(mobilizacao.data).toLocaleDateString("pt-BR") : "-"}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {mobilizacao.data_chegada ? new Date(mobilizacao.data_chegada).toLocaleDateString("pt-BR") : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {mobilizacao.ciclo || "Contínuo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => editar(mobilizacao)}
                                className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                          Nenhuma mobilização encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar mobilização" : "Nova mobilização"}
            </DialogTitle>
            <DialogDescription>
              Preencha todos os dados da mobilização do equipamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Seção 1: Dados básicos */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-foreground">Dados da Mobilização</h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Operação *</Label>
                  <select
                    id="tipo"
                    value={String(form.tipo || "")}
                    onChange={(e) => alterar("tipo", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecionar...</option>
                    <option value="MOBILIZAÇÃO(saída do veículo/equipamento)">
                      MOBILIZAÇÃO (saída do veículo/equipamento)
                    </option>
                    <option value="DESMOBILIZAÇÃO">DESMOBILIZAÇÃO</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data">Data de Saída *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={form.data || ""}
                    onChange={(e) => alterar("data", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_chegada">Data de Chegada</Label>
                  <Input
                    id="data_chegada"
                    type="date"
                    value={form.data_chegada || ""}
                    onChange={(e) => alterar("data_chegada", e.target.value)}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="contrato_id">Contrato *</Label>
                  <select
                    id="contrato_id"
                    value={String(form.contrato_id || "")}
                    onChange={(e) => alterar("contrato_id", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecionar contrato...</option>
                    {contratos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.numero} - {c.cliente_id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="equipamento_id">Equipamento *</Label>
                  <select
                    id="equipamento_id"
                    value={String(form.equipamento_id || "")}
                    onChange={(e) => alterar("equipamento_id", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecionar equipamento...</option>
                    {equipamentos.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.placa} - {e.marca} {e.modelo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Seção 2: Locais e KM */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-foreground">Trajeto</h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="local_origem">Local de Origem</Label>
                  <Input
                    id="local_origem"
                    value={form.local_origem || ""}
                    onChange={(e) => alterar("local_origem", e.target.value)}
                    placeholder="Ex: Garagem São Paulo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="local_destino">Local de Destino</Label>
                  <Input
                    id="local_destino"
                    value={form.local_destino || ""}
                    onChange={(e) => alterar("local_destino", e.target.value)}
                    placeholder="Ex: Obra Rio de Janeiro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="km">KM Atual (km)</Label>
                  <Input
                    id="km"
                    type="number"
                    step="0.01"
                    value={form.km || ""}
                    onChange={(e) => alterar("km", e.target.value)}
                    placeholder="Ex: 81119"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Input
                    id="responsavel"
                    value={form.responsavel || ""}
                    onChange={(e) => alterar("responsavel", e.target.value)}
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: Pneus por Eixo */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-foreground">Pneus por Eixo</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border px-3 py-2 text-left text-sm font-semibold">Eixo</th>
                      <th className="border border-border px-3 py-2 text-left text-sm font-semibold">Nº Pneus</th>
                      <th className="border border-border px-3 py-2 text-left text-sm font-semibold">Rebaba</th>
                      <th className="border border-border px-3 py-2 text-left text-sm font-semibold">Retornado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(form.pneus_por_eixo || {}).map(([eixo, dados]) => (
                      <tr key={eixo}>
                        <td className="border border-border px-3 py-2 text-sm font-medium">{eixo}</td>
                        <td className="border border-border px-3 py-2">
                          <Input
                            type="text"
                            size={10}
                            value={(dados?.pneu || "")}
                            onChange={(e) => atualizarPneuEixo(eixo, "pneu", e.target.value)}
                            placeholder="Marca/Modelo"
                            className="h-8"
                          />
                        </td>
                        <td className="border border-border px-3 py-2">
                          <Input
                            type="text"
                            size={10}
                            value={(dados?.rebaba || "")}
                            onChange={(e) => atualizarPneuEixo(eixo, "rebaba", e.target.value)}
                            placeholder="Medida"
                            className="h-8"
                          />
                        </td>
                        <td className="border border-border px-3 py-2">
                          <select
                            value={(dados?.retornado || "Não")}
                            onChange={(e) => atualizarPneuEixo(eixo, "retornado", e.target.value)}
                            className="flex h-8 w-full rounded border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="Não">Não</option>
                            <option value="Sim">Sim</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seção 4: Estepe e Checklist */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-foreground">Complementos</h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="estepe">Estepe</Label>
                  <select
                    id="estepe"
                    value={form.estepe || "Não"}
                    onChange={(e) => alterar("estepe", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checklist_id">Modelo de Checklist</Label>
                  <select
                    id="checklist_id"
                    value={form.checklist_id || ""}
                    onChange={(e) => alterar("checklist_id", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Adicionar checklist...</option>
                    {checklists.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Seção 5: Observações e Fotos */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Informações Adicionais</h3>
              
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={form.observacoes || ""}
                  onChange={(e) => alterar("observacoes", e.target.value)}
                  placeholder="Adicione observações sobre a mobilização..."
                  rows={3}
                />
              </div>
            </div>

            {/* Seção 6: Relatório Fotográfico */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-foreground">Relatório Fotográfico (vitória)</h3>
              <p className="text-xs text-muted-foreground">
                Só aparece a foto do EIXO que estiver preenchido na tabela de pneus. Implementos e Interior: mín. 4 fotos.
              </p>

              <div className="space-y-4">
                {/* Frente - 0/1 */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">🟡 Frente</h4>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {(form.fotos?.frente?.length || 0)}/1
                    </span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("frente", e)}
                      className="hidden"
                      id="frente-input"
                    />
                    <label htmlFor="frente-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* Traseira - 0/1 */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">🟡 Traseira</h4>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {(form.fotos?.traseira?.length || 0)}/1
                    </span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("traseira", e)}
                      className="hidden"
                      id="traseira-input"
                    />
                    <label htmlFor="traseira-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* Lateral Esquerda - 0/1 */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">🟡 Lateral Esquerda</h4>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {(form.fotos?.lateral_esquerda?.length || 0)}/1
                    </span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("lateral_esquerda", e)}
                      className="hidden"
                      id="lateral-esq-input"
                    />
                    <label htmlFor="lateral-esq-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* Lateral Direita - 0/1 */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">🟡 Lateral Direita</h4>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {(form.fotos?.lateral_direita?.length || 0)}/1
                    </span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("lateral_direita", e)}
                      className="hidden"
                      id="lateral-dir-input"
                    />
                    <label htmlFor="lateral-dir-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* Painel / KM - Horímetro - 0/1 */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">🟡 Painel / KM - Horímetro</h4>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {(form.fotos?.painel_km?.length || 0)}/1
                    </span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("painel_km", e)}
                      className="hidden"
                      id="painel-input"
                    />
                    <label htmlFor="painel-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* Implementos - 0/4 */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">🟡 Implementos</h4>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {(form.fotos?.implementos?.length || 0)}/4
                    </span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("implementos", e)}
                      className="hidden"
                      id="implementos-input"
                    />
                    <label htmlFor="implementos-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* Interior da Cabine - 0/4 */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">🟡 Interior da Cabine</h4>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {(form.fotos?.interior_cabine?.length || 0)}/4
                    </span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("interior_cabine", e)}
                      className="hidden"
                      id="interior-input"
                    />
                    <label htmlFor="interior-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* Macaco / Chave de Roda - 0/1 */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">🟡 Macaco / Chave de Roda</h4>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {(form.fotos?.macaco_chave?.length || 0)}/1
                    </span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("macaco_chave", e)}
                      className="hidden"
                      id="macaco-input"
                    />
                    <label htmlFor="macaco-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* Triângulo / Pino de Reboque - 0/1 */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">🟡 Triângulo / Pino de Reboque</h4>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {(form.fotos?.triangulo_reboque?.length || 0)}/1
                    </span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("triangulo_reboque", e)}
                      className="hidden"
                      id="triangulo-input"
                    />
                    <label htmlFor="triangulo-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* Cabo de Força - 0/1 */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">🟡 Cabo de Força</h4>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {(form.fotos?.cabo_forca?.length || 0)}/1
                    </span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("cabo_forca", e)}
                      className="hidden"
                      id="cabo-input"
                    />
                    <label htmlFor="cabo-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* Calço de Roda / Cones - 0/1 */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">🟡 Calço de Roda / Cones</h4>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {(form.fotos?.calco_cones?.length || 0)}/1
                    </span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("calco_cones", e)}
                      className="hidden"
                      id="calco-input"
                    />
                    <label htmlFor="calco-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* Outros acessórios - opcional */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">📁 Outros acessórios</h4>
                    <span className="text-xs text-muted-foreground">opcional</span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("outros_acessorios", e)}
                      className="hidden"
                      id="outros-input"
                    />
                    <label htmlFor="outros-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* Avarias / Danos já existentes - opcional */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">🔴 Avarias / Danos já existentes</h4>
                    <span className="text-xs text-muted-foreground">opcional</span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("avarias", e)}
                      className="hidden"
                      id="avarias-input"
                    />
                    <label htmlFor="avarias-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>

                {/* CNH do Motorista - opcional */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">📁 CNH do Motorista</h4>
                    <span className="text-xs text-muted-foreground">opcional</span>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => adicionarFoto("cnh_motorista", e)}
                      className="hidden"
                      id="cnh-input"
                    />
                    <label htmlFor="cnh-input" className="cursor-pointer flex flex-col items-center">
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || !form.equipamento_id || !form.contrato_id}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
