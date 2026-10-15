"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Ban, Edit, Menu, Plus, Printer, RotateCcw, Search, Trash2, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { chamarApi, mensagemErro } from "@/lib/api-client";
import { usuarioLogado, usuarioPode } from "@/lib/permissoes-client";
import { useSortableData } from "@/components/ui/sortable-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Tipos ────────────────────────────────────────────────────────────────────

const CONDICOES = [
  { valor: "novo", rotulo: "Novo" },
  { valor: "usado", rotulo: "Usado" },
  { valor: "reformado", rotulo: "Reformado" },
  { valor: "carcaça", rotulo: "Carcaça" },
];

interface Pneu {
  id: string;
  codigo?: string | null;
  numero: string;
  marca: string;
  modelo?: string | null;
  medida?: string | null;
  dot?: string | null;
  condicao: string;
  pct_borracha?: number | null;
  valor?: string | null;
  data?: string | null;
  observacao?: string | null;
  situacao: string;
  placa?: string | null;
}

type PneuForm = {
  numero: string;
  marca: string;
  modelo: string;
  medida: string;
  dot: string;
  condicao: string;
  pct_borracha: string;
  valor: string;
  data: string;
  observacao: string;
};

type ItemRomaneio = {
  id: string;
  pneu_id: string;
  resultado?: string | null;
  pct_borracha?: number | null;
  valor_reforma?: string | number | null;
  pneu?: Pneu | null;
};

type Romaneio = {
  id: string;
  numero?: string | null;
  reformadora?: string | null;
  data_saida?: string | null;
  previsao_retorno?: string | null;
  status: string;
  observacoes?: string | null;
  itens: ItemRomaneio[];
};

type Pendencia = { id: string; os_num?: string | null; placa?: string | null; pneu_saida_id?: string | null; status: string; criado_em?: string };

type RetornoItem = { resultado: "" | "reformado" | "recusado"; pct_borracha: string; valor_reforma: string };

const ROTULO_SITUACAO: Record<string, { label: string; cor: string }> = {
  estoque: { label: "Em estoque", cor: "bg-emerald-100 text-emerald-700" },
  instalado: { label: "Instalado", cor: "bg-blue-100 text-blue-700" },
  reforma: { label: "Em reforma", cor: "bg-amber-100 text-amber-700" },
  inutilizado: { label: "Inutilizado", cor: "bg-red-100 text-red-700" },
};

function calcularIdade(dot?: string | null): number | null {
  if (!dot || dot.length < 4) return null;
  const ano = parseInt(dot.slice(2, 4));
  if (!parseInt(dot.slice(0, 2)) || !ano) return null;
  return new Date().getFullYear() - (ano < 50 ? 2000 + ano : 1900 + ano);
}

const formularioVazio = (): PneuForm => ({
  numero: "",
  marca: "",
  modelo: "",
  medida: "",
  dot: "",
  condicao: "novo",
  pct_borracha: "",
  valor: "",
  data: new Date().toISOString().slice(0, 10),
  observacao: "",
});

type Aba = "estoque" | "romaneios" | "pendencias";

// ─── Componente principal ─────────────────────────────────────────────────────

export function Pneus() {
  const [aba, setAba] = useState<Aba>("estoque");
  const [pneus, setPneus] = useState<Pneu[]>([]);
  const [romaneios, setRomaneios] = useState<Romaneio[]>([]);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [search, setSearch] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("estoque");
  const [filtroCondicao, setFiltroCondicao] = useState("todas");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [usuario, setUsuario] = useState(() => (typeof window === "undefined" ? null : usuarioLogado()));

  // cadastro / edição (também usado para lançar a entrada de uma pendência)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pneu | null>(null);
  const [pendenciaEntrada, setPendenciaEntrada] = useState<Pendencia | null>(null);
  const [form, setForm] = useState<PneuForm>(formularioVazio());
  const [salvando, setSalvando] = useState(false);

  // inutilização
  const [inutilizando, setInutilizando] = useState<Pneu | null>(null);
  const [motivo, setMotivo] = useState("");

  // romaneio de saída
  const [romaneioOpen, setRomaneioOpen] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [romaneioForm, setRomaneioForm] = useState({ reformadora: "", data_saida: new Date().toISOString().slice(0, 10), previsao_retorno: "", observacoes: "" });

  // retorno do romaneio
  const [retornando, setRetornando] = useState<Romaneio | null>(null);
  const [retorno, setRetorno] = useState<Record<string, RetornoItem>>({});

  useEffect(() => setUsuario(usuarioLogado()), []);
  const pode = (chave: string) => usuarioPode(usuario, chave);

  async function carregarTudo() {
    try {
      const [p, r, pend] = await Promise.all([
        fetch("/api/pneus", { credentials: "include" }).then((x) => x.json()),
        fetch("/api/romaneios", { credentials: "include" }).then((x) => x.json()),
        fetch("/api/pneu-pendencias", { credentials: "include" }).then((x) => x.json()),
      ]);
      setPneus(Array.isArray(p) ? p : p.data || []);
      setRomaneios(r.data || []);
      setPendencias(pend.data || []);
    } catch (erro) {
      console.error("Erro ao carregar pneus:", erro);
    }
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  const pneusEmRomaneio = useMemo(() => {
    const ids = new Set<string>();
    for (const r of romaneios) {
      if (r.status !== "aberto") continue;
      for (const item of r.itens) if (!item.resultado) ids.add(item.pneu_id);
    }
    return ids;
  }, [romaneios]);

  const totais = useMemo(() => ({
    estoque: pneus.filter((p) => p.situacao === "estoque").length,
    instalado: pneus.filter((p) => p.situacao === "instalado").length,
    reforma: pneusEmRomaneio.size,
    inutilizado: pneus.filter((p) => p.situacao === "inutilizado").length,
  }), [pneus, pneusEmRomaneio]);

  const antigos = useMemo(
    () => pneus.filter((p) => p.situacao === "estoque" && (calcularIdade(p.dot) ?? 0) >= 5),
    [pneus],
  );

  const filtrados = useMemo(() => {
    const termo = search.toLowerCase();
    return pneus.filter((p) => {
      const texto = [p.numero, p.codigo, p.marca, p.modelo, p.medida, p.placa].join(" ").toLowerCase();
      const situacao = pneusEmRomaneio.has(p.id) && p.situacao === "estoque" ? "reforma" : p.situacao;
      return (
        texto.includes(termo) &&
        (filtroSituacao === "todas" || situacao === filtroSituacao) &&
        (filtroCondicao === "todas" || p.condicao === filtroCondicao)
      );
    });
  }, [pneus, search, filtroSituacao, filtroCondicao, pneusEmRomaneio]);
  const { sortedItems: pneusOrdenados } = useSortableData(filtrados);

  // ── Cadastro ──
  function abrirNovo() {
    setEditing(null);
    setPendenciaEntrada(null);
    setForm(formularioVazio());
    setDialogOpen(true);
  }

  function abrirEdicao(p: Pneu) {
    setEditing(p);
    setPendenciaEntrada(null);
    setForm({
      numero: p.numero || "",
      marca: p.marca || "",
      modelo: p.modelo || "",
      medida: p.medida || "",
      dot: p.dot || "",
      condicao: p.condicao || "novo",
      pct_borracha: p.pct_borracha == null ? "" : String(p.pct_borracha),
      valor: p.valor || "",
      data: p.data?.slice(0, 10) || "",
      observacao: p.observacao || "",
    });
    setDialogOpen(true);
  }

  function abrirEntrada(pendencia: Pendencia) {
    setEditing(null);
    setPendenciaEntrada(pendencia);
    setForm({ ...formularioVazio(), condicao: "carcaça", observacao: `Carcaça da ${pendencia.os_num ?? "OS"} (${pendencia.placa ?? ""})` });
    setDialogOpen(true);
  }

  async function salvar() {
    if (!form.numero.trim()) return alert("Informe o número do pneu.");
    if (!form.marca.trim()) return alert("Informe a marca.");
    setSalvando(true);
    try {
      const payload = { ...form, pct_borracha: form.pct_borracha === "" ? null : Number(form.pct_borracha) };
      if (pendenciaEntrada) {
        await chamarApi(`/api/pneu-pendencias/${pendenciaEntrada.id}/entrada`, "POST", payload);
      } else {
        await chamarApi(editing ? `/api/pneus/${editing.id}` : "/api/pneus", editing ? "PUT" : "POST", payload);
      }
      await carregarTudo();
      setDialogOpen(false);
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível salvar o pneu."));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(p: Pneu) {
    if (!confirm(`Excluir o pneu ${p.numero}?`)) return;
    try {
      await chamarApi(`/api/pneus/${p.id}`, "DELETE");
      await carregarTudo();
    } catch (erro) {
      alert(mensagemErro(erro, "Não foi possível excluir o pneu."));
    }
  }

  async function confirmarInutilizacao() {
    if (!inutilizando) return;
    if (motivo.trim().length < 5) return alert("Informe o motivo (mínimo 5 caracteres).");
    try {
      await chamarApi(`/api/pneus/${inutilizando.id}/inutilizar`, "POST", { motivo });
      setInutilizando(null);
      setMotivo("");
      await carregarTudo();
    } catch (erro) {
      alert(mensagemErro(erro));
    }
  }

  // ── Romaneio ──
  function abrirRomaneio() {
    setSelecionados([]);
    setRomaneioForm({ reformadora: "", data_saida: new Date().toISOString().slice(0, 10), previsao_retorno: "", observacoes: "" });
    setRomaneioOpen(true);
  }

  const elegiveis = pneus.filter((p) => p.situacao === "estoque" && !pneusEmRomaneio.has(p.id));

  async function criarRomaneio() {
    if (!romaneioForm.reformadora.trim()) return alert("Informe a reformadora.");
    if (!selecionados.length) return alert("Selecione ao menos um pneu.");
    try {
      const criado = await chamarApi<{ id: string }>("/api/romaneios", "POST", { ...romaneioForm, pneu_ids: selecionados });
      setRomaneioOpen(false);
      await carregarTudo();
      const lista = await fetch("/api/romaneios", { credentials: "include" }).then((x) => x.json());
      const novo = (lista.data || []).find((r: Romaneio) => String(r.id) === String(criado.id));
      if (novo) imprimirRomaneio(novo);
    } catch (erro) {
      alert(mensagemErro(erro));
    }
  }

  function imprimirRomaneio(r: Romaneio) {
    const linhas = r.itens
      .map(
        (i) => `<tr><td>${i.pneu?.codigo ?? ""}</td><td>${i.pneu?.numero ?? ""}</td><td>${i.pneu?.marca ?? ""} ${i.pneu?.modelo ?? ""}</td><td>${i.pneu?.medida ?? ""}</td><td>${i.pneu?.dot ?? ""}</td><td>${i.pneu?.condicao ?? ""}</td><td></td></tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Romaneio ${r.numero}</title>
      <style>body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #999;padding:6px 8px;font-size:12px;text-align:left}th{background:#eee}.meta{font-size:13px;margin:2px 0}.ass{margin-top:60px;display:flex;gap:40px}.ass div{flex:1;border-top:1px solid #000;padding-top:4px;font-size:12px;text-align:center}</style></head>
      <body><h1>Romaneio de saída para reforma ${r.numero ?? ""}</h1>
      <p class="meta"><strong>Reformadora:</strong> ${r.reformadora ?? ""}</p>
      <p class="meta"><strong>Data de saída:</strong> ${formatDate(r.data_saida)} &nbsp; <strong>Previsão de retorno:</strong> ${formatDate(r.previsao_retorno)}</p>
      ${r.observacoes ? `<p class="meta"><strong>Observações:</strong> ${r.observacoes}</p>` : ""}
      <table><thead><tr><th>Código</th><th>Nº pneu</th><th>Marca / modelo</th><th>Medida</th><th>DOT</th><th>Condição</th><th>Observação</th></tr></thead><tbody>${linhas}</tbody></table>
      <p class="meta" style="margin-top:12px">Total: ${r.itens.length} pneu(s)</p>
      <div class="ass"><div>Responsável MH3</div><div>Reformadora</div></div>
      <script>window.onload=function(){window.print()}</script></body></html>`;
    const janela = window.open("", "_blank");
    if (!janela) return alert("Não foi possível abrir a impressão. Verifique o bloqueio de pop-ups.");
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
  }

  function abrirRetorno(r: Romaneio) {
    setRetornando(r);
    const inicial: Record<string, RetornoItem> = {};
    for (const i of r.itens) {
      if (!i.resultado) inicial[i.id] = { resultado: "", pct_borracha: i.pneu?.pct_borracha == null ? "" : String(i.pneu.pct_borracha), valor_reforma: "" };
    }
    setRetorno(inicial);
  }

  async function salvarRetorno() {
    if (!retornando) return;
    const itens = Object.entries(retorno)
      .filter(([, v]) => v.resultado)
      .map(([id, v]) => ({
        id,
        resultado: v.resultado,
        pct_borracha: v.pct_borracha === "" ? null : Number(v.pct_borracha),
        valor_reforma: v.valor_reforma === "" ? null : Number(v.valor_reforma),
      }));
    if (!itens.length) return alert("Marque o resultado (reformado ou recusado) de ao menos um pneu.");
    try {
      await chamarApi(`/api/romaneios/${retornando.id}`, "PUT", { itens });
      setRetornando(null);
      await carregarTudo();
    } catch (erro) {
      alert(mensagemErro(erro));
    }
  }

  async function excluirRomaneio(r: Romaneio) {
    if (!confirm(`Excluir o romaneio ${r.numero}?`)) return;
    try {
      await chamarApi(`/api/romaneios/${r.id}`, "DELETE");
      await carregarTudo();
    } catch (erro) {
      alert(mensagemErro(erro));
    }
  }

  const pendenciasAbertas = pendencias.filter((p) => p.status === "pendente");
  const romaneiosAbertos = romaneios.filter((r) => r.status === "aberto");

  const abas: [Aba, string, number][] = [
    ["estoque", "Pneus", pneus.length],
    ["romaneios", "Romaneios de reforma", romaneiosAbertos.length],
    ["pendencias", "Entradas pendentes", pendenciasAbertas.length],
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-foreground dark:bg-background">
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
              className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-card p-2 text-foreground shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}>
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex flex-1 items-center gap-3">
            <button type="button" onClick={() => setMenuOpen(true)} className="rounded-xl border border-border bg-card p-2 md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="whitespace-nowrap text-lg font-bold text-foreground">Pneus</h1>
          </div>
          <div className="flex gap-2">
            {pode("pneus-romaneio") && (
              <Button variant="outline" className="h-9 text-sm" onClick={abrirRomaneio}>
                <Printer className="mr-1 h-4 w-4" /> Saída para reformadora
              </Button>
            )}
            {pode("pneus-criar") && (
              <Button onClick={abrirNovo} className="h-9 rounded-md bg-red-600 text-sm font-bold text-white hover:bg-red-700">
                <Plus className="mr-1 h-4 w-4" /> Novo pneu
              </Button>
            )}
          </div>
        </header>

        <main className="w-full space-y-4 p-4 sm:p-6">
          <div role="tablist" className="flex gap-1 border-b border-border">
            {abas.map(([id, rotulo, qtd]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={aba === id}
                onClick={() => setAba(id)}
                className={`border-b-2 px-4 py-2 text-sm font-medium ${aba === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {rotulo} <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{qtd}</span>
              </button>
            ))}
          </div>

          {aba === "estoque" && (
            <>
              {antigos.length > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-100 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-bold text-amber-700">Pneus em estoque com DOT de 5 anos ou mais ({antigos.length})</p>
                    <p className="text-sm text-amber-700">Pneu a partir de 5 anos de fabricação entra neste alerta.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
                {([
                  ["Em estoque", totais.estoque, "text-emerald-600"],
                  ["Instalados", totais.instalado, "text-blue-600"],
                  ["Em romaneio de reforma", totais.reforma, "text-amber-600"],
                  ["Inutilizados", totais.inutilizado, "text-red-600"],
                ] as [string, number, string][]).map(([rotulo, valor, cor]) => (
                  <div key={rotulo} className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{rotulo}</p>
                    <p className={`mt-1 text-2xl font-black ${cor}`}>{valor}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1 sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar nº, código, marca, medida, placa..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 border-border bg-card pl-9 text-xs" />
                </div>
                <Select value={filtroSituacao} onValueChange={(v) => setFiltroSituacao(v ?? "estoque")}>
                  <SelectTrigger className="h-9 w-full border-border bg-card text-xs sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estoque">Em estoque</SelectItem>
                    <SelectItem value="instalado">Instalados</SelectItem>
                    <SelectItem value="reforma">Em reforma</SelectItem>
                    <SelectItem value="inutilizado">Inutilizados</SelectItem>
                    <SelectItem value="todas">Todas as situações</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroCondicao} onValueChange={(v) => setFiltroCondicao(v ?? "todas")}>
                  <SelectTrigger className="h-9 w-full border-border bg-card text-xs sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as condições</SelectItem>
                    {CONDICOES.map((c) => <SelectItem key={c.valor} value={c.valor}>{c.rotulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nº</TableHead>
                      <TableHead>Marca / modelo</TableHead>
                      <TableHead>Medida</TableHead>
                      <TableHead>DOT</TableHead>
                      <TableHead>Condição</TableHead>
                      <TableHead>% borracha</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pneusOrdenados.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhum pneu encontrado.</TableCell></TableRow>
                    )}
                    {pneusOrdenados.map((p) => {
                      const situacaoExibida = pneusEmRomaneio.has(p.id) && p.situacao === "estoque" ? "reforma" : p.situacao;
                      const badge = ROTULO_SITUACAO[situacaoExibida] ?? { label: situacaoExibida, cor: "bg-gray-100 text-gray-700" };
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">{p.codigo || "-"}</TableCell>
                          <TableCell className="font-semibold">{p.numero}</TableCell>
                          <TableCell className="text-xs">{p.marca} {p.modelo}</TableCell>
                          <TableCell className="text-xs">{p.medida || "-"}</TableCell>
                          <TableCell className="text-xs">{p.dot || "-"}</TableCell>
                          <TableCell className="text-xs capitalize">{p.condicao}</TableCell>
                          <TableCell className="text-xs">{p.pct_borracha == null ? "-" : `${p.pct_borracha}%`}</TableCell>
                          <TableCell>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cor}`}>{badge.label}</span>
                            {p.placa && p.situacao === "instalado" && <span className="ml-1 text-[11px] text-muted-foreground">{p.placa}</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {pode("pneus-editar") && p.situacao !== "inutilizado" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" title="Editar" onClick={() => abrirEdicao(p)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {pode("pneus-inutilizar") && p.situacao === "estoque" && !pneusEmRomaneio.has(p.id) && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" title="Saída por inutilização" onClick={() => { setInutilizando(p); setMotivo(""); }}>
                                  <Ban className="h-4 w-4" />
                                </Button>
                              )}
                              {pode("pneus-excluir") && p.situacao === "estoque" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Excluir" onClick={() => excluir(p)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Pneus instalados saem do estoque pela OS (troca de pneus) e os vendidos, pela venda/avaria. A saída por inutilização é feita aqui.
              </p>
            </>
          )}

          {aba === "romaneios" && (
            <div className="space-y-3">
              {romaneios.length === 0 && <p className="py-8 text-center text-muted-foreground">Nenhum romaneio criado.</p>}
              {romaneios.map((r) => (
                <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{r.numero} — {r.reformadora}</p>
                      <p className="text-xs text-muted-foreground">
                        Saída {formatDate(r.data_saida)} · previsão {formatDate(r.previsao_retorno)} · {r.itens.length} pneu(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "aberto" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {r.status === "aberto" ? "Aguardando retorno" : "Retornado"}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => imprimirRomaneio(r)}><Printer className="mr-1 h-4 w-4" /> Imprimir</Button>
                      {pode("pneus-romaneio") && r.status === "aberto" && (
                        <>
                          <Button size="sm" onClick={() => abrirRetorno(r)}><RotateCcw className="mr-1 h-4 w-4" /> Lançar retorno</Button>
                          {r.itens.every((i) => !i.resultado) && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => excluirRomaneio(r)}><Trash2 className="h-4 w-4" /></Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <ul className="mt-3 divide-y divide-border text-sm">
                    {r.itens.map((i) => (
                      <li key={i.id} className="flex items-center justify-between py-1.5">
                        <span>Nº {i.pneu?.numero} — {i.pneu?.marca} {i.pneu?.medida}</span>
                        <span className="text-xs text-muted-foreground">
                          {i.resultado
                            ? `${i.resultado}${i.pct_borracha != null ? ` · ${i.pct_borracha}% borracha` : ""}${i.valor_reforma ? ` · ${formatCurrency(Number(i.valor_reforma))}` : ""}`
                            : "aguardando"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {aba === "pendencias" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Cada pneu retirado do estoque em uma OS de troca gera uma entrada de carcaça a cadastrar.
              </p>
              {pendenciasAbertas.length === 0 && <p className="py-8 text-center text-muted-foreground">Nenhuma entrada pendente.</p>}
              {pendenciasAbertas.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
                  <span className="text-sm">
                    <strong>{p.os_num}</strong> — placa {p.placa} — saiu o pneu Nº {pneus.find((x) => x.id === p.pneu_saida_id)?.numero ?? p.pneu_saida_id}
                  </span>
                  {pode("pneus-criar") && (
                    <Button size="sm" onClick={() => abrirEntrada(p)}><Plus className="mr-1 h-4 w-4" /> Cadastrar entrada</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Cadastro / edição / entrada de carcaça */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{pendenciaEntrada ? `Entrada de pneu — ${pendenciaEntrada.os_num}` : editing ? "Editar pneu" : "Novo pneu"}</DialogTitle>
            <DialogDescription>O código do lançamento é gerado automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nº do pneu *</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Marca *</Label>
              <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Medida</Label>
              <Input value={form.medida} onChange={(e) => setForm({ ...form, medida: e.target.value })} placeholder="295/80 R22.5" />
            </div>
            <div className="space-y-2">
              <Label>DOT (semana+ano, ex.: 2523)</Label>
              <Input value={form.dot} maxLength={4} onChange={(e) => setForm({ ...form, dot: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Condição *</Label>
              <Select value={form.condicao} onValueChange={(v) => setForm({ ...form, condicao: v ?? "novo" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDICOES.map((c) => <SelectItem key={c.valor} value={c.valor}>{c.rotulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>% de borracha</Label>
              <Input type="number" min="0" max="100" step="1" value={form.pct_borracha} onChange={(e) => setForm({ ...form, pct_borracha: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data de entrada</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Observação</Label>
              <Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inutilização */}
      <Dialog open={!!inutilizando} onOpenChange={(aberto) => !aberto && setInutilizando(null)}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Saída por inutilização</DialogTitle>
            <DialogDescription>Pneu Nº {inutilizando?.numero} — {inutilizando?.marca}. Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: corte lateral irrecuperável" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInutilizando(null)}>Cancelar</Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={confirmarInutilizacao}>Inutilizar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Romaneio de saída */}
      <Dialog open={romaneioOpen} onOpenChange={setRomaneioOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Saída para reformadora</DialogTitle>
            <DialogDescription>
              Cria o romaneio para impressão e uma pendência de retorno. Os pneus continuam no estoque até o retorno.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label>Reformadora *</Label>
              <Input value={romaneioForm.reformadora} onChange={(e) => setRomaneioForm({ ...romaneioForm, reformadora: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data de saída</Label>
              <Input type="date" value={romaneioForm.data_saida} onChange={(e) => setRomaneioForm({ ...romaneioForm, data_saida: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Previsão de retorno</Label>
              <Input type="date" value={romaneioForm.previsao_retorno} onChange={(e) => setRomaneioForm({ ...romaneioForm, previsao_retorno: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label>Observações</Label>
              <Input value={romaneioForm.observacoes} onChange={(e) => setRomaneioForm({ ...romaneioForm, observacoes: e.target.value })} />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            {elegiveis.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum pneu disponível em estoque.</p>}
            {elegiveis.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-b-0 hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={selecionados.includes(p.id)}
                  onChange={(e) => setSelecionados((atual) => e.target.checked ? [...atual, p.id] : atual.filter((x) => x !== p.id))}
                />
                <span className="flex-1">Nº {p.numero} — {p.marca} {p.modelo} {p.medida}</span>
                <span className="text-xs capitalize text-muted-foreground">{p.condicao}{p.pct_borracha != null ? ` · ${p.pct_borracha}%` : ""}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{selecionados.length} pneu(s) selecionado(s)</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRomaneioOpen(false)}>Cancelar</Button>
              <Button onClick={criarRomaneio}>Criar e imprimir</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Retorno do romaneio */}
      <Dialog open={!!retornando} onOpenChange={(aberto) => !aberto && setRetornando(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-3xl">
          {retornando && (
            <>
              <DialogHeader>
                <DialogTitle>Retorno do romaneio {retornando.numero}</DialogTitle>
                <DialogDescription>
                  Informe, para cada pneu que voltou, se foi reformado ou recusado e a % de borracha. Pode lançar parcialmente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {retornando.itens.filter((i) => !i.resultado).map((i) => {
                  const atual = retorno[i.id] ?? { resultado: "", pct_borracha: "", valor_reforma: "" };
                  const atualizar = (parcial: Partial<RetornoItem>) => setRetorno((r) => ({ ...r, [i.id]: { ...atual, ...parcial } }));
                  return (
                    <div key={i.id} className="grid items-center gap-2 rounded-md border border-border p-2 sm:grid-cols-[1.4fr_1fr_0.8fr_0.9fr]">
                      <span className="text-sm">Nº {i.pneu?.numero} — {i.pneu?.marca} {i.pneu?.medida}</span>
                      <Select value={atual.resultado} onValueChange={(v) => atualizar({ resultado: (v ?? "") as RetornoItem["resultado"] })}>
                        <SelectTrigger><SelectValue placeholder="Resultado" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reformado">Reformado</SelectItem>
                          <SelectItem value="recusado">Recusado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" min="0" max="100" placeholder="% borracha" value={atual.pct_borracha} onChange={(e) => atualizar({ pct_borracha: e.target.value })} />
                      <Input type="number" step="0.01" placeholder="Valor (R$)" value={atual.valor_reforma} onChange={(e) => atualizar({ valor_reforma: e.target.value })} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRetornando(null)}>Cancelar</Button>
                <Button onClick={salvarRetorno}>Salvar retorno</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
