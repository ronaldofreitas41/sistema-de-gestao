import { NextRequest } from "next/server";
import {
  estornarRecebimento,
  marcarAtrasada,
  receberConta,
  remarcarConta,
} from "@/lib/financeiro-service";
import { respostaErro, retornarMedicao, serializar } from "@/lib/medicao-service";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

/** POST { acao: "receber" | "estornar" | "remarcar" | "atrasado" | "retornar_medicao", ... } */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    switch (body.acao) {
      case "receber":
        return Response.json(serializar(await receberConta(id, body, request)));
      case "estornar":
        return Response.json(serializar(await estornarRecebimento(id, body.motivo, request)));
      case "remarcar":
        return Response.json(serializar(await remarcarConta(id, body.nova_data, body.motivo, request)));
      case "atrasado":
        return Response.json(serializar(await marcarAtrasada(id, body.motivo, request)));
      case "retornar_medicao": {
        const conta = await prisma.mh3_contas_receber.findUnique({ where: { id } });
        if (!conta?.medicao_id) {
          return Response.json({ error: "Esta conta não veio de uma medição." }, { status: 400 });
        }
        await retornarMedicao(conta.medicao_id, String(body.motivo ?? ""), request);
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: "Ação inválida." }, { status: 400 });
    }
  } catch (erro) {
    return respostaErro(erro);
  }
}
