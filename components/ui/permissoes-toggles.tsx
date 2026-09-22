"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { modulosPermissoes } from "@/lib/common";
import type { Permissoes } from "@/lib/types";

interface PermissoesTogglesProps {
  permissoes: Permissoes;
  onChange: (permissoes: Permissoes) => void;
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
    <div className="max-h-80 space-y-2 overflow-y-auto pr-2">
      <div className="grid grid-cols-[minmax(0,1fr)_70px_70px_70px] items-center gap-2 px-3 text-xs font-semibold text-muted-foreground">
        <span>Módulo</span>
        <span className="text-center">Acesso</span>
        <span className="text-center">Editar</span>
        <span className="text-center">Excluir</span>
      </div>
      {modulosPermissoes.map(({ resource, label }) => {
        const permissoesDoModulo = [
          { sufixo: "", label: "Acesso" },
          { sufixo: ":editar", label: "Editar" },
          { sufixo: ":excluir", label: "Excluir" },
        ];

        return (
          <div
            key={resource}
            className="grid grid-cols-[minmax(0,1fr)_70px_70px_70px] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
          >
            <Label className="truncate text-sm font-normal">{label}</Label>
            {permissoesDoModulo.map(({ sufixo, label: acao }) => {
              const nome = `${resource}${sufixo}`;

              return (
                <div key={nome} className="flex justify-center">
                  <Switch
                    id={`permissao-${nome}`}
                    aria-label={`${acao} - ${label}`}
                    checked={Boolean(permissoes[nome])}
                    onCheckedChange={(novoValor) =>
                      alterarPermissao(nome, novoValor)
                    }
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}