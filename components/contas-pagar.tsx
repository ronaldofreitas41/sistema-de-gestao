"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  WalletCards,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContaPagar } from "@/lib/types";
import { fetcher, formatCurrency, formatDate, isVencida } from "@/lib/utils";
import type { ApiResponse } from "@/lib/types";

function getStatusLabel(status: unknown) {
  const value = String(status || "").toLowerCase();

  if (value.includes("pago")) return "Pago";
  if (value.includes("cancel")) return "Cancelado";
  if (value.includes("venc")) return "Vencido";

  return "Pendente";
}

function StatusBadge({
  status,
  vencimento,
}: {
  status?: string | null;
  vencimento?: string | null;
}) {
  const label = isVencida(vencimento) ? "Vencido" : getStatusLabel(status);

  if (label === "Pago") {
    return (
      <Badge className="border-green-200 bg-green-50 text-green-700 hover:bg-green-50">
        Pago
      </Badge>
    );
  }

  if (label === "Vencido") {
    return (
      <Badge className="border-red-200 bg-red-50 text-red-600 hover:bg-red-50">
        Vencido
      </Badge>
    );
  }

  if (label === "Cancelado") {
    return (
      <Badge variant="secondary" className="text-muted-foreground">
        Cancelado
      </Badge>
    );
  }

  return (
    <Badge className="border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-50">
      <span className="mr-1">⌛</span>
      Pendente
    </Badge>
  );
}

function getDescricao(conta: ContaPagar) {
  return conta.descricao || "Sem descrição";
}

function getValor(conta: ContaPagar) {
  return formatCurrency(Number(conta.valor));
}

function getTipo(conta: ContaPagar) {
  return conta.tipo || "Antigo";
}

export default function ContasPagar() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("aberto");
  const [ordenacao, setOrdenacao] = useState("crescente");

  const endpoint = `/api/contas-pagar?page=1&limit=100${
    search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""
  }`;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    endpoint,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const contas = useMemo(() => {
    const registros = Array.isArray(data?.data) ? data.data : [];

    const filtradas = registros.filter((conta) => {
      const contaStatus = getStatusLabel(conta.status);

      if (status === "aberto") {
        return contaStatus === "Pendente" || contaStatus === "Vencido";
      }

      if (status === "pagos") {
        return contaStatus === "Pago";
      }

      if (status === "vencidos") {
        return contaStatus === "Vencido";
      }

      return true;
    });

    return [...filtradas].sort((a, b) => {
      const dateA = new Date(String(a.vencimento || "")).getTime();
      const dateB = new Date(String(b.vencimento || "")).getTime();

      return ordenacao === "crescente" ? dateA - dateB : dateB - dateA;
    });
  }, [data?.data, status, ordenacao]);

  const total = contas.reduce((acc, conta) => {
    const valor =
      typeof conta.valor === "number"
        ? conta.valor
        : Number(String(conta.valor ?? "0").replace(",", "."));

    return acc + (Number.isNaN(valor) ? 0 : valor);
  }, 0);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900">
      <div className="fixed inset-y-0 left-0 z-40 hidden md:flex">
        <Sidebar />
      </div>

      <div className="min-h-screen md:pl-55">
        {/* Cabeçalho semelhante à impressão */}
        <header className="sticky top-0 z-30 flex h-15 items-center justify-between border-b bg-white px-5 shadow-sm">
          <div className="flex items-center gap-6">
            <h1 className="text-[17px] font-bold text-slate-900">
              Contas a Pagar
            </h1>

            <div className="relative hidden w-55 sm:block">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sky-500" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar placa, cliente, os..."
                className="h-8 rounded-full border-slate-200 bg-slate-50 pl-8 text-xs shadow-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] text-slate-500 sm:block">
              {new Date().toLocaleDateString("pt-BR")}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-slate-200"
            >
              <Receipt className="h-3.5 w-3.5 text-sky-600" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-green-200 bg-green-50 px-3 text-xs text-green-600 hover:bg-green-100"
            >
              <WalletCards className="mr-1.5 h-3.5 w-3.5" />
              Seguro
            </Button>
          </div>
        </header>

        <main className="p-5">
          {/* Filtros */}
          <div className="mb-3 space-y-2">
            <div className="relative max-w-100">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente, placa, fornecedor, descrição..."
                className="h-9 border-slate-200 bg-white pl-9 text-xs shadow-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500">Mostrar:</label>

              <Select
                value={status}
                onValueChange={(value) => {
                  if (value) {
                    setStatus(value);
                  }
                }}
              >
                <SelectTrigger className="h-8 w-full border-slate-200 bg-white text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="aberto">Em aberto</SelectItem>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="pagos">Pagas</SelectItem>
                  <SelectItem value="vencidos">Vencidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="text-red-500">▼</span>
                Vencimento:
              </label>

              <Select
                value={ordenacao}
                onValueChange={(value) => {
                  if (value) {
                    setOrdenacao(value);
                  }
                }}
              >
                <SelectTrigger className="h-8 w-full border-slate-200 bg-white text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="crescente">
                    Crescente (mais próximo primeiro)
                  </SelectItem>

                  <SelectItem value="decrescente">
                    Decrescente (mais distante primeiro)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela principal */}
          <Card className="overflow-hidden rounded-lg border-slate-200 bg-white py-0 shadow-sm">
            <CardHeader className="flex min-h-12 flex-row items-center justify-between gap-3 border-b bg-white px-4 py-2">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <span>💸</span>
                  Contas a Pagar
                </CardTitle>

                <Button
                  size="sm"
                  className="h-7 rounded-full bg-red-600 px-3 text-[11px] font-bold hover:bg-red-700"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Despesa
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 border-orange-200 bg-orange-50 px-3 text-[11px] text-orange-600 hover:bg-orange-100"
                >
                  <Download className="mr-1 h-3 w-3" />
                  Importar
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 border-red-200 bg-red-50 px-3 text-[11px] text-red-500 hover:bg-red-100"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Limpar Tudo
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  Carregando contas...
                </div>
              ) : error ? (
                <div className="p-10 text-center">
                  <p className="font-medium text-red-600">
                    Não foi possível carregar as contas.
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Verifique o endpoint da API e o token de autenticação.
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => mutate()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : contas.length === 0 ? (
                <div className="p-10 text-center">
                  <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />

                  <p className="font-medium text-slate-700">
                    Nenhuma conta encontrada
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Os registros aparecerão aqui quando forem cadastrados.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-262">
                    <TableHeader>
                      <TableRow className="border-b bg-slate-50 hover:bg-slate-50">
                        <TableHead className="h-8 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          Descrição
                        </TableHead>

                        <TableHead className="h-8 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          Tipo
                        </TableHead>

                        <TableHead className="h-8 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          Fornecedor
                        </TableHead>

                        <TableHead className="h-8 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          Vencimento
                        </TableHead>

                        <TableHead className="h-8 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          Valor
                        </TableHead>

                        <TableHead className="h-8 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          Status
                        </TableHead>

                        <TableHead className="h-8 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          Ação
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {contas.map((conta, index) => (
                        <TableRow
                          key={String(conta.id ?? index)}
                          className="h-12 border-b border-slate-200 hover:bg-slate-50"
                        >
                          <TableCell className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] text-blue-600"
                              >
                                DP-{conta.id}
                              </Badge>

                              <span className="max-w-90 truncate text-xs font-bold uppercase text-slate-800">
                                {getDescricao(conta)}
                              </span>

                              <Badge
                                variant="secondary"
                                className="rounded-full bg-slate-100 px-1.5 py-0 text-[8px] text-slate-500"
                              >
                                ANTIGO
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell className="px-3 py-2">
                            <Badge
                              variant="secondary"
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-500"
                            >
                              {getTipo(conta)}
                            </Badge>
                          </TableCell>

                          <TableCell className="px-3 py-2 text-xs text-slate-600">
                            {conta.fornecedor || "—"}
                          </TableCell>

                          <TableCell
                            className={`px-3 py-2 text-xs font-medium ${
                              isVencida(conta.vencimento)
                                ? "font-bold text-red-600"
                                : "text-slate-700"
                            }`}
                          >
                            {formatDate(conta.vencimento)}
                          </TableCell>

                          <TableCell className="px-3 py-2 text-xs font-semibold text-red-600">
                            {getValor(conta)}
                          </TableCell>

                          <TableCell className="px-3 py-2">
                            <StatusBadge
                              status={conta.status}
                              vencimento={conta.vencimento}
                            />
                          </TableCell>

                          <TableCell className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 rounded-full border-cyan-200 bg-cyan-50 text-cyan-600 hover:bg-cyan-100"
                                title="Visualizar"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 rounded-full border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100"
                                title="Baixar"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-full border-slate-200 px-2 text-[10px] text-slate-600"
                              >
                                ✓ Baixar
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 rounded-full border-orange-200 bg-orange-50 text-orange-500 hover:bg-orange-100"
                                title="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 rounded-full border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Visualizar detalhes
                                  </DropdownMenuItem>

                                  <DropdownMenuItem>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar conta
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir conta
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Rodapé */}
              <div className="flex flex-col justify-between gap-2 border-t bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center">
                <span>{contas.length} registro(s) encontrado(s)</span>

                <span className="font-semibold text-slate-700">
                  Total: {formatCurrency(total)}
                </span>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
