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
  if (!request || !(await carregarSessao(request))) {
    return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return Response.json(
      { error: "Informe o login e a senha de um usuário autorizado para excluir." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { error: "Informe o login e a senha de um usuário autorizado para excluir." },
      { status: 400 },
    );
  }

  const credenciais = body as { login?: unknown; senha?: unknown };
  const login = typeof credenciais.login === "string" ? credenciais.login.trim() : "";
  const senha = typeof credenciais.senha === "string" ? credenciais.senha : "";
  if (!login || !senha) {
    return Response.json(
      { error: "Informe o login e a senha de um usuário autorizado para excluir." },
      { status: 400 },
    );
  }

  const usuario = await prisma.mh3_usuarios.findUnique({
    where: { login },
    select: { senha: true, perfil: true, permissoes: true, ativo: true },
  });
  if (!usuario || usuario.ativo === false) {
    return Response.json({ error: "Login ou senha de autorização inválidos." }, { status: 401 });
  }

  const senhaArmazenada = String(usuario.senha ?? "");
  const senhaValida = senhaArmazenada.startsWith("$2")
    ? await bcrypt.compare(senha, senhaArmazenada)
    : senha === senhaArmazenada;
  if (!senhaValida) {
    return Response.json({ error: "Login ou senha de autorização inválidos." }, { status: 401 });
  }

  const administrador = String(usuario.perfil ?? "").toLowerCase() === "admin";
  const permissoes = lerPermissoes(usuario.permissoes);
  if (!administrador && permissoes["exclusao:autorizar"] !== true) {
    return Response.json(
      { error: "Este usuário não tem autorização para aprovar exclusões." },
      { status: 403 },
    );
  }

  return null;
}
