import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPermissao } from "@/lib/permissoes-server";
import { respostaErro, serializar } from "@/lib/medicao-service";
import { criarRomaneio } from "@/lib/pneus-service";

/** Lista os romaneios com seus itens (e os dados dos pneus). */
export async function GET() {
  try {
    const romaneios = await prisma.mh3_romaneios.findMany({ orderBy: { id: "desc" }, take: 500 });
    const itens = await prisma.mh3_romaneio_itens.findMany({
      where: { romaneio_id: { in: romaneios.map((r) => r.id) } },
    });
    const pneus = await prisma.mh3_pneus.findMany({
      where: { id: { in: [...new Set(itens.map((i) => i.pneu_id))] } },
    });
    const data = romaneios.map((r) => ({
      ...r,
      itens: itens
        .filter((i) => i.romaneio_id === r.id)
        .map((i) => ({ ...i, pneu: pneus.find((p) => p.id === i.pneu_id) ?? null })),
    }));
    return Response.json(serializar({ data }));
  } catch (erro) {
    return respostaErro(erro);
  }
}

/** POST { reformadora, data_saida, previsao_retorno, observacoes, pneu_ids } — não baixa o estoque. */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    await exigirPermissao(request, "pneus-romaneio", "criar romaneios");
    return Response.json(serializar(await criarRomaneio(body, request)), { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
