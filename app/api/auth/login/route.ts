import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = String(body.login ?? "").trim();
    const senha = String(body.senha ?? "");

    if (!login || !senha) {
      return NextResponse.json({ success: false, message: "Login e senha são obrigatórios." }, { status: 400 });
    }

    const usuario = await (prisma as any).mh3_usuarios.findUnique({ where: { login } });

    if (!usuario) {
      return NextResponse.json({ success: false, message: "Login ou senha inválidos." }, { status: 401 });
    }

    if (!usuario.ativo) {
      return NextResponse.json({ success: false, message: "Usuário está inativo." }, { status: 403 });
    }

    const senhaValida = await bcrypt.compare(senha, String(usuario.senha ?? ""));
    if (!senhaValida) {
      return NextResponse.json({ success: false, message: "Login ou senha inválidos." }, { status: 401 });
    }

    await (prisma as any).mh3_usuarios.update({
      where: { login },
      data: { ultimo_login: new Date() },
    });

    const token = await createToken({
      usuarioId: String(usuario.id),
      empresaId: usuario.empresa_id == null ? null : Number(usuario.empresa_id),
      login: String(usuario.login),
      nome: String(usuario.nome),
      perfil: String(usuario.perfil ?? "operacional"),
    });

    const response = NextResponse.json({
      success: true,
      message: "Login realizado com sucesso.",
      token,
      expiresIn: "24h",
      usuario: {
        id: String(usuario.id),
        empresa_id: usuario.empresa_id,
        nome: usuario.nome,
        login: usuario.login,
        perfil: usuario.perfil,
        permissoes: usuario.permissoes,
      },
    });

    // Cookie HttpOnly é usado pelo middleware para proteger as páginas.
    // As APIs, por sua vez, exigem Authorization: Bearer <token>.
    response.cookies.set({
      name: "mh3_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json({ success: false, message: "Erro interno ao realizar login." }, { status: 500 });
  }
}
