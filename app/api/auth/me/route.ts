import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("mh3_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "Não autenticado.",
        },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "Sessão inválida ou expirada.",
        },
        { status: 401 }
      );
    }

    const usuario = await prisma.mh3Usuarios.findUnique({
      where: {
        id: payload.usuarioId,
      },
    });

    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "Usuário não encontrado ou inativo.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      usuario: {
        id: String(usuario.id),
        empresa_id: usuario.empresa_id,
        nome: usuario.nome,
        login: usuario.login,
        perfil: usuario.perfil,
        permissoes: usuario.permissoes,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);

    return NextResponse.json(
      {
        authenticated: false,
        message: "Erro ao verificar autenticação.",
      },
      { status: 500 }
    );
  }
}