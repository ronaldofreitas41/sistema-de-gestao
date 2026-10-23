import jsPDF from "jspdf";
import { entregarPdf, type EntregaPdf } from "@/lib/pdf/entrega";
import type { OrientacaoPdf } from "@/lib/pdf/orientacao";
import autoTable from "jspdf-autotable";
import { obterPlacasMedicao, type PlacaMedicao } from "@/lib/medicoes";
import { corEmpresaRgb, type Rgb } from "@/lib/pdf/cores";

const TIPO_HORA = "Valor por Hora";
const TIPO_MENSAL = "Valor Mensal";

const moeda = (valor: unknown) =>
  `R$ ${(Number(valor) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dataBr = (data?: string | null) => {
  const iso = String(data ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : "-";
};

function formatarPeriodo(periodo?: string | null) {
  if (!periodo) return "-";
  const intervalo = periodo.match(/^(\d{4}-\d{2}-\d{2})\s*(?:a|até)\s*(\d{4}-\d{2}-\d{2})$/i);
  if (intervalo) return `${dataBr(intervalo[1])} a ${dataBr(intervalo[2])}`;
  const mes = periodo.match(/^(\d{4})-(\d{2})$/);
  if (mes) {
    const ultimo = new Date(Number(mes[1]), Number(mes[2]), 0).getDate();
    return `01/${mes[2]}/${mes[1]} a ${String(ultimo).padStart(2, "0")}/${mes[2]}/${mes[1]}`;
  }
  return periodo;
}

function diasDoPeriodo(medicao: any) {
  if (Number(medicao.dias_mes)) return Number(medicao.dias_mes);
  const intervalo = String(medicao.periodo || "").match(/^(\d{4}-\d{2}-\d{2})\s*(?:a|até)\s*(\d{4}-\d{2}-\d{2})$/i);
  if (!intervalo) return 30;
  const dias = Math.floor((Date.parse(`${intervalo[2]}T00:00:00Z`) - Date.parse(`${intervalo[1]}T00:00:00Z`)) / 86_400_000) + 1;
  return dias > 0 ? dias : 30;
}

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => resolve(null);
    imagem.src = src;
  });
}

/**
 * Resumo da medição em PDF (paisagem ou retrato), baixado direto no computador.
 * `tipo` da medição (contratante ou parceiro) define o título; as placas podem misturar hora e mensal.
 */
export async function gerarPdfMedicao(
  medicao: any,
  equipamentosPorPlaca: Record<string, string> = {},
  modo: EntregaPdf = "baixar",
  orientacao: OrientacaoPdf = "landscape",
) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: orientacao });
  const retrato = orientacao === "portrait";
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const rodapeAltura = 24;
  const limite = pageHeight - rodapeAltura - 4;

  const empresa = medicao.empresa ?? null;
  const principal: Rgb = corEmpresaRgb(empresa?.cor_primaria, [201, 0, 0]);
  const secundaria: Rgb = corEmpresaRgb(empresa?.cor_secundaria, [25, 25, 25]);
  const escuro: Rgb = [45, 45, 45];
  const cinza: Rgb = [110, 110, 110];
  const linha: Rgb = [226, 228, 230];

  const ehParceiro = medicao.papel === "parceiro";
  const nomeEmpresa = empresa?.razao_social || empresa?.nome || "MH3 RENTAL LTDA";
  const cnpj = empresa ? empresa.cnpj || "-" : "26.881.195/0001-10";
  const endereco = empresa
    ? [empresa.endereco, [empresa.cidade, empresa.estado].filter(Boolean).join("/")].filter(Boolean).join(" · ")
    : "Rodovia BR 381, km 361 – João Monlevade/MG";
  const contato = empresa
    ? [empresa.telefone, empresa.email].filter(Boolean).join(" · ")
    : "(31) 99977-6105 · comercial@mh3rental.com.br";

  const logoOrigem = typeof empresa?.logo === "string" && empresa.logo.startsWith("data:image/")
    ? empresa.logo
    : "/placeholder-logo.png";
  const logo = await carregarImagem(logoOrigem);

  const placas: PlacaMedicao[] = obterPlacasMedicao(medicao.placas);
  const diasMes = diasDoPeriodo(medicao);
  const tipoGeral = medicao.tipo_cobranca ?? medicao.tipoCobranca;
  const tipoDe = (placa: PlacaMedicao) => placa.tipo_cobranca || (tipoGeral === "Misto" ? TIPO_MENSAL : tipoGeral);
  const equipamentoDe = (placa: PlacaMedicao) =>
    placa.equipamento || equipamentosPorPlaca[placa.placa.toUpperCase().replace(/\s+/g, "")] || "-";

  const cabecalho = () => {
    if (logo) {
      const altura = 18;
      const largura = Math.min((logo.naturalWidth / logo.naturalHeight) * altura, 60);
      try {
        doc.addImage(logo, "PNG", margin, 10, largura, altura);
      } catch {
        doc.addImage(logo, "JPEG", margin, 10, largura, altura);
      }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...principal);
      doc.text(nomeEmpresa, margin, 22);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.setTextColor(...principal);
    doc.text(ehParceiro ? "RESUMO MEDIÇÃO PARCEIRO" : "RESUMO MEDIÇÃO", pageWidth - margin, 18, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...cinza);
    doc.text(`Medição ${medicao.numero ?? medicao.id}`, pageWidth - margin, 25, { align: "right" });
    doc.setDrawColor(...principal);
    doc.setLineWidth(1);
    doc.line(0, 32, pageWidth, 32);
  };

  const rodape = (pagina: number, total: number) => {
    const topo = pageHeight - rodapeAltura;
    doc.setFillColor(...secundaria);
    doc.rect(0, topo, pageWidth, rodapeAltura, "F");
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(11);
    doc.setTextColor(245, 245, 245);
    doc.text(nomeEmpresa, pageWidth / 2, topo + 7, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(225, 225, 225);
    doc.text(`CNPJ: ${cnpj}${endereco ? ` · ${endereco}` : ""}`, pageWidth / 2, topo + 12.5, { align: "center" });
    if (contato) doc.text(contato, pageWidth / 2, topo + 17, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(190, 190, 190);
    doc.text(
      `Emitido em ${new Date().toLocaleDateString("pt-BR")} · Pág. ${pagina} de ${total}`,
      pageWidth - margin,
      topo + 21,
      { align: "right" },
    );
  };

  cabecalho();
  let y = 40;

  // Dados logo abaixo do cabeçalho: contratante ou parceiro, período de apuração, obra e data.
  const quemRotulo = ehParceiro ? "PARCEIRO" : "CONTRATANTE";
  const quemNome = (ehParceiro ? medicao.parceiro : medicao.cliente) || "-";
  const dados: [string, string][] = [
    [quemRotulo, String(quemNome)],
    ["PERÍODO DE APURAÇÃO", formatarPeriodo(medicao.periodo)],
    ["OBRA", medicao.obra || "-"],
    ["DATA", dataBr(medicao.data_medicao)],
  ];
  const colunasDados = retrato ? 2 : dados.length;
  const linhasDados = Math.ceil(dados.length / colunasDados);
  const larguraColuna = (pageWidth - margin * 2) / colunasDados;
  const alturaDados = 6 + linhasDados * 12;
  doc.setFillColor(250, 251, 252);
  doc.setDrawColor(...linha);
  doc.roundedRect(margin, y, pageWidth - margin * 2, alturaDados, 2, 2, "FD");
  dados.forEach(([rotulo, valor], indice) => {
    const x = margin + 5 + (indice % colunasDados) * larguraColuna;
    const topoLinha = y + Math.floor(indice / colunasDados) * 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...cinza);
    doc.text(rotulo, x, topoLinha + 6.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...escuro);
    doc.text(doc.splitTextToSize(valor, larguraColuna - 8).slice(0, 1), x, topoLinha + 13);
  });
  y += alturaDados + 6;

  const estiloTabela = {
    theme: "grid" as const,
    margin: { left: margin, right: margin, bottom: rodapeAltura + 6, top: 38 },
    styles: { font: "helvetica", fontSize: 9, textColor: escuro, cellPadding: 3, lineColor: linha, lineWidth: 0.25, valign: "middle" as const },
    headStyles: { fillColor: principal, textColor: [255, 255, 255] as Rgb, fontStyle: "bold" as const, halign: "center" as const, fontSize: 8 },
    footStyles: { fillColor: [255, 245, 246] as Rgb, textColor: principal, fontStyle: "bold" as const, halign: "right" as const },
  };

  const subtitulo = (texto: string) => {
    if (y + 20 > limite) {
      doc.addPage("a4", orientacao);
      cabecalho();
      y = 40;
    }
    doc.setFillColor(...principal);
    doc.roundedRect(margin, y - 4, 1.5, 6, 0.7, 0.7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...principal);
    doc.text(texto, margin + 4, y + 0.5);
    y += 4;
  };

  const porHora = placas.filter((p) => tipoDe(p) === TIPO_HORA);
  const mensais = placas.filter((p) => tipoDe(p) !== TIPO_HORA);
  const totalHora = porHora.reduce((soma, p) => soma + (Number(p.valor_calculado) || 0), 0);
  const totalMensal = mensais.reduce((soma, p) => soma + (Number(p.valor_calculado) || 0), 0);
  const mostrarSubtotais = porHora.length > 0 && mensais.length > 0;

  const ultimoY = () => (doc as any).lastAutoTable.finalY as number;

  // CONTRATO POR HORA — EQUIPAMENTO · PLACA · HR CONTRATADA · VALOR HORA · HORAS TRABALHADAS · TOTAL A RECEBER
  if (porHora.length) {
    subtitulo("CONTRATO POR HORA");
    autoTable(doc, {
      ...estiloTabela,
      startY: y,
      head: [["EQUIPAMENTO", "PLACA", "HR CONTRATADA", "VALOR HORA", "HORAS TRABALHADAS", "TOTAL A RECEBER"]],
      body: porHora.map((p) => [
        equipamentoDe(p),
        p.placa,
        p.horas_contratadas ? `${p.horas_contratadas}` : "-",
        moeda(p.valor),
        `${p.horas_trabalhadas ?? 0}`,
        moeda(p.valor_calculado),
      ]),
      ...(mostrarSubtotais ? { foot: [["", "", "", "", "SUBTOTAL HORA", moeda(totalHora)]] } : {}),
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "center", cellWidth: retrato ? 24 : 30 },
        2: { halign: "center", cellWidth: retrato ? 24 : 32 },
        3: { halign: "right", cellWidth: retrato ? 26 : 32 },
        4: { halign: "center", cellWidth: retrato ? 28 : 40 },
        5: { halign: "right", cellWidth: retrato ? 32 : 42, fontStyle: "bold" },
      },
    });
    y = ultimoY() + 9;
  }

  // CONTRATO MENSAL — EQUIPAMENTO · PLACA · VALOR MENSAL · DIAS MÊS · DIAS TRABALHADOS · TOTAL A RECEBER
  if (mensais.length) {
    subtitulo("CONTRATO MENSAL");
    autoTable(doc, {
      ...estiloTabela,
      startY: y,
      head: [["EQUIPAMENTO", "PLACA", "VALOR MENSAL", "DIAS MÊS", "DIAS TRABALHADOS", "TOTAL A RECEBER"]],
      body: mensais.map((p) => [
        equipamentoDe(p),
        p.placa,
        moeda(p.valor),
        `${diasMes}`,
        `${p.dias_trabalhados ?? 0}`,
        moeda(p.valor_calculado),
      ]),
      ...(mostrarSubtotais ? { foot: [["", "", "", "", "SUBTOTAL MENSAL", moeda(totalMensal)]] } : {}),
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "center", cellWidth: retrato ? 24 : 30 },
        2: { halign: "right", cellWidth: retrato ? 28 : 36 },
        3: { halign: "center", cellWidth: retrato ? 20 : 28 },
        4: { halign: "center", cellWidth: retrato ? 28 : 40 },
        5: { halign: "right", cellWidth: retrato ? 32 : 42, fontStyle: "bold" },
      },
    });
    y = ultimoY() + 9;
  }

  if (!placas.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...cinza);
    doc.text("Nenhuma placa informada nesta medição.", margin, y + 4);
    y += 12;
  }

  // Ajustes: excedente, vendas/avarias, desconto do parceiro e total.
  const vendas: Array<{ numero?: string; cliente?: string; total?: number | string; sinal_medicao?: string; placa_medicao?: string }> =
    Array.isArray(medicao.vendas) ? medicao.vendas : [];
  const excedente = Number(medicao.valor_excedente) || 0;
  const desconto = Number(medicao.desconto_percentual) || 0;
  const subtotalPlacas = totalHora + totalMensal;
  const bruto = subtotalPlacas + excedente;
  const valorDesconto = Math.round(bruto * (Math.min(Math.max(desconto, 0), 100) / 100) * 100) / 100;

  const ajustes: string[][] = [];
  ajustes.push(["Subtotal das placas", moeda(subtotalPlacas)]);
  if (excedente > 0) ajustes.push(["Excedente", `+ ${moeda(excedente)}`]);
  if (valorDesconto > 0) ajustes.push([`Desconto (${desconto}%)`, `- ${moeda(valorDesconto)}`]);
  for (const venda of vendas) {
    const sinal = venda.sinal_medicao === "-" ? "-" : "+";
    ajustes.push([
      `Venda/avaria ${venda.numero ?? ""}${venda.placa_medicao ? ` (${venda.placa_medicao})` : ""}`.trim(),
      `${sinal} ${moeda(venda.total)}`,
    ]);
  }

  autoTable(doc, {
    ...estiloTabela,
    startY: y,
    tableWidth: 110,
    margin: { ...estiloTabela.margin, left: pageWidth - margin - 110 },
    body: ajustes,
    foot: [["TOTAL A RECEBER", moeda(medicao.valor)]],
    showHead: false,
    columnStyles: { 0: { cellWidth: "auto" }, 1: { halign: "right", cellWidth: 42, fontStyle: "bold" } },
  });
  y = ultimoY() + 8;

  if (medicao.observacoes) {
    if (y + 16 > limite) {
      doc.addPage("a4", orientacao);
      cabecalho();
      y = 40;
    }
    subtitulo("OBSERVAÇÕES");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...escuro);
    const linhas = doc.splitTextToSize(String(medicao.observacoes), pageWidth - margin * 2);
    doc.text(linhas, margin, y + 4);
  }

  const total = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina);
    rodape(pagina, total);
  }

  doc.setProperties({ title: `Medição ${medicao.numero ?? medicao.id}` });
  return entregarPdf(doc, `${ehParceiro ? "Medicao-Parceiro" : "Medicao"}-${medicao.numero ?? medicao.id}.pdf`, modo);
}
