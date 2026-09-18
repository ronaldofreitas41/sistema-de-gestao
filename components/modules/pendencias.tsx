"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, Menu, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Despesa } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function Pendencias() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function carregarPendencias() {
    setCarregando(true);
    try {
      const response = await fetch("/api/pendencias");
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error);
      setDespesas(payload.data || []);
    } catch (error) {
      console.error("Erro ao carregar pendências:", error);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarPendencias();
  }, []);

  async function marcarComoPaga(id: string) {
    setPagandoId(id);
    try {
      const response = await fetch("/api/pendencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ despesaId: id }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error);
      }

      setDespesas((atuais) => atuais.filter((despesa) => despesa.id !== id));
    } catch (error) {
      console.error("Erro ao marcar pendência como paga:", error);
    } finally {
      setPagandoId(null);
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
              className="absolute left-[calc(100%+12px)] top-4 rounded-lg bg-card p-2 text-foreground shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className={`min-h-screen transition-[padding-left] duration-300 ${sidebarCollapsed ? "md:pl-18" : "md:pl-65"}`}>
        <header className="sticky top-0 z-30 flex min-h-20 items-center gap-3 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-9">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            className="rounded-xl border border-border bg-card p-2 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight sm:text-2xl">Pendências</h1>
            <p className="text-sm text-muted-foreground">Contas a pagar em aberto neste mês</p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-9">
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <CircleAlert className="h-5 w-5 shrink-0" />
            <span>Ao pagar uma ajuda recorrente, a próxima referência passa a ser a data de hoje.</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesas.map((despesa) => (
                  <TableRow key={despesa.id} className="border-border">
                    <TableCell className="font-medium">{despesa.descricao}</TableCell>
                    <TableCell>{despesa.categoria}</TableCell>
                    <TableCell>{formatDate(despesa.data_vencimento)}</TableCell>
                    <TableCell>{formatCurrency(Number(despesa.valor || 0))}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => marcarComoPaga(despesa.id)}
                        disabled={pagandoId === despesa.id}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        {pagandoId === despesa.id ? "Atualizando..." : "Marcar como paga"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!carregando && despesas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhuma conta pendente neste mês.
                    </TableCell>
                  </TableRow>
                )}
                {carregando && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Carregando pendências...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </main>
      </div>
    </div>
  );
}