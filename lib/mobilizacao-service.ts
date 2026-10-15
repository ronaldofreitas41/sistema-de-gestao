import { ErroNegocio } from "./medicao-service";

export const FIELDS_MOBILIZACAO = [
  "equipamento_id",
  "contrato_id",
  "contratante",
  "tipo",
  "tipo_equipamento",
  "data",
  "data_chegada",
  "local_origem",
  "local_destino",
  "marca_modelo",
  "ano",
  "km",
  "horimetro",
  "responsavel",
  "observacoes",
  "pneus_por_eixo",
  "estepe",
  "checklist_id",
  "fotos",
  "status",
  "ciclo",
];

const OBRIGATORIOS: [string, string][] = [
  ["contratante", "o contratante"],
  ["tipo", "o tipo (mobilização ou desmobilização)"],
  ["data", "a data"],
  ["marca_modelo", "a marca/modelo do equipamento"],
  ["local_origem", "o local de origem"],
  ["local_destino", "o local de destino"],
  ["responsavel", "o responsável"],
];

/**
 * A mobilização só é gravada completa: nada de lançamento incompleto para editar depois.
 * Em edições parciais (ex.: só o status) a validação é dispensada.
 */
export function validarMobilizacao(body: Record<string, unknown>, edicaoParcial = false) {
  if (edicaoParcial && !("contratante" in body) && !("data" in body)) return;
  const faltando = OBRIGATORIOS.filter(([campo]) => !String(body[campo] ?? "").trim()).map(([, rotulo]) => rotulo);
  if (faltando.length) {
    throw new ErroNegocio(400, `Preencha todos os dados antes de salvar. Falta informar: ${faltando.join(", ")}.`);
  }
}
