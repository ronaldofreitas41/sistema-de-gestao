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
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const resolverRef = useRef<((authorization: DeleteAuthorization | null) => void) | null>(null);

  const concluir = useCallback((authorization: DeleteAuthorization | null) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setLogin("");
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
    concluir({ login: login.trim(), senha });
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
              Informe o login e a senha de um usuário autorizado para confirmar esta exclusão.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={autorizar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="autorizador-login">Login do autorizador</Label>
              <Input
                id="autorizador-login"
                autoComplete="username"
                autoFocus
                required
                value={login}
                onChange={(event) => setLogin(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="autorizador-senha">Senha</Label>
              <Input
                id="autorizador-senha"
                type="password"
                autoComplete="current-password"
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
