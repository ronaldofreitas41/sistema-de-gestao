import { NextRequest } from "next/server";
import { respostaErro, serializar } from "@/lib/medicao-service";
import { alterarStatusVenda } from "@/lib/venda-service";

type Context = { params: Promise<{ id: string }> };

/** POST { status: "pendente" | "faturada" | "cancelado" } — troca o status sem abrir a edição. */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    return Response.json(serializar(await alterarStatusVenda(id, body.status, request)));
  } catch (erro) {
    return respostaErro(erro);
  }
}
