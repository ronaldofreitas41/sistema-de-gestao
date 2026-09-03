import { NextRequest, NextResponse } from "next/server";
import { requireBearerAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireBearerAuth(request);
  if (!auth) {
    return NextResponse.json({ authenticated: false, message: "Bearer token ausente ou inválido." }, { status: 401 });
  }

  try {
    const usuario = await (prisma as any).mh3_usuarios.findUnique({ where: { id: auth.usuarioId } });

    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ authenticated: false, message: "Usuário não encontrado ou inativo." }, { status: 401 });
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
    return NextResponse.json({ authenticated: false, message: "Erro ao verificar autenticação." }, { status: 500 });
  }
}
