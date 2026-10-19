"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type OpcaoStatus = {
  value: string;
  label: string;
  /** Classes de cor do selo (fundo + texto). */
  cor: string;
};

type StatusSelectProps = {
  value: string;
  opcoes: OpcaoStatus[];
  /** Deve lançar erro se a troca falhar; o seletor volta ao valor anterior. */
  onChange: (novo: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
};

/** Selo de status que muda o status direto na lista, sem abrir a edição do registro. */
export function StatusSelect({ value, opcoes, onChange, disabled, className }: StatusSelectProps) {
  const [salvando, setSalvando] = useState(false);
  const atual = opcoes.find((opcao) => opcao.value === value);

  async function trocar(novo: string) {
    if (novo === value) return;
    setSalvando(true);
    try {
      await onChange(novo);
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Não foi possível alterar o status.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <select
      value={value}
      disabled={disabled || salvando}
      onChange={(event) => trocar(event.target.value)}
      aria-label="Alterar status"
      title="Alterar status"
      className={cn(
        "cursor-pointer rounded-full border-0 px-2 py-1 text-xs font-semibold outline-none focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
        atual?.cor ?? "bg-slate-100 text-slate-700",
        className,
      )}
    >
      {!atual && <option value={value}>{value || "—"}</option>}
      {opcoes.map((opcao) => (
        <option key={opcao.value} value={opcao.value} className="bg-white text-slate-900">
          {opcao.label}
        </option>
      ))}
    </select>
  );
}
