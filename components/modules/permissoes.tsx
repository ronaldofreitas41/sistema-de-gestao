"use client";

import { useEffect, useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PermissoesToggles } from "@/components/ui/permissoes-toggles";
import { permissoesModulosPadrao } from "@/lib/common";
import { normalizarPermissoes } from "@/lib/utils";
import type { Permissoes, Usuario } from "@/lib/types";

export function Permissoes() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioId, setUsuarioId] = useState("");
  const [permissoes, setPermissoes] = useState<Permissoes>(permissoesModulosPadrao);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const response = await fetch("/api/usuarios");
    const payload = await response.json();
    const lista = Array.isArray(payload) ? payload : payload.data || [];
    setUsuarios(lista);
    if (!usuarioId && lista[0]) setUsuarioId(String(lista[0].id));
  }

  useEffect(() => { carregar().catch(console.error); }, []);

  const usuarioSelecionado = usuarios.find((usuario) => String(usuario.id) === usuarioId);

  useEffect(() => {
    setPermissoes({ ...permissoesModulosPadrao, ...normalizarPermissoes(usuarioSelecionado?.permissoes) });
  }, [usuarioSelecionado]);

  async function salvar() {
    if (!usuarioSelecionado || salvando) return;
    setSalvando(true);
    try {
      const response = await fetch(`/api/usuarios/${usuarioSelecionado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissoes: JSON.stringify(permissoes) }),
      });
      if (!response.ok) throw new Error("Não foi possível salvar as permissões.");
      await carregar();
      alert("Permissões salvas com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Não foi possível salvar as permissões.");
    } finally {
      setSalvando(false);
    }
  }

  return <div className="min-h-screen bg-background p-4 text-foreground sm:p-6 lg:p-9"><div className="mx-auto w-full max-w-4xl space-y-6"><div><p className="mb-1 text-sm font-medium text-primary">Configurações</p><h1 className="text-3xl font-bold tracking-tight">Permissões de usuários</h1><p className="mt-2 text-sm text-muted-foreground">Defina os módulos e ações disponíveis para cada usuário.</p></div><Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Usuário</CardTitle></CardHeader><CardContent><Label htmlFor="usuario">Selecionar usuário</Label><Select value={usuarioId} onValueChange={setUsuarioId}><SelectTrigger id="usuario" className="mt-2"><SelectValue placeholder="Selecione um usuário" /></SelectTrigger><SelectContent>{usuarios.map((usuario) => <SelectItem key={String(usuario.id)} value={String(usuario.id)}>{usuario.nome} ({usuario.login})</SelectItem>)}</SelectContent></Select></CardContent></Card><Card><CardHeader><CardTitle>Permissões de acesso</CardTitle></CardHeader><CardContent className="space-y-4"><PermissoesToggles permissoes={permissoes} onChange={setPermissoes} /><div className="flex justify-end"><Button onClick={salvar} disabled={!usuarioSelecionado || salvando}><Save className="mr-2 h-4 w-4" />{salvando ? "Salvando..." : "Salvar permissões"}</Button></div></CardContent></Card></div></div>;
}
