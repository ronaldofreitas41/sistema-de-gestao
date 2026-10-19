import { NextRequest } from "next/server";
import { respostaErro, serializar } from "@/lib/medicao-service";
import { criarVenda, listarVendas } from "@/lib/venda-service";

export async function GET() {
  try {
    return Response.json({ data: serializar(await listarVendas()) });
  } catch (erro) {
    return respostaErro(erro);
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    return Response.json(serializar(await criarVenda(body, request)), { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
