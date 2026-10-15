"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Check, CircleAlert, Menu, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { ContaBancariaSelect } from "@/components/ui/conta-bancaria-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chamarApi, mensagemErro } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

type Ajuda = { ajudaId: string; mes: string; vencimento: string; diasParaVencer: number; motorista?: string | null; empresa?: string | null; placa?: string | null; valor: number };
type Documento = { equipamentoId: string; placa?: string | null; documento: string; vencimento: string; diasParaVencer: number };
type Seguro = { id: string; seguradora?: string | null; numero_apolice?: string | null; data_fim?: string | null; diasParaVencer: number | null; placas?: string[] | null };
type PendenciaPneu = { id: string; os_num?: string | null; placa?: string | null };
type Romaneio = { id: string; numero?: string | null; reformadora?: string | null; previsao_retorno?: string | null };
type DespesaPendente = { id: string; num_desp?: string | null; descricao?: string | null; categoria?: string | null; data_vencimento?: string | null; valor?: string | number | null };

type Dados = {
  ajudas: Ajuda[];
  documentos: Documento[];
  seguros: Seguro[];
  pneus: PendenciaPneu[];
  romaneios: Romaneio[];
  despesas: DespesaPendente[];
};

const vazio: Dados = { ajudas: [], documentos: [], seguros: [], pneus: [], romaneios: [], despesas: [] };

function prazo(dias: number | null) {
  if (dias === null) return "";
  if (dias < 0) return `vencido há ${-dias} dia(s)`;
  if (dias === 0) return "vence hoje";
  return `vence em ${dias} dia(s)`;
}

function Bloco({ titulo, descricao, quantidade, children }: { titulo: string; descricao: string; quantidade: number; children: ReactNode }) {
  if (quantidade === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="font-semibold">{titulo}</h2>
          <p className="text-xs text-muted-foreground">{descricao}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{quantidade}</span>
      </div>
      <ul className="divide-y divide-border">{children}</ul>
    </section>
  );
}

export function Pendencias() {
  const [dados, setDados] = useState<Dados>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [pagando, setPagando] = useState<DespesaPendente | null>(null);
  const [conta, setConta] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [processando, setProcessando] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const response = await fetch("/api/pendencias", { credentials: "include" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setDados({ ...vazio, ...payload });
    } catch (e) {
      setErro(mensagemErro(e, "Não foi possível carregar as pendências."));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function confirmarAjuda(ajuda: Ajuda) {
    const chave = `${ajuda.ajudaId}-${ajuda.mes}`;
    setConfirmando(chave);
    try {
      await chamarApi("/api/pendencias", "POST", { acao: "confirmar_ajuda", ajudaId: ajuda.ajudaId, mes: ajuda.mes });
      await carregar();
    } catch (e) {
      alert(mensagemErro(e));
    } finally {
      setConfirmando(null);
    }
  }

  async function confirmarPagamento() {
    if (!pagando) return;
    if (!conta) return alert("Selecione de qual conta sai o recurso.");
    setProcessando(true);
    try {
      await chamarApi(`/api/despesas/${pagando.id}/acao`, "POST", {
        acao: "pagar",
        conta_banco_id: conta,
        valor_pago: Number(valorPago),
      });
      setPagando(null);
      await carregar();
    } catch (e) {
      alert(mensagemErro(e));
    } finally {
      setProcessando(false);
    }
  }

  const total =
    dados.ajudas.length + dados.documentos.length + dados.seguros.length + dados.pneus.length + dados.romaneios.length + dados.despesas.length;

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
              className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-card p-2 text-foreground shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}>
        <header className="sticky top-0 z-30 flex min-h-20 items-center gap-3 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-9">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" className="rounded-xl border border-border bg-card p-2 md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight sm:text-2xl">Pendências e alertas</h1>
            <p className="text-sm text-muted-foreground">Você vê apenas os alertas das áreas liberadas para o seu usuário</p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          {erro && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <CircleAlert className="h-5 w-5 shrink-0" /> {erro}
            </div>
          )}
          {carregando && <p className="py-10 text-center text-muted-foreground">Carregando pendências...</p>}
          {!carregando && !erro && total === 0 && (
            <p className="py-10 text-center text-muted-foreground">Nenhuma pendência no momento.</p>
          )}

          <Bloco titulo="Ajudas de motorista a confirmar" descricao="Recorrentes: aparecem 7 dias antes do vencimento. Ao confirmar, entram no Contas a Pagar." quantidade={dados.ajudas.length}>
            {dados.ajudas.map((a) => {
              const chave = `${a.ajudaId}-${a.mes}`;
              return (
                <li key={chave} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span>
                    <strong>{a.motorista}</strong> {a.empresa ? `· ${a.empresa}` : ""} {a.placa ? `· ${a.placa}` : ""}
                    <span className="block text-xs text-muted-foreground">
                      {formatCurrency(a.valor)} — vencimento {formatDate(a.vencimento)} ({prazo(a.diasParaVencer)})
                    </span>
                  </span>
                  <Button size="sm" disabled={confirmando === chave} onClick={() => confirmarAjuda(a)}>
                    <Check className="mr-1 h-4 w-4" /> {confirmando === chave ? "Confirmando..." : "Confirmar"}
                  </Button>
                </li>
              );
            })}
          </Bloco>

          <Bloco titulo="Vencimentos de documentos da frota" descricao="Cronotacógrafo, Inmetro, ANTT e outros — alerta 10 dias antes." quantidade={dados.documentos.length}>
            {dados.documentos.map((d) => (
              <li key={`${d.equipamentoId}-${d.documento}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <strong>{d.placa}</strong> — {d.documento}
                  <span className="block text-xs text-muted-foreground">{formatDate(d.vencimento)} ({prazo(d.diasParaVencer)})</span>
                </span>
                <Link className="text-xs text-primary underline" href="/frota">Abrir frota</Link>
              </li>
            ))}
          </Bloco>

          <Bloco titulo="Seguros a vencer" descricao="Apólices que vencem em até 15 dias." quantidade={dados.seguros.length}>
            {dados.seguros.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <strong>{s.seguradora}</strong> — apólice {s.numero_apolice}
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(s.data_fim)} ({prazo(s.diasParaVencer)}) · {(s.placas ?? []).join(", ")}
                  </span>
                </span>
                <Link className="text-xs text-primary underline" href="/seguro">Abrir seguros</Link>
              </li>
            ))}
          </Bloco>

          <Bloco titulo="Entradas de pneus pendentes" descricao="Pneus retirados do estoque em OS de troca: cadastre a carcaça que entrou." quantidade={dados.pneus.length}>
            {dados.pneus.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span><strong>{p.os_num}</strong> — placa {p.placa}</span>
                <Link className="text-xs text-primary underline" href="/pneus">Lançar entrada</Link>
              </li>
            ))}
          </Bloco>

          <Bloco titulo="Romaneios de reforma aguardando retorno" descricao="Pneus enviados à reformadora que ainda não voltaram." quantidade={dados.romaneios.length}>
            {dados.romaneios.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <strong>{r.numero}</strong> — {r.reformadora}
                  <span className="block text-xs text-muted-foreground">Previsão de retorno: {formatDate(r.previsao_retorno)}</span>
                </span>
                <Link className="text-xs text-primary underline" href="/pneus">Lançar retorno</Link>
              </li>
            ))}
          </Bloco>

          <Bloco titulo="Contas a pagar em aberto neste mês" descricao="Para pagar, informe a conta de onde sai o recurso." quantidade={dados.despesas.length}>
            {dados.despesas.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{d.num_desp}</span> {d.descricao}
                  <span className="block text-xs text-muted-foreground">
                    {d.categoria} — vence {formatDate(d.data_vencimento)} — {formatCurrency(Number(d.valor || 0))}
                  </span>
                </span>
                <Button size="sm" variant="outline" onClick={() => { setPagando(d); setConta(""); setValorPago(String(d.valor ?? "")); }}>
                  <Check className="mr-1 h-4 w-4" /> Pagar
                </Button>
              </li>
            ))}
          </Bloco>
        </main>
      </div>

      <Dialog open={!!pagando} onOpenChange={(aberto) => !aberto && setPagando(null)}>
        <DialogContent className="bg-card sm:max-w-md">
          {pagando && (
            <>
              <DialogHeader>
                <DialogTitle>Pagar {pagando.num_desp}</DialogTitle>
                <DialogDescription>{pagando.descricao}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>De qual conta sai o recurso?</Label>
                  <ContaBancariaSelect value={conta} onChange={setConta} />
                </div>
                <div className="space-y-2">
                  <Label>Valor pago (R$)</Label>
                  <Input type="number" step="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPagando(null)}>Cancelar</Button>
                  <Button onClick={confirmarPagamento} disabled={processando}>{processando ? "Processando..." : "Confirmar pagamento"}</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
