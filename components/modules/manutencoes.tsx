"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calculator,
  Edit,
  FileDown,
  Menu,
  Plus,
  Search,
  Trash2,
  X,
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

type ManutencaoApi = {
  id: string;
  osNum?: string | null;
  finStatus?: string | null;
  eqId?: string | null;
  eqLbl?: string | null;
  placa?: string | null;
  tipo?: string | null;
  en?: string | null;
  sa?: string | null;
  km?: string | number | null;
  hr?: string | number | null;
  pkm?: string | number | null;
  phr?: string | number | null;
  custo?: string | null;
  status?: string | null;
  resp?: string | null;
  ob?: string | null;
};

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
};

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
};

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
    setForm({
      ...formularioInicial,
      osNum: proximoOs,
      en: new Date().toISOString().slice(0, 10),
    });
    setDialogOpen(true);
  }

  function editar(manutencao: ManutencaoApi) {
    setEditing(manutencao);

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
                          onClick={() => window.print()}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {editing ? "Editar manutenção" : "Nova manutenção"}
            </DialogTitle>

            <DialogDescription>
              Informe os dados da manutenção.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            {[
              ["osNum", "Número da O.S."],
              ["resp", "Responsável"],
              ["custo", "Custo"],
              ["km", "KM atual"],
              ["hr", "Horímetro atual"],
              ["pkm", "Próximo KM"],
              ["phr", "Próximo horímetro"],
            ].map(([campo, label]) => (
              <div key={campo} className="space-y-2">
                <Label>{label}</Label>
                <Input
                  type={["km", "hr", "pkm", "phr"].includes(campo) ? "number" : "text"}
                  readOnly={campo === "osNum"}
                  value={form[campo as keyof FormData]}
                  onChange={(event) => alterarCampo(campo as keyof FormData, event.target.value)}
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label>Tipo de manutenção</Label>
              <Select
                value={form.tipo}
                onValueChange={(value) => alterarCampo("tipo", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
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
            <div className="space-y-2">
              <Label>Equipamento</Label>
              <Select value={form.eqId} onValueChange={selecionarEquipamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {carregandoEquipamentos ? (
                    <SelectItem value="carregando" disabled>
                      Carregando equipamentos...
                    </SelectItem>
                  ) : equipamentos.filter((equipamento) => equipamento.placa).length > 0 ? (
                    equipamentos
                      .filter((equipamento) => equipamento.placa)
                      .map((equipamento) => (
                        <SelectItem key={String(equipamento.id)} value={String(equipamento.id)}>
                          {equipamento.placa} - {[equipamento.tipo, equipamento.marca, equipamento.modelo]
                            .filter(Boolean)
                            .join(" ")}
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="nenhum" disabled>
                      Nenhum equipamento com placa cadastrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de entrada</Label>
              <Input type="date" value={form.en} onChange={(event) => alterarCampo("en", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de saída</Label>
              <Input type="date" value={form.sa} onChange={(event) => alterarCampo("sa", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => alterarCampo("status", value)}>
                <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status financeiro</Label>
              <Select value={form.finStatus} onValueChange={(value) => alterarCampo("finStatus", value)}>
                <SelectTrigger><SelectValue placeholder="Selecione o status financeiro" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Observações</Label>
              <Input value={form.ob} onChange={(event) => alterarCampo("ob", event.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              className=""
              onClick={() => setDialogOpen(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              className=""
              onClick={salvar}
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : editing
                  ? "Salvar alterações"
                  : "Criar manutenção"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}