"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ContaBancaria = { id: string | number; nome?: string | null; banco?: string | null; conta?: string | null };

/** Lista as contas bancárias cadastradas; value/onChange trabalham com o id em texto. */
export function ContaBancariaSelect({
  value,
  onChange,
  placeholder = "Selecionar conta bancária",
}: {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [contas, setContas] = useState<ContaBancaria[]>([]);

  useEffect(() => {
    fetch("/api/contas-bancarias", { credentials: "include" })
      .then((r) => r.json())
      .then((payload) => setContas(Array.isArray(payload) ? payload : payload?.data ?? []))
      .catch((erro) => console.error("Erro ao carregar contas bancárias:", erro));
  }, []);

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {contas.map((conta) => (
          <SelectItem key={conta.id} value={String(conta.id)}>
            {[conta.nome, conta.banco].filter(Boolean).join(" — ") || `Conta ${conta.id}`}
          </SelectItem>
        ))}
        {contas.length === 0 && (
          <SelectItem value="sem-contas" disabled>
            Nenhuma conta cadastrada
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
