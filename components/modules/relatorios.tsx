"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Menu, Printer, RefreshCw, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

type Coluna = { chave: string; rotulo: string; tipo: "texto" | "moeda" | "numero" | "data" };
type Linha = Record<string, string | number | null>;
type Relatorio = { titulo: string; colunas: Coluna[]; linhas: Linha[]; totais: Record<string, number>; somar: string[] };
type Empresa = { id: string | number; nome: string };

const ROTULOS: Record<string, string> = {
  faturamento: "Faturamento por período",
  "lucro-empresa": "Lucro por empresa",
  "lucro-parceiros": "Lucro sobre parceiros",
  "a-pagar": "A pagar por período",
  "a-receber": "A receber por período",
  "pagar-receber": "Pagar e receber (juntos)",
  estoque: "Estoque",
  pneus: "Pneus (estoque, entradas e saídas)",
  "resultado-placa": "Resultado por placa",
};
// Relatórios que mostram a posição atual, sem usar o período.
const SEM_PERIODO = new Set(["estoque"]);

const formatarData = (valor: string) => (/^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor.split("-").reverse().join("/") : valor);

function formatar(coluna: Coluna, valor: string | number | null) {
  if (valor === null || valor === undefined || valor === "") return "-";
  if (coluna.tipo === "moeda") return formatCurrency(Number(valor));
  if (coluna.tipo === "data") return formatarData(String(valor));
  return String(valor);
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

export function Relatorios() {
  const [tipos, setTipos] = useState<string[]>([]);
  const [tipo, setTipo] = useState("");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresa, setEmpresa] = useState("");
  const [modo, setModo] = useState<"simplificado" | "detalhado">("detalhado");
  const [inicio, setInicio] = useState(() => `${hojeIso().slice(0, 8)}01`);
  const [fim, setFim] = useState(hojeIso);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [respostaTipos, respostaEmpresas] = await Promise.all([fetch("/api/relatorios"), fetch("/api/empresas")]);
        const dadosTipos = await respostaTipos.json();
        if (!respostaTipos.ok) throw new Error(dadosTipos.error || "Não foi possível carregar os relatórios.");
        setTipos(dadosTipos.tipos);
        setTipo((atual) => atual || dadosTipos.tipos[0] || "");
        const dadosEmpresas = await respostaEmpresas.json();
        setEmpresas(Array.isArray(dadosEmpresas) ? dadosEmpresas : dadosEmpresas.data || []);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível carregar os relatórios.");
      }
    })();
  }, []);

  async function gerar() {
    if (!tipo) return;
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams({ tipo, inicio, fim });
      if (empresa) params.set("empresa", empresa);
      const resposta = await fetch(`/api/relatorios?${params}`);
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível gerar o relatório.");
      setRelatorio(dados);
    } catch (e) {
      setRelatorio(null);
      setErro(e instanceof Error ? e.message : "Não foi possível gerar o relatório.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (tipo && inicio && fim) gerar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, empresa]);

  // Simplificado: uma linha por empresa com os totais das colunas numéricas.
  const exibicao = useMemo(() => {
    if (!relatorio) return null;
    if (modo === "detalhado") return { colunas: relatorio.colunas, linhas: relatorio.linhas };
    const grupos = new Map<string, Linha>();
    for (const linha of relatorio.linhas) {
      const nome = String(linha.empresa ?? "Geral");
      const atual = grupos.get(nome) ?? { empresa: nome, ...Object.fromEntries(relatorio.somar.map((c) => [c, 0])) };
      for (const c of relatorio.somar) atual[c] = Math.round((Number(atual[c]) + Number(linha[c] || 0)) * 100) / 100;
      grupos.set(nome, atual);
    }
    const colunas: Coluna[] = [
      { chave: "empresa", rotulo: "Empresa", tipo: "texto" },
      ...relatorio.colunas.filter((c) => relatorio.somar.includes(c.chave)),
    ];
    return { colunas, linhas: [...grupos.values()] };
  }, [relatorio, modo]);

  function exportarCsv() {
    if (!exibicao || !relatorio) return;
    const escapar = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = [
      exibicao.colunas.map((c) => escapar(c.rotulo)).join(";"),
      ...exibicao.linhas.map((l) => exibicao.colunas.map((c) => escapar(c.tipo === "moeda" ? Number(l[c.chave] || 0).toFixed(2).replace(".", ",") : l[c.chave])).join(";")),
    ];
    const blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${tipo}-${inicio}-${fim}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const nomeEmpresa = empresas.find((e) => String(e.id) === empresa)?.nome;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-y-0 left-0 z-40 hidden md:flex print:hidden"><Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} /></div>
      {menuOpen && <div className="fixed inset-0 z-50 flex md:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} /><div className="relative z-10 flex h-full"><Sidebar onClose={() => setMenuOpen(false)} /><button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-card p-2"><X className="h-5 w-5" /></button></div></div>}
      <div className={`min-h-screen transition-[padding-left] duration-300 print:pl-0 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}>
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-9 print:hidden">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" className="rounded-xl border border-border bg-card p-2 md:hidden"><Menu className="h-4 w-4" /></button>
            <h1 className="text-lg font-bold sm:text-2xl">Relatórios</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={gerar} disabled={carregando || !tipo}><RefreshCw className="mr-2 h-4 w-4" />{carregando ? "Gerando..." : "Gerar"}</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!relatorio}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
            <Button variant="outline" size="sm" onClick={exportarCsv} disabled={!relatorio}><Download className="mr-2 h-4 w-4" />CSV</Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-9">
          {erro && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{erro}</div>}

          <Card className="print:hidden">
            <CardContent className="grid grid-cols-1 gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="rel-tipo">Relatório</Label>
                <select id="rel-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {tipos.map((t) => <option key={t} value={t}>{ROTULOS[t] ?? t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rel-empresa">Empresa</Label>
                <select id="rel-empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Todas</option>
                  {empresas.map((e) => <option key={String(e.id)} value={String(e.id)}>{e.nome}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rel-modo">Visão</Label>
                <select id="rel-modo" value={modo} onChange={(e) => setModo(e.target.value as "simplificado" | "detalhado")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="detalhado">Detalhado</option>
                  <option value="simplificado">Simplificado (por empresa)</option>
                </select>
              </div>
              <div className="hidden lg:block" />
              {!SEM_PERIODO.has(tipo) && <>
                <div className="space-y-1"><Label htmlFor="rel-inicio">De</Label><Input id="rel-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="rel-fim">Até</Label><Input id="rel-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
              </>}
            </CardContent>
          </Card>

          {relatorio && exibicao && (
            <Card>
              <CardHeader>
                <CardTitle>{relatorio.titulo}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {SEM_PERIODO.has(tipo) ? "Posição atual" : `${formatarData(inicio)} a ${formatarData(fim)}`}
                  {" · "}{nomeEmpresa ?? "Todas as empresas"}{" · "}{modo === "detalhado" ? "Detalhado" : "Simplificado"}
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>{exibicao.colunas.map((c) => <TableHead key={c.chave} className={c.tipo === "moeda" || c.tipo === "numero" ? "text-right" : ""}>{c.rotulo}</TableHead>)}</TableRow>
                    </TableHeader>
                    <TableBody>
                      {exibicao.linhas.map((linha, i) => (
                        <TableRow key={i}>{exibicao.colunas.map((c) => <TableCell key={c.chave} className={c.tipo === "moeda" || c.tipo === "numero" ? "text-right tabular-nums" : ""}>{formatar(c, linha[c.chave])}</TableCell>)}</TableRow>
                      ))}
                      {exibicao.linhas.length > 0 && (
                        <TableRow className="font-bold">
                          {exibicao.colunas.map((c, i) => (
                            <TableCell key={c.chave} className={c.tipo === "moeda" || c.tipo === "numero" ? "text-right tabular-nums" : ""}>
                              {i === 0 ? "Total" : relatorio.somar.includes(c.chave) ? formatar(c, relatorio.totais[c.chave]) : ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {exibicao.linhas.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum registro no período.</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
