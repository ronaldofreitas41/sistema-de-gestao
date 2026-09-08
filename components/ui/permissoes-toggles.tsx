"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { nomesPermissoes } from "@/lib/common";
import type { Permissoes } from "@/lib/types";

interface PermissoesTogglesProps {
  permissoes: Permissoes;
  onChange: (permissoes: Permissoes) => void;
}



function formatarNomePermissao(nome: string) {
  return (
    nomesPermissoes[nome] ||
    nome
      .replaceAll("-", " ")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letra) => letra.toUpperCase())
  );
}

export function PermissoesToggles({
  permissoes,
  onChange,
}: PermissoesTogglesProps) {
  function alterarPermissao(nome: string, valor: boolean) {
    onChange({
      ...permissoes,
      [nome]: valor,
    });
  }

  return (
    <div className="grid max-h-65 gap-2 overflow-y-auto pr-2 sm:grid-cols-2">
      {Object.entries(permissoes).map(([nome, valor]) => (
        <div
          key={nome}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3"
        >
          <Label
            htmlFor={`permissao-${nome}`}
            className="cursor-pointer text-sm font-normal"
          >
            {formatarNomePermissao(nome)}
          </Label>

          <Switch
            id={`permissao-${nome}`}
            checked={valor}
            onCheckedChange={(novoValor) =>
              alterarPermissao(nome, novoValor)
            }
          />
        </div>
      ))}
    </div>
  );
}