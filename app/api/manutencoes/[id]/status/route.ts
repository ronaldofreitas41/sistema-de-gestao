import { NextRequest } from "next/server";
import { alterarStatusOS } from "@/lib/os-service";
import { respostaErro, serializar } from "@/lib/medicao-service";

type Context = { params: Promise<{ id: string }> };

/** POST { status: "aberta" | "finalizada" } — troca o status da OS sem abrir a edição. */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    return Response.json(serializar(await alterarStatusOS(id, body.status, request)));
  } catch (erro) {
    return respostaErro(erro);
  }
}
