import { prisma } from "./prisma";
import { obterAtor } from "./audit";
import { ErroNegocio } from "./medicao-service";
import { permissoesPadrao } from "./common";
import bcrypt from "bcryptjs";

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

export async function validarAutorizacaoExclusao(request?: Request): Promise<Response | null> {
  const sessao = request ? await carregarSessao(request) : null;
  if (!request || !sessao) {
    return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return Response.json({ error: "Informe a sua senha para excluir." }, { status: 400 });
  }

  const senha =
    body && typeof body === "object" && !Array.isArray(body) && typeof (body as { senha?: unknown }).senha === "string"
      ? (body as { senha: string }).senha
      : "";
  if (!senha) {
    return Response.json({ error: "Informe a sua senha para excluir." }, { status: 400 });
  }

  // A senha conferida é sempre a do próprio usuário logado.
  const usuario = await prisma.mh3_usuarios.findUnique({
    where: { id: sessao.id },
    select: { senha: true },
  });
  const senhaArmazenada = String(usuario?.senha ?? "");
  const senhaValida = !senhaArmazenada
    ? false
    : senhaArmazenada.startsWith("$2")
      ? await bcrypt.compare(senha, senhaArmazenada)
      : senha === senhaArmazenada;
  if (!senhaValida) {
    return Response.json({ error: "Senha incorreta. A exclusão não foi realizada." }, { status: 401 });
  }

  if (!sessao.admin && sessao.permissoes["exclusao:autorizar"] !== true) {
    return Response.json({ error: "Seu usuário não tem permissão para excluir registros." }, { status: 403 });
  }

  return null;
}
