import { NextRequest } from "next/server";
import { criarRegistro, list } from "@/lib/crud-prisma";
import { respostaErro, serializar } from "@/lib/medicao-service";
import { prepararSeguro, SEGURO_FIELDS } from "@/lib/seguro-service";

const TABLE = "mh3_seguros";

export async function GET(request: NextRequest) {
  return list(TABLE, request, ["seguradora", "numero_apolice", "status", "observacoes"]);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    const dados = await prepararSeguro(body);
    return Response.json(serializar(await criarRegistro(TABLE, SEGURO_FIELDS, dados, request)), { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
