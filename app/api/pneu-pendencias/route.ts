import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { respostaErro, serializar } from "@/lib/medicao-service";

/** GET ?status=pendente|concluida|todas (padrão: pendente) */
export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status") ?? "pendente";
    const data = await prisma.mh3_pneu_pendencias.findMany({
      where: status === "todas" ? undefined : { status },
      orderBy: { id: "desc" },
      take: 500,
    });
    return Response.json(serializar({ data }));
  } catch (erro) {
    return respostaErro(erro);
  }
}
