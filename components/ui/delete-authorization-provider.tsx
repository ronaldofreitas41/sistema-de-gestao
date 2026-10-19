"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DeleteAuthorization,
  registerDeleteAuthorizationHandler,
} from "@/lib/delete-authorization-client";

export function DeleteAuthorizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const resolverRef = useRef<((authorization: DeleteAuthorization | null) => void) | null>(null);

  const concluir = useCallback((authorization: DeleteAuthorization | null) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setSenha("");
    setAberto(false);
    resolver?.(authorization);
  }, []);

  const abrir = useCallback((resolver: (authorization: DeleteAuthorization | null) => void) => {
    if (resolverRef.current) {
      resolver(null);
      return;
    }
    resolverRef.current = resolver;
    setAberto(true);
  }, []);

  useEffect(
    () => registerDeleteAuthorizationHandler(abrir),
    [abrir],
  );

  useEffect(
    () => () => resolverRef.current?.(null),
    [],
  );

  function autorizar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    concluir({ senha });
  }

  return (
    <>
      {children}
      <Dialog
        open={aberto}
        onOpenChange={(novoEstado) => {
          if (!novoEstado) concluir(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Autorizar exclusão</DialogTitle>
            <DialogDescription>
              Para confirmar, digite a senha do seu usuário. Sem a senha correta, nada é excluído.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={autorizar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="autorizador-senha">Sua senha</Label>
              <Input
                id="autorizador-senha"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => concluir(null)}>
                Cancelar
              </Button>
              <Button type="submit">Confirmar exclusão</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
