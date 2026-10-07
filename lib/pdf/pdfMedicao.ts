import { obterPlacasMedicao } from "@/lib/medicoes";

function escaparHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarValorPdf(valor: unknown): string {
  return `R$ ${(Number(valor) || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatarPeriodoPdf(periodo?: string | null): string {
  if (!periodo) return "-";

  const intervalo = periodo.match(/^(\d{4}-\d{2}-\d{2})\s*(?:a|até)\s*(\d{4}-\d{2}-\d{2})$/i);
  if (intervalo) {
    const formatarData = (data: string) => data.split("-").reverse().join("/");
    return `${formatarData(intervalo[1])} a ${formatarData(intervalo[2])}`;
  }

  const [ano, mes] = periodo.split("-");
  if (!ano || !mes) return periodo;
  const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
  return `${ano}-${mes}-01 a ${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;
}

export function gerarPdfMedicao(
  medicao: any,
  tipoDocumento: "cliente" | "terceiro" = "cliente",
) {
  const placasDetalhadas = Array.isArray(medicao.placas) && medicao.placas.length > 0 &&
    medicao.placas.every(
      (placa: unknown) => placa && typeof placa === "object" &&
        "valor_calculado" in placa && Number.isFinite(Number(placa.valor_calculado)),
    );
  const placasMedicao = obterPlacasMedicao(medicao.placas);
  const placas = placasMedicao.map((placa) => placa.placa).join(", ") || "-";
  const ehTerceiro = medicao.terceiro === true;
  const empresa = ehTerceiro && medicao.empresa ? medicao.empresa : null;
  const logoEmpresa = typeof empresa?.logo === "string" && empresa.logo.startsWith("data:image/")
    ? empresa.logo
    : null;
  const nomeEmpresa = empresa?.razao_social || empresa?.nome || "MH3 RENTAL LTDA";
  const cnpjEmpresa = empresa ? empresa.cnpj || "-" : "26.881.195/0001-10";
  const enderecoEmpresa = empresa
    ? [empresa.endereco, [empresa.cidade, empresa.estado].filter(Boolean).join("/")].filter(Boolean).join(" · ")
    : "Rodovia BR 381, km 361 – João Monlevade/MG";
  const contatoEmpresa = empresa
    ? [empresa.telefone, empresa.email].filter(Boolean).join(" · ")
    : "(31) 99977-6105 · Noninho · comercial@mh3rental.com.br";
  const parceiro = medicao.parceiro || "-";
  const cliente = medicao.cliente || "-";
  const periodo = formatarPeriodoPdf(medicao.periodo);
  const vendas = Array.isArray(medicao.vendas) ? medicao.vendas : [];
  const valorAjusteVendas = vendas.reduce(
    (total: number, venda: { total?: number | string; sinal_medicao?: string }) =>
      total + (venda.sinal_medicao === "-" ? -1 : 1) * (Number(venda.total) || 0),
    0,
  );
  const valorMedicao = Number(medicao.valor) || 0;
  const valorLocacao = valorMedicao - valorAjusteVendas;
  const valorTerceiro = Number(medicao.valor_terceiro) || 0;
  const horasExtras = Number(medicao.horas_extras) || 0;
  const valorHoraExtra = Number(
    medicao.valor_hora_extra ?? medicao.valor_horas_extras ?? 0,
  );
  const tipoCobranca = medicao.tipo_cobranca ?? medicao.tipoCobranca;
  const valorPorHora = tipoCobranca === "Valor por Hora";
  const quantidadeHoras = valorPorHora ? horasExtras : 0;
  const valorHora = quantidadeHoras > 0 ? valorLocacao / quantidadeHoras : 0;
  const tipoCobrancaLabel = tipoCobranca === "Valor Direito"
    ? "Valor Direto"
    : tipoCobranca || "-";
  const intervaloPeriodo = String(medicao.periodo || "").match(
    /^(\d{4}-\d{2}-\d{2})\s*(?:a|até)\s*(\d{4}-\d{2}-\d{2})$/i,
  );
  const [anoPeriodo, mesPeriodo] = String(medicao.periodo || "").split("-").map(Number);
  const diasIntervalo = intervaloPeriodo
    ? Math.floor((Date.parse(`${intervaloPeriodo[2]}T00:00:00Z`) - Date.parse(`${intervaloPeriodo[1]}T00:00:00Z`)) / 86_400_000) + 1
    : 0;
  const diasNoMes = Number(medicao.dias_mes) || diasIntervalo || (anoPeriodo && mesPeriodo
    ? new Date(anoPeriodo, mesPeriodo, 0).getDate()
    : 0);
  const diasTrabalhadosPorPlaca = placasDetalhadas
    ? placasMedicao
      .map((placa) => `${Number(placa.dias_trabalhados) || 0} dia(s)`)
      .join("; ")
    : "";
  const dadosCobranca = `
    <div><strong>Método de cobrança:</strong> ${escaparHtml(tipoCobrancaLabel)}</div>
    ${valorPorHora ? `
      <div><strong>Quantidade de horas:</strong> ${quantidadeHoras}h</div>
      <div><strong>Valor da hora:</strong> ${formatarValorPdf(valorHora)}</div>
    ` : ""}
    ${tipoCobranca === "Valor Mensal" && diasNoMes ? `
      <div><strong>Dias no mês:</strong> ${diasNoMes}</div>
    ` : ""}
    ${tipoCobranca === "Valor Mensal" && diasTrabalhadosPorPlaca ? `
      <div><strong>Dias trabalhados:</strong> ${diasTrabalhadosPorPlaca}</div>
    ` : ""}
  `;

  const totalHorasExtras = horasExtras * valorHoraExtra;
  const valorCliente = valorMedicao + totalHorasExtras;
  const documentoTerceiro = tipoDocumento === "terceiro";
  const valorLiquido = documentoTerceiro ? valorTerceiro : valorCliente;
  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  const linhas: string[] = documentoTerceiro
    ? [`
      <tr>
        <td>Serviço de terceiro</td>
        <td class="valor">${formatarValorPdf(valorTerceiro)}</td>
      </tr>
    `]
    : placasDetalhadas
      ? placasMedicao.map((placa) => {
          const descricao = tipoCobranca === "Valor Mensal"
            ? `Placa ${escaparHtml(placa.placa)} — ${formatarValorPdf(placa.valor)} ÷ ${diasNoMes} × ${placa.dias_trabalhados ?? 0} dia(s) trabalhado(s)`
            : valorPorHora
              ? `Placa ${escaparHtml(placa.placa)} — ${quantidadeHoras}h × ${formatarValorPdf(placa.valor)}/h`
              : `Placa ${escaparHtml(placa.placa)} — valor direto`;
          return `
            <tr>
              <td>${descricao}</td>
              <td class="valor">${formatarValorPdf(placa.valor_calculado)}</td>
            </tr>
          `;
        })
      : [`
      <tr>
        <td>${valorPorHora
          ? `Placa: ${escaparHtml(placas)} — ${quantidadeHoras}h × ${formatarValorPdf(valorHora)}`
          : "Locação de equipamento | Valor mensal"}</td>
        <td class="valor">${formatarValorPdf(valorLocacao)}</td>
      </tr>
    `];

  if (!documentoTerceiro) {
    for (const venda of vendas) {
      const sinal = venda.sinal_medicao === "-" ? "-" : "+";
      linhas.push(`
        <tr>
          <td>Venda ${escaparHtml(venda.numero || "")} — ${escaparHtml(venda.cliente || "")}${venda.placa_medicao ? ` (${escaparHtml(venda.placa_medicao)})` : ""}</td>
          <td class="valor">${sinal} ${formatarValorPdf(venda.total)}</td>
        </tr>
      `);
    }
  }

  if (!documentoTerceiro && horasExtras > 0 && valorHoraExtra > 0) {
    linhas.push(`
      <tr>
        <td>Horas extras (${horasExtras} × ${formatarValorPdf(valorHoraExtra)})</td>
        <td class="valor">${formatarValorPdf(totalHorasExtras)}</td>
      </tr>
    `);
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${documentoTerceiro ? "Terceiro-" : ""}Medicao-${escaparHtml(medicao.periodo || medicao.id)}</title>
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #fff; font-size: 12px; }
          .pagina { min-height: 297mm; display: flex; flex-direction: column; padding: 22mm 13mm 0; }
          .topo { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 17px; border-bottom: 4px solid #d71920; }
          .logo { max-width: 180px; max-height: 70px; object-fit: contain; }
          .logo-fallback { max-width: 180px; color: #c90000; font-size: 18px; font-weight: 800; }
          .titulo { text-align: right; color: #c90000; }
          .titulo h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
          .titulo p { margin: 8px 0 0; color: #6b7280; font-size: 10px; letter-spacing: 2px; }
          .conteudo { padding-top: 45px; }
          .secao { margin-bottom: 25px; }
          .secao-titulo { margin: 0 0 12px; padding-left: 10px; border-left: 4px solid #d71920; color: #c90000; font-size: 14px; font-weight: 800; text-transform: uppercase; }
          .dados { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 28px; font-size: 12px; }
          .dados strong { font-weight: 700; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
          thead th { padding: 12px; background: #c90000; color: #fff; font-size: 10px; text-align: center; text-transform: uppercase; }
          tbody td { padding: 14px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
          tbody tr:last-child td { border-bottom: none; }
          tbody tr:nth-child(even) { background: #fafafa; }
          td.valor { width: 34%; text-align: right; font-weight: 700; }
          .total td { background: #fff7f7; color: #c90000; font-size: 14px; font-weight: 800; }
          .total td:first-child { text-align: right; }
          .rodape { margin-top: auto; margin-left: -13mm; margin-right: -13mm; padding: 25px 15px 18px; background: #191919; color: #fff; text-align: center; }
          .rodape .marca { margin-bottom: 14px; font-size: 24px; font-weight: 900; font-style: italic; }
          .rodape p { margin: 8px 0 0; font-size: 11px; }
          .pagina-numero { margin-top: 12px; color: #cbd5e1; font-size: 9px; text-align: right; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .pagina { min-height: 297mm; } }
        </style>
      </head>
      <body>
        <div class="pagina">
          <header class="topo">
            ${logoEmpresa
              ? `<img class="logo" src="${escaparHtml(logoEmpresa)}" alt="${escaparHtml(nomeEmpresa)}" />`
              : empresa
                ? `<strong class="logo-fallback">${escaparHtml(nomeEmpresa)}</strong>`
                : '<img class="logo" src="/placeholder-logo.png" alt="MH3" />'}
            <div class="titulo">
              <h1>${documentoTerceiro ? "MEDIÇÃO DE TERCEIRO" : "MEDIÇÃO"}</h1>
              <p>${documentoTerceiro ? "REPASSE DE TERCEIRO" : "LOCAÇÃO DE EQUIPAMENTO"}</p>
            </div>
          </header>
          <main class="conteudo">
            <section class="secao">
              <h2 class="secao-titulo">Dados da medição</h2>
              <div class="dados">
                <div><strong>Cliente:</strong> ${escaparHtml(cliente)}</div>
                ${ehTerceiro ? `<div><strong>Parceiro:</strong> ${escaparHtml(parceiro)}</div>` : ""}
                <div><strong>Veículo/Placa:</strong> ${escaparHtml(placas)}</div>
                <div><strong>Período:</strong> ${escaparHtml(periodo)}</div>
                <div><strong>Mês Ref.:</strong> ${escaparHtml(medicao.periodo || "-")}</div>
                ${dadosCobranca}
              </div>
            </section>
            <section class="secao">
              <h2 class="secao-titulo">${documentoTerceiro ? "Valor do terceiro" : "Valor a pagar"}</h2>
              <table>
                <thead><tr><th>Descrição</th><th class="valor">Valor</th></tr></thead>
                <tbody>
                  ${linhas.join("")}
                  <tr class="total">
                    <td>${documentoTerceiro ? "VALOR DO TERCEIRO" : "VALOR LÍQUIDO A PAGAR"}</td>
                    <td class="valor">${formatarValorPdf(valorLiquido)}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </main>
          <footer class="rodape">
            <div class="marca">${escaparHtml(nomeEmpresa)}</div>
            <p>CNPJ: ${escaparHtml(cnpjEmpresa)}${enderecoEmpresa ? ` · ${escaparHtml(enderecoEmpresa)}` : ""}</p>
            ${contatoEmpresa ? `<p>${escaparHtml(contatoEmpresa)}</p>` : ""}
            <div class="pagina-numero">Emitido em ${escaparHtml(dataEmissao)} · Página 1 de 1</div>
          </footer>
        </div>
        <script>window.onload = function () { window.print(); };</script>
      </body>
    </html>
  `;

  const janela = window.open("", "_blank");
  if (!janela) {
    alert("Não foi possível abrir a janela do PDF. Verifique se o navegador bloqueou o pop-up.");
    return;
  }
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
}