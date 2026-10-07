"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Menu, Search, X, RotateCcw, Download, Eye, Edit, Trash2 } from "lucide-react";
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
import { formatarData } from "@/lib/utils";
import { AnexoFotos } from "../ui/anexo-fotos";
import { gruposFotos } from "@/lib/common";
import { Mobilizacao } from "@/lib/types";
import { generateMobilizacaoPDF } from "../../lib/pdf/pdfMobilizacao";



type MobilizacaoForm = Omit<Mobilizacao, "id">;

const formularioInicial: MobilizacaoForm = {
  equipamento_id: "",
  contrato_id: "",
  contratante: "",
  tipo: "MOBILIZAÇÃO(saída do veículo/equipamento)",
  tipo_equipamento: "",
  data: "",
  data_chegada: "",
  local_origem: "",
  local_destino: "",
  marca_modelo: "",
  ano: "",
  km: "",
  horimetro: "",
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
  const [checklists, setChecklists] = useState<any[]>([]);
  const [anoFiltro, setAnoFiltro] = useState("todos");
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [visualizando, setVisualizando] = useState<Mobilizacao | null>(null);
  const [visualizacaoOpen, setVisualizacaoOpen] = useState(false);


  function visualizar(mobilizacao: Mobilizacao) {
    setVisualizando(mobilizacao);
    setVisualizacaoOpen(true);
  }

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
      const checklistsRes = await fetch("/api/checklists");

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
    const termo = busca.trim().toLowerCase();

    return mobilizacoes.filter((m) => {
      const correspondeBusca =
        !termo ||
        [m.codigo, m.cliente, m.contratante, m.tipo, m.local_origem, m.local_destino, m.responsavel]
          .some((valor) => String(valor ?? "").toLowerCase().includes(termo));

      const ano = m.data ? String(m.data).slice(0, 4) : "";
      const correspondeAno = anoFiltro === "todos" || ano === anoFiltro;

      const arquivada = String(m.status ?? "").toLowerCase() === "arquivado";
      const correspondeStatus = mostrarArquivadas || !arquivada;

      return correspondeBusca && correspondeAno && correspondeStatus;
    });
  }, [mobilizacoes, busca, anoFiltro, mostrarArquivadas]);

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

  async function adicionarFoto(
    grupo: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    const arquivosSelecionados = Array.from(files);

    try {
      const novasFotos = await Promise.all(
        arquivosSelecionados.map((arquivo) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
              resolve(String(reader.result));
            };

            reader.onerror = () => {
              reject(
                new Error(
                  `Não foi possível ler a imagem ${arquivo.name}`
                )
              );
            };

            reader.readAsDataURL(arquivo);
          });
        })
      );

      setForm((atual) => ({
        ...atual,
        fotos: {
          ...(atual.fotos || {}),
          [grupo]: [
            ...(atual.fotos?.[grupo] || []),
            ...novasFotos,
          ],
        },
      }));
    } catch (error) {
      console.error("Erro ao processar fotos:", error);
      alert("Não foi possível carregar uma ou mais imagens.");
    }

    event.target.value = "";
  }

  function removerFoto(grupo: string, index: number) {
    setForm((atual) => ({
      ...atual,
      fotos: {
        ...(atual.fotos || {}),
        [grupo]: (atual.fotos?.[grupo] || []).filter(
          (_, i) => i !== index
        ),
      },
    }));
  }

  function novaMobilizacao() {
    setEditando(null);
    setForm({
      ...formularioInicial,
      pneus_por_eixo: structuredClone(formularioInicial.pneus_por_eixo),
      fotos: structuredClone(formularioInicial.fotos),
    });
    setDialogOpen(true);
  }

  function editar(mobilizacao: Mobilizacao) {
    setEditando(mobilizacao);
    setForm({
      equipamento_id: mobilizacao.equipamento_id,
      contrato_id: mobilizacao.contrato_id,
      contratante: mobilizacao.contratante,
      tipo: mobilizacao.tipo,
      tipo_equipamento: mobilizacao.tipo_equipamento,
      data: mobilizacao.data,
      data_chegada: mobilizacao.data_chegada,
      local_origem: mobilizacao.local_origem,
      local_destino: mobilizacao.local_destino,
      marca_modelo: mobilizacao.marca_modelo,
      ano: mobilizacao.ano,
      km: mobilizacao.km,
      horimetro: mobilizacao.horimetro || "",
      responsavel: mobilizacao.responsavel,
      observacoes: mobilizacao.observacoes,
      pneus_por_eixo: mobilizacao.pneus_por_eixo
        ? structuredClone(mobilizacao.pneus_por_eixo)
        : structuredClone(formularioInicial.pneus_por_eixo),
      estepe: mobilizacao.estepe || "Não",
      checklist_id: mobilizacao.checklist_id,
      fotos: mobilizacao.fotos
        ? structuredClone(mobilizacao.fotos)
        : structuredClone(formularioInicial.fotos),
    });
    setDialogOpen(true);
  }

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    try {
      const { equipamento_id, contrato_id, ...dadosForm } = form;
      const response = await fetch(
        editando ? `/api/mobilizacoes/${editando.id}` : "/api/mobilizacoes",
        {
          method: editando ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dadosForm),
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
            <Button variant="outline" size="sm" onClick={() => carregar()}>
              <Download className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBusca("");
                setAnoFiltro("todos");
                setMostrarArquivadas(false);
              }}
            >
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
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por código, cliente..."
                className="pl-9"
                aria-label="Buscar mobilizações"
              />
            </div>

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
                      <TableHead className="text-xs font-semibold uppercase">Tipo de Equipamento</TableHead>
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
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                  Falta desemb.
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">{mobilizacao.tipo_equipamento || "-"}</TableCell>
                          <TableCell className="text-sm">{mobilizacao.contratante || "-"}</TableCell>
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
                                onClick={() => generateMobilizacaoPDF(mobilizacao)}
                                title="Baixar PDF da mobilização"
                                aria-label="Baixar PDF da mobilização"
                                className="h-8 w-8 hover:bg-green-50 hover:text-green-600"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => visualizar(mobilizacao)}
                                className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => editar(mobilizacao)}
                                className="h-8 w-8 hover:bg-blue-50 hover:text-yellow-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  if (!window.confirm("Deseja realmente excluir esta mobilização?")) return;
                                  try {
                                    setExcluindo(mobilizacao.id);
                                    await fetch(`/api/mobilizacoes/${mobilizacao.id}`, { method: "DELETE" });
                                    await carregar();
                                  } catch (error) {
                                    console.error("Erro ao excluir:", error);
                                    alert("Não foi possível excluir a mobilização.");
                                  } finally {
                                    setExcluindo(null);
                                  }
                                }}
                                disabled={excluindo === mobilizacao.id}
                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
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

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        disablePointerDismissal
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"
        >
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
                    type="text"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={form.data || ""}
                    onChange={(e) => alterar("data", formatarData(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_chegada">Data de Chegada</Label>
                  <Input
                    id="data_chegada"
                    type="text"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={form.data_chegada || ""}
                    onChange={(e) => alterar("data_chegada", formatarData(e.target.value))}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="contratante">Contratante *</Label>
                  <Input
                    id="contratante"
                    type="text"
                    placeholder="Nome do contratante"
                    value={form.contratante || ""}
                    onChange={(e) => alterar("contratante", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 ">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_equipamento" className="text-foreground">
                      Tipo de Equipamento
                    </Label>
                    <Input
                      id="tipo_equipamento"
                      placeholder="Ex: Caminhão, Empilhadeira, Escavadeira"
                      value={form.tipo_equipamento || ""}
                      onChange={(e) =>
                        alterar("tipo_equipamento", e.target.value)
                      }
                      className="bg-input border-border"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="modelo" className="text-foreground">
                      Marca / Modelo
                    </Label>
                    <Input
                      id="modelo"
                      placeholder="Marca e modelo do equipamento"
                      value={form.marca_modelo || ""}
                      onChange={(e) =>
                        alterar("marca_modelo", e.target.value)
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
                      maxLength={4}
                      value={form.ano || ""}
                      onChange={(e) =>
                        alterar("ano", e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      className="bg-input border-border"
                    />
                  </div>
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
                  <Label htmlFor="horimetro">Horímetro (h)</Label>
                  <Input
                    id="horimetro"
                    type="number"
                    step="0.01"
                    value={form.horimetro || ""}
                    onChange={(e) => alterar("horimetro", e.target.value)}
                    placeholder="Ex: 1250.5"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
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
                      <th className="border border-border px-3 py-2 text-left text-sm font-semibold">Medida</th>
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
                Adicione quantas fotos forem necessárias em cada categoria. O preenchimento das fotos é opcional.
              </p>
              <div className="space-y-4">
                {gruposFotos.map((item: any) => (
                  <AnexoFotos
                    key={item.grupo}
                    id={item.id}
                    grupo={item.grupo}
                    titulo={item.titulo}
                    opcional={item.opcional}
                    previews={form.fotos?.[item.grupo] || []}
                    onAdicionar={adicionarFoto}
                    onRemover={removerFoto}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={visualizacaoOpen}
        onOpenChange={setVisualizacaoOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Visualizar mobilização
            </DialogTitle>

            <DialogDescription>
              Detalhes da mobilização selecionada.
            </DialogDescription>
          </DialogHeader>

          {visualizando && (
            <div className="space-y-6 py-4">

              {/* Dados básicos */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold">
                  Dados da Mobilização
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <Label>Tipo de Operação</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.tipo || "-"}
                    </div>
                  </div>

                  <div>
                    <Label>Contratante</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.contratante || "-"}
                    </div>
                  </div>

                  <div>
                    <Label>Tipo de Equipamento</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.tipo_equipamento || "-"}
                    </div>
                  </div>

                  <div>
                    <Label>Marca / Modelo</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.marca_modelo || "-"}
                    </div>
                  </div>

                  <div>
                    <Label>Ano</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.ano || "-"}
                    </div>
                  </div>

                  <div>
                    <Label>Responsável</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.responsavel || "-"}
                    </div>
                  </div>

                </div>
              </div>

              {/* Trajeto */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold">
                  Trajeto
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <Label>Local de Origem</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.local_origem || "-"}
                    </div>
                  </div>

                  <div>
                    <Label>Local de Destino</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.local_destino || "-"}
                    </div>
                  </div>

                  <div>
                    <Label>KM</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.km ?? "-"}
                    </div>
                  </div>

                  <div>
                    <Label>Horímetro</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.horimetro ?? "-"}
                    </div>
                  </div>

                  <div>
                    <Label>Data de Saída</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.data
                        ? new Date(visualizando.data).toLocaleDateString("pt-BR")
                        : "-"}
                    </div>
                  </div>

                  <div>
                    <Label>Data de Chegada</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.data_chegada
                        ? new Date(visualizando.data_chegada).toLocaleDateString("pt-BR")
                        : "-"}
                    </div>
                  </div>

                </div>
              </div>

              {/* Pneus */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold">
                  Pneus por Eixo
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border px-3 py-2 text-left text-sm">
                          Eixo
                        </th>
                        <th className="border px-3 py-2 text-left text-sm">
                          Pneu
                        </th>
                        <th className="border px-3 py-2 text-left text-sm">
                          Medida
                        </th>
                        <th className="border px-3 py-2 text-left text-sm">
                          Retornado
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {Object.entries(
                        visualizando.pneus_por_eixo || {}
                      ).map(([eixo, dados]: [string, any]) => (
                        <tr key={eixo}>
                          <td className="border px-3 py-2 text-sm font-medium">
                            {eixo}
                          </td>

                          <td className="border px-3 py-2 text-sm">
                            {dados?.pneu || "-"}
                          </td>

                          <td className="border px-3 py-2 text-sm">
                            {dados?.rebaba || "-"}
                          </td>

                          <td className="border px-3 py-2 text-sm">
                            {dados?.retornado || "Não"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Complementos */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold">
                  Complementos
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <Label>Checklist</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.checklist_id || "-"}
                    </div>
                  </div>

                  <div>
                    <Label>Estepe</Label>
                    <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {visualizando.estepe || "Não"}
                    </div>
                  </div>

                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>

                <div className="min-h-20 rounded-md border bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap">
                  {visualizando.observacoes || "Nenhuma observação."}
                </div>
              </div>

              {/* Fotos */}
              <div className="space-y-4">
                <h3 className="font-semibold">
                  Relatório Fotográfico
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {Object.entries(
                    visualizando.fotos || {}
                  ).flatMap(([grupo, fotos]: [string, any]) =>
                    (Array.isArray(fotos) ? fotos : []).map(
                      (foto: string, index: number) => (
                        <div
                          key={`${grupo}-${index}`}
                          className="overflow-hidden rounded-lg border bg-muted"
                        >
                          <img
                            src={foto}
                            alt={`Foto ${index + 1}`}
                            className="aspect-square h-full w-full object-cover"
                          />
                        </div>
                      )
                    )
                  )}
                </div>
              </div>

            </div>
          )}

          <div className="flex justify-end border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setVisualizacaoOpen(false)}
            >
              Fechar
            </Button>
          </div>

        </DialogContent>
      </Dialog>
    </div >
  );
}
