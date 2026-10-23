"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { registerOrientacaoPdfHandler, type OrientacaoPdf } from "@/lib/pdf/orientacao";

const CHAVE_PREFERENCIA = "pdf-orientacao";

const OPCOES: { valor: OrientacaoPdf; rotulo: string; largura: string; altura: string }[] = [
  { valor: "landscape", rotulo: "Paisagem", largura: "w-14", altura: "h-10" },
  { valor: "portrait", rotulo: "Retrato", largura: "w-10", altura: "h-14" },
];

function lerPreferencia(): OrientacaoPdf {
  try {
    return window.localStorage.getItem(CHAVE_PREFERENCIA) === "portrait" ? "portrait" : "landscape";
  } catch {
    return "landscape";
  }
}

/** Modal único usado por todos os downloads de PDF para escolher paisagem ou retrato. */
export function OrientacaoPdfProvider({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [escolha, setEscolha] = useState<OrientacaoPdf>("landscape");
  const resolverRef = useRef<((orientacao: OrientacaoPdf | null) => void) | null>(null);

  const concluir = useCallback((orientacao: OrientacaoPdf | null) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setAberto(false);
    if (orientacao) {
      try {
        window.localStorage.setItem(CHAVE_PREFERENCIA, orientacao);
      } catch {
        // Sem armazenamento, a escolha só vale para este PDF.
      }
    }
    resolver?.(orientacao);
  }, []);

  const abrir = useCallback((resolver: (orientacao: OrientacaoPdf | null) => void) => {
    if (resolverRef.current) {
      resolver(null);
      return;
    }
    resolverRef.current = resolver;
    setEscolha(lerPreferencia());
    setAberto(true);
  }, []);

  useEffect(() => registerOrientacaoPdfHandler(abrir), [abrir]);
  useEffect(() => () => resolverRef.current?.(null), []);

  return (
    <>
      {children}
      <Dialog open={aberto} onOpenChange={(novoEstado) => !novoEstado && concluir(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Orientação do PDF</DialogTitle>
            <DialogDescription>Escolha como a página será montada.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Orientação do PDF">
            {OPCOES.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                role="radio"
                aria-checked={escolha === opcao.valor}
                onClick={() => setEscolha(opcao.valor)}
                onDoubleClick={() => concluir(opcao.valor)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors",
                  escolha === opcao.valor
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="flex h-14 items-center justify-center">
                  <span className={cn("rounded-sm border-2 border-current", opcao.largura, opcao.altura)} />
                </span>
                {opcao.rotulo}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => concluir(null)}>
              Cancelar
            </Button>
            <Button type="button" autoFocus onClick={() => concluir(escolha)}>
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
