import { NextRequest } from "next/server";
import { carregarSessao, sessaoPode } from "@/lib/permissoes-server";
import { ErroNegocio, respostaErro, serializar } from "@/lib/medicao-service";
import { PERMISSAO_RELATORIO, TIPOS_RELATORIO, gerarRelatorio, lerFiltro, type TipoRelatorio } from "@/lib/relatorios-service";

/** GET ?tipo=&inicio=YYYY-MM-DD&fim=YYYY-MM-DD&empresa=<id opcional>
 *  Sem `tipo` devolve a lista de relatórios liberados para o usuário. */
export async function GET(request: NextRequest) {
  try {
    const sessao = await carregarSessao(request);
    if (!sessao) return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
    if (!sessaoPode(sessao, "rel") && !TIPOS_RELATORIO.some((t) => PERMISSAO_RELATORIO[t].some((c) => sessaoPode(sessao, c)))) {
      throw new ErroNegocio(403, "Você não tem permissão para ver relatórios.");
    }
    const liberados = TIPOS_RELATORIO.filter((t) => PERMISSAO_RELATORIO[t].some((c) => sessaoPode(sessao, c)));
    const params = request.nextUrl.searchParams;
    const tipo = params.get("tipo");
    if (!tipo) return Response.json({ tipos: liberados });
    if (!TIPOS_RELATORIO.includes(tipo as TipoRelatorio)) throw new ErroNegocio(400, "Relatório inválido.");
    if (!liberados.includes(tipo as TipoRelatorio)) throw new ErroNegocio(403, "Você não tem permissão para este relatório.");

    const relatorio = await gerarRelatorio(tipo as TipoRelatorio, lerFiltro(params), {
      pagar: sessaoPode(sessao, "rel-cpagar"),
      receber: sessaoPode(sessao, "rel-creceber"),
    });
    return Response.json(serializar(relatorio));
  } catch (erro) {
    return respostaErro(erro);
  }
}
