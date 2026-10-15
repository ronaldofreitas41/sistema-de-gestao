import { prisma } from "./prisma";
import { obterAtor } from "./audit";
import { ErroNegocio } from "./medicao-service";
import { permissoesPadrao } from "./common";

type Permissoes = Record<string, boolean>;

function lerPermissoes(texto: string | null | undefined): Permissoes {
  if (!texto) return {};
  try {
    const dados = JSON.parse(texto);
    return dados && typeof dados === "object" && !Array.isArray(dados) ? (dados as Permissoes) : {};
  } catch {
    return {};
  }
}

export type Sessao = {
  id: string;
  nome: string;
  admin: boolean;
  permissoes: Permissoes;
};

export async function carregarSessao(request?: Request): Promise<Sessao | null> {
  const ator = await obterAtor(request);
  if (!ator.id) return null;
  const usuario = await prisma.mh3_usuarios.findUnique({
    where: { id: ator.id },
    select: { nome: true, perfil: true, permissoes: true, ativo: true },
  });
  if (!usuario || usuario.ativo === false) return null;
  return {
    id: ator.id,
    nome: usuario.nome,
    admin: String(usuario.perfil ?? "").toLowerCase() === "admin",
    permissoes: lerPermissoes(usuario.permissoes),
  };
}

/** Administrador sempre pode; os demais precisam da chave liberada (ou liberada por padrão). */
export function sessaoPode(sessao: Sessao | null, chave: string) {
  if (!sessao) return false;
  if (sessao.admin) return true;
  if (Object.prototype.hasOwnProperty.call(sessao.permissoes, chave)) return sessao.permissoes[chave] === true;
  return permissoesPadrao[chave] === true;
}

export async function exigirPermissao(request: Request | undefined, chave: string, acao: string) {
  const sessao = await carregarSessao(request);
  if (!sessao) throw new ErroNegocio(401, "Sessão expirada. Entre novamente.");
  if (!sessaoPode(sessao, chave)) {
    throw new ErroNegocio(403, `Você não tem permissão para ${acao}.`);
  }
  return sessao;
}
