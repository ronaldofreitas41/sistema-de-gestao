import { permissoesPadrao } from "./common";
import { normalizarPermissoes } from "./utils";
import type { Usuario } from "./types";

/** Usuário gravado no sessionStorage no login (null fora do navegador ou sem sessão). */
export function usuarioLogado(): Usuario | null {
  try {
    const bruto = sessionStorage.getItem("mh3_usuario");
    return bruto ? (JSON.parse(bruto) as Usuario) : null;
  } catch {
    return null;
  }
}

/** Mesma regra do servidor: admin sempre pode; senão vale a chave do usuário ou o padrão. */
export function usuarioPode(usuario: Usuario | null, chave: string) {
  if (!usuario) return false;
  if (String(usuario.perfil ?? "").toLowerCase() === "admin") return true;
  const permissoes = normalizarPermissoes(usuario.permissoes);
  if (Object.prototype.hasOwnProperty.call(permissoes, chave)) return permissoes[chave] === true;
  return permissoesPadrao[chave] === true;
}
