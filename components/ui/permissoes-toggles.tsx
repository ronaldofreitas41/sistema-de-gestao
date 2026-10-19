"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { navGroups, permissoesExtras } from "@/lib/common";
import type { Permissoes } from "@/lib/types";

interface PermissoesTogglesProps {
  permissoes: Permissoes;
  onChange: (permissoes: Permissoes) => void;
}

const acoesGenericas = [
  { sufixo: "", label: "Acesso" },
  { sufixo: ":editar", label: "Editar" },
  { sufixo: ":excluir", label: "Excluir" },
];

/** Chaves de um módulo: acesso + (extras específicos ou editar/excluir genéricos). */
function chavesDoModulo(resource: string) {
  const extras = permissoesExtras[resource];
  return extras
    ? [resource, ...extras.map((extra) => extra.chave)]
    : acoesGenericas.map(({ sufixo }) => `${resource}${sufixo}`);
}

export function PermissoesToggles({
  permissoes,
  onChange,
}: PermissoesTogglesProps) {
  function alterarPermissoes(chaves: string[], valor: boolean) {
    onChange({
      ...permissoes,
      ...Object.fromEntries(chaves.map((chave) => [chave, valor])),
    });
  }

  return (
    <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
      {navGroups.map((grupo) => {
        const modulos = grupo.items.filter((item) => item.resource);
        if (modulos.length === 0) return null;

        const chavesDoBloco = modulos.flatMap((item) => chavesDoModulo(item.resource as string));
        const blocoMarcado = chavesDoBloco.every((chave) => permissoes[chave] === true);
        const idBloco = `permissao-bloco-${grupo.label}`;

        return (
          <section key={grupo.label} className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={idBloco} className="text-sm font-semibold uppercase tracking-wide text-primary">
                {grupo.label}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Marcar bloco</span>
                <Switch
                  id={idBloco}
                  aria-label={`Marcar todo o bloco ${grupo.label}`}
                  checked={blocoMarcado}
                  onCheckedChange={(novoValor) => alterarPermissoes(chavesDoBloco, novoValor)}
                />
              </div>
            </div>

            {modulos.map(({ resource, label }) => {
              const nomeModulo = label.trim();
              const extras = permissoesExtras[resource as string];

              if (extras) {
                return (
                  <div
                    key={resource}
                    className="space-y-2 rounded-xl border border-border bg-background px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor={`permissao-${resource}`} className="text-sm font-medium">
                        {nomeModulo}
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Acesso</span>
                        <Switch
                          id={`permissao-${resource}`}
                          aria-label={`Acesso - ${nomeModulo}`}
                          checked={permissoes[resource as string] === true}
                          onCheckedChange={(novoValor) => alterarPermissoes([resource as string], novoValor)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {extras.map(({ chave, label: acao }) => (
                        <div
                          key={chave}
                          className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5"
                        >
                          <Label htmlFor={`permissao-${chave}`} className="text-xs font-normal">
                            {acao}
                          </Label>
                          <Switch
                            id={`permissao-${chave}`}
                            aria-label={`${acao} - ${nomeModulo}`}
                            checked={permissoes[chave] === true}
                            onCheckedChange={(novoValor) => alterarPermissoes([chave], novoValor)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={resource}
                  className="grid grid-cols-[minmax(0,1fr)_60px_60px_60px] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
                >
                  <Label className="truncate text-sm font-normal">{nomeModulo}</Label>
                  {acoesGenericas.map(({ sufixo, label: acao }) => {
                    const nome = `${resource}${sufixo}`;

                    return (
                      <div key={nome} className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground">{acao}</span>
                        <Switch
                          id={`permissao-${nome}`}
                          aria-label={`${acao} - ${nomeModulo}`}
                          checked={permissoes[nome] === true}
                          onCheckedChange={(novoValor) => alterarPermissoes([nome], novoValor)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
