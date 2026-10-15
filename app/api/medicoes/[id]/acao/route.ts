import { NextRequest } from "next/server";
import { aprovarMedicao, respostaErro, retornarMedicao } from "@/lib/medicao-service";

type Context = { params: Promise<{ id: string }> };

/** POST { acao: "aprovar" | "retornar", motivo? } */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Identificador da medição inválido." }, { status: 400 });
  }
  let body: { acao?: string; motivo?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    if (body.acao === "aprovar") {
      await aprovarMedicao(BigInt(id), request);
    } else if (body.acao === "retornar") {
      await retornarMedicao(BigInt(id), String(body.motivo ?? ""), request);
    } else {
      return Response.json({ error: "Ação inválida." }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (erro) {
    return respostaErro(erro);
  }
}
