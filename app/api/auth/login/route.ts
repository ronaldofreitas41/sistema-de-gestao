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
      return NextResponse.json(
        {
          success: false,
          message: "Login e senha são obrigatórios.",
        },
        { status: 400 }
      );
    }

    const usuario = await prisma.mh3Usuarios.findUnique({
      where: {
        login,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        {
          success: false,
          message: "Login ou senha inválidos.",
        },
        { status: 401 }
      );
    }

    if (!usuario.ativo) {
      return NextResponse.json(
        {
          success: false,
          message: "Usuário está inativo.",
        },
        { status: 403 }
      );
    }

    const senhaValida = await bcrypt.compare(
      senha,
      usuario.senha
    );

    if (!senhaValida) {
      return NextResponse.json(
        {
          success: false,
          message: "Login ou senha inválidos.",
        },
        { status: 401 }
      );
    }

    await prisma.mh3Usuarios.update({
      where: {
        login,
      },
      data: {
        ultimo_login: new Date(),
      },
    });

    const token = await createToken({
      usuarioId: String(usuario.id),
      empresaId: usuario.empresa_id
        ? Number(usuario.empresa_id)
        : null,
      login: usuario.login,
      nome: usuario.nome,
      perfil: usuario.perfil,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login realizado com sucesso.",
      usuario: {
        id: String(usuario.id),
        empresa_id: usuario.empresa_id,
        nome: usuario.nome,
        login: usuario.login,
        perfil: usuario.perfil,
        permissoes: usuario.permissoes,
      },
    });

    response.cookies.set({
      name: "mh3_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Erro no login:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro interno ao realizar login.",
      },
      { status: 500 }
    );
  }
}