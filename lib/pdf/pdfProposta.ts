import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Proposta } from "@/lib/types";

type Rgb = [number, number, number];

export function generatePropostaPDF(proposta: Proposta) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const red: Rgb = [190, 0, 0];
  const dark: Rgb = [65, 65, 65];
  const gray: Rgb = [105, 105, 105];
  const lightLine: Rgb = [225, 225, 225];
  const gold: Rgb = [181, 139, 0];
  const margin = 17;
  const pageWidth = 297;
  const contentWidth = pageWidth - margin * 2;
  const pageBottom = 194;
  let currentY = 18;

  const value = (item: unknown, fallback = "-") =>
    item === undefined || item === null || item === "" ? fallback : String(item);

  const formatCurrency = (item?: number | string | null) => {
    if (item === undefined || item === null || item === "") return "-";
    const amount = Number(item);
    return Number.isFinite(amount)
      ? `R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "-";
  };

  const formatDate = (item?: string | null) => {
    if (!item) return "-";
    const brazilian = item.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brazilian) return item.slice(0, 10);
    const iso = item.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : item;
  };

  const addPage = () => {
    doc.addPage("a4", "landscape");
    currentY = 19;
  };

  const ensureSpace = (height: number) => {
    if (currentY + height > pageBottom) addPage();
  };

  const drawParagraph = (
    content: string,
    options: {
      size?: number;
      color?: Rgb;
      bold?: boolean;
      gap?: number;
      indent?: number;
    } = {},
  ) => {
    const { size = 9.5, color = dark, bold = false, gap = 3, indent = 0 } = options;
    const lineHeight = size * 0.48;

    for (const paragraph of content.split("\n")) {
      if (!paragraph.trim()) {
        currentY += lineHeight * 0.7;
        continue;
      }

      const wrapped = doc.splitTextToSize(paragraph, contentWidth - indent);
      let offset = 0;
      while (offset < wrapped.length) {
        const availableLines = Math.floor((pageBottom - currentY) / lineHeight);
        if (availableLines < 1) {
          addPage();
          continue;
        }

        const chunk = wrapped.slice(offset, offset + availableLines);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.text(chunk, margin + indent, currentY);
        currentY += chunk.length * lineHeight;
        offset += chunk.length;
        if (offset < wrapped.length) addPage();
      }
      currentY += gap;
    }
  };

  const sectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...red);
    doc.text(title.toUpperCase(), margin + 3, currentY + 5);
    currentY += 11;
  };

  const drawHeader = () => {
    const logo = proposta.empresaLogo;
    let logoDrawn = false;
    if (logo?.startsWith("data:image/")) {
      const format = logo.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      try {
        doc.addImage(logo, format, margin, 12, 60, 20, undefined, "FAST");
        logoDrawn = true;
      } catch {
        logoDrawn = false;
      }
    }

    if (!logoDrawn) {
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(28);
      doc.setTextColor(...red);
      doc.text("MH3", margin, 29);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("RENTAL", margin + 43, 28);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...red);
    doc.text("PROPOSTA DE LOCAÇÃO", pageWidth - margin, 23, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text("VEÍCULOS & EQUIPAMENTOS", pageWidth - margin, 31, { align: "right" });
    doc.setDrawColor(...red);
    doc.setLineWidth(1.2);
    doc.line(margin, 39, pageWidth - margin, 39);
  };

  const drawInfoCard = () => {
    const top = currentY;
    const height = 49;
    const half = contentWidth / 2;
    const col = contentWidth / 4;
    doc.setDrawColor(...lightLine);
    doc.setLineWidth(0.35);
    doc.roundedRect(margin, top, contentWidth, height, 3, 3, "S");

    const field = (label: string, item: unknown, x: number, y: number, width: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(...gray);
      doc.text(label.toUpperCase(), x, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(doc.splitTextToSize(value(item), width).slice(0, 1), x, y + 5.5);
    };

    field("Data", formatDate(proposta.data), margin + 5, top + 7, col - 10);
    field("Validade da proposta", formatDate(proposta.validade), margin + col + 5, top + 7, col - 10);
    field("Empresa / Solicitante", proposta.contratante, margin + col * 2 + 5, top + 7, col - 10);
    field("E-mail", proposta.email, margin + col * 3 + 5, top + 7, col - 10);
    doc.setDrawColor(...lightLine);
    doc.line(margin + 5, top + 17, pageWidth - margin - 5, top + 17);
    field("Obra / Cidade", proposta.obra, margin + 5, top + 24, half - 10);
    field("Veículo / Equipamento", proposta.veiculo, margin + half + 5, top + 24, half - 10);
    doc.line(margin + 5, top + 34, pageWidth - margin - 5, top + 34);
    field("Modelo", proposta.modelo, margin + 5, top + 41, half - 10);
    field("Ano", proposta.ano, margin + half + 5, top + 41, half - 10);
    currentY += height + 8;
  };

  const drawFooter = (page: number, total: number) => {
    doc.setDrawColor(...lightLine);
    doc.setLineWidth(0.25);
    doc.line(margin, 200, pageWidth - margin, 200);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(value(proposta.numero, "Proposta"), margin, 205);
    doc.text(`${page}/${total}`, pageWidth - margin, 205, { align: "right" });
  };

  drawHeader();
  currentY = 49;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  const greeting = "Prezado(a) ";
  doc.text(greeting, margin, currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...red);
  doc.text(value(proposta.contratante), margin + doc.getTextWidth(greeting), currentY);
  currentY += 6;
  drawParagraph(
    "É com satisfação que a MH3 Rental apresenta sua proposta comercial para locação, elaborada com as melhores condições para atender às necessidades da sua operação.",
    { size: 10, gap: 5 },
  );

  drawInfoCard();
  sectionTitle("Valores");

  const allLines = proposta.linhas || [];
  const hourlyLines = allLines.filter((item) => Number(item.vh) || Number(item.gar) || Number(item.vm));
  const valueLines = proposta.cobrancaModo === "hora"
    ? hourlyLines.length ? hourlyLines : allLines.slice(0, 1)
    : allLines.slice(0, 1);
  const rows = valueLines.length
    ? valueLines.map((item) => [
        proposta.cobrancaModo === "hora" ? formatCurrency(item.vh) : "-",
        String(proposta.cobrancaModo === "hora" ? item.turno : proposta.turnoFechado || 1),
        proposta.cobrancaModo === "hora" && Number(item.gar)
          ? `${Number(item.gar).toLocaleString("pt-BR")} HR`
          : "-",
        formatCurrency(proposta.cobrancaModo === "hora" ? item.vm : proposta.valorFechado),
        value(proposta.franquia),
      ])
    : [["-", String(proposta.turnoFechado || 1), "-", formatCurrency(proposta.valorFechado), value(proposta.franquia)]];

  autoTable(doc, {
    startY: currentY,
    head: [["VALOR DA HORA", "TURNO(S)", "GARANTIA", "VALOR MENSAL", "FRANQUIA KM/MÊS"]],
    body: rows,
    theme: "grid",
    margin: { left: margin, right: margin, bottom: 15 },
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      textColor: dark,
      cellPadding: 4,
      lineColor: lightLine,
      lineWidth: 0.25,
      halign: "center",
      valign: "middle",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [155, 155, 155],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { fontStyle: "bold", minCellHeight: 12 },
    didParseCell: (data) => {
      if (data.section === "body" && (data.column.index === 0 || data.column.index === 3)) {
        data.cell.styles.textColor = red;
      }
    },
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  sectionTitle("Regime de turnos e medição");
  const regime = [
    "1. GARANTIA MÍNIMA POR REGIME: 1 (UM) TURNO = 15 HORAS MÍNIMAS/MÊS; 2 (DOIS) TURNOS = 26 HORAS MÍNIMAS/MÊS. O VALOR DA GARANTIA MÍNIMA É FIXO E DEVIDO INTEGRALMENTE, INDEPENDENTEMENTE DA UTILIZAÇÃO EFETIVA DO EQUIPAMENTO.",
    "2. DEFINIÇÃO DE TURNO: TURNO É O BLOCO ÚNICO DE JORNADA DIÁRIA DE OPERAÇÃO, DIURNO OU NOTURNO, À ESCOLHA DA CONTRATANTE. A OPERAÇÃO EXCLUSIVAMENTE DIURNA OU EXCLUSIVAMENTE NOTURNA CARACTERIZA 1 (UM) TURNO.",
    "3. CARACTERIZAÇÃO DE 2 (DOIS) TURNOS: A OPERAÇÃO HABITUAL DO EQUIPAMENTO EM AMBOS OS PERÍODOS - DIURNO E NOTURNO - CARACTERIZA REGIME DE 2 (DOIS) TURNOS, INDEPENDENTEMENTE DO TOTAL DE HORAS DO HORÍMETRO. CONSTATADA A OPERAÇÃO EM 2 (DOIS) TURNOS, A GARANTIA MÍNIMA DAQUELE MÊS PASSA AUTOMATICAMENTE A SER A DO REGIME DE 2 (DOIS) TURNOS, SEM NECESSIDADE DE ADITIVO.",
    "4. TOLERÂNCIA: OPERAÇÕES PONTUAIS E NÃO HABITUAIS FORA DO TURNO CONTRATADO, PARA CONCLUSÃO DE SERVIÇO OU EMERGÊNCIA, NÃO CARACTERIZAM MUDANÇA DE REGIME.",
    "5. HORAS EXCEDENTES: AS HORAS TRABALHADAS ACIMA DA GARANTIA MÍNIMA APLICÁVEL AO MÊS SERÃO FATURADAS AO VALOR DA HORA DESTA PROPOSTA. HORAS NÃO UTILIZADAS NÃO SÃO ACUMULÁVEIS E NÃO GERAM CRÉDITO OU RESTITUIÇÃO.",
    "6. MEDIÇÃO MENSAL: APURADA PELA LEITURA DO HORÍMETRO DE CADA EQUIPAMENTO, INFORMADA PELA CONTRATANTE ATÉ O ÚLTIMO DIA DE CADA CICLO DE MEDIÇÃO, ACOMPANHADA DE REGISTRO FOTOGRÁFICO DO HORÍMETRO.",
    "7. COMPROVAÇÃO DO REGIME: O REGIME DE OPERAÇÃO (DIURNO, NOTURNO OU AMBOS) SERÁ APURADO PELOS RELATÓRIOS DO SISTEMA DE RASTREAMENTO/MONITORAMENTO INSTALADO NO EQUIPAMENTO, QUE FAZEM PROVA SUFICIENTE PARA TODOS OS EFEITOS, INDEPENDENTEMENTE DE QUALQUER OUTRO DOCUMENTO. EM CASO DE DIVERGÊNCIA COM A MEDIÇÃO INFORMADA PELA CONTRATANTE, PREVALECEM OS RELATÓRIOS DE RASTREAMENTO.",
    "8. RASTREADOR: A CONTRATANTE DECLARA CIÊNCIA DE QUE O EQUIPAMENTO POSSUI SISTEMA DE RASTREAMENTO/MONITORAMENTO INSTALADO, VEDADA SUA REMOÇÃO, DESLIGAMENTO OU VIOLAÇÃO. A INOPERÂNCIA DO RASTREADOR POR ATO DA CONTRATANTE, OU A INOPERÂNCIA/ADULTERAÇÃO DO HORÍMETRO, IMPLICA PRESUNÇÃO DE OPERAÇÃO EM 2 (DOIS) TURNOS E ADOÇÃO DA CARGA HORÁRIA MÁXIMA NO PERÍODO SEM REGISTRO.",
    "9. PARALISAÇÃO E DESCONTO POR INDISPONIBILIDADE: EM CASO DE PARALISAÇÃO DO EQUIPAMENTO POR DEFEITO TÉCNICO, A CONTRATANTE DEVERÁ COMUNICAR IMEDIATAMENTE A CONTRATADA, REGISTRANDO O HORÁRIO DA OCORRÊNCIA. EVENTUAL DESCONTO NA MEDIÇÃO SERÁ CALCULADO COM BASE NO PERÍODO EFETIVO DE PARALISAÇÃO, CONTADO A PARTIR DO HORÁRIO DA COMUNICAÇÃO FORMAL ATÉ O HORÁRIO DE EFETIVA NORMALIZAÇÃO DO EQUIPAMENTO PELA CONTRATADA. NÃO HAVENDO COMUNICAÇÃO FORMAL DO HORÁRIO DE PARALISAÇÃO, PREVALECERÁ, PARA FINS DE CÁLCULO DO DESCONTO, O HORÁRIO DE ATENDIMENTO REGISTRADO PELA CONTRATADA.",
  ];
  for (const clause of regime) drawParagraph(clause, { size: 8.8, gap: 4 });

  if (proposta.obs) {
    sectionTitle("Observações");
    drawParagraph(proposta.obs, { size: 10, gap: 4 });
  }

  sectionTitle("Mobilização / Desmobilização");
  drawParagraph(
    proposta.mobilTipo === "mh3"
      ? "Por conta da MH3 Rental."
      : `Por conta da CONTRATANTE${proposta.mobilValor ? ` — ${formatCurrency(proposta.mobilValor)}` : ""}.`,
    { size: 10 },
  );

  sectionTitle("Prazo, fidelidade e rescisão");
  const prazo = value(proposta.duracao, "12");
  const percentual = `${Number(proposta.multaPct || 0).toLocaleString("pt-BR")}%`;
  const clausulaPrazo = proposta.multaTipo === "sem_multa"
    ? `O presente contrato vigorará pelo prazo de ${prazo} meses, contados a partir da data de início da locação, não havendo incidência de multa na hipótese de rescisão antecipada por qualquer das partes.`
    : proposta.multaTipo === "valores_vigencia"
      ? `O presente contrato vigorará pelo prazo de ${prazo} meses, contados a partir da data de início da locação. DA RESCISÃO OU DEVOLUÇÃO ANTECIPADA: os valores mensais são devidos integralmente até o termo final da vigência contratual, ainda que a contratante devolva os equipamentos, reduza a quantidade contratada ou encerre a operação antes desse prazo. A devolução antecipada, total ou parcial, não reduz, não suspende e não extingue a obrigação de pagamento dos meses remanescentes, por equipamento, até o fim da vigência. Permanecem devidas as despesas de desmobilização e a devolução nas condições contratuais.`
      : `1. DO PRAZO: O PRESENTE CONTRATO VIGORARÁ PELO PRAZO MÍNIMO DE ${prazo} MESES, CONTADOS A PARTIR DA DATA DE INÍCIO DA LOCAÇÃO.\n2. DA FIDELIDADE: OS PRIMEIROS ${proposta.fidelidade || 6} MESES DE VIGÊNCIA CONSTITUEM PERÍODO DE FIDELIDADE INTEGRAL.\n3. DA RESCISÃO ATÉ O 6º MÊS: CASO A RESCISÃO OCORRA ANTES DE COMPLETADO O 6º MÊS DE VIGÊNCIA, A CONTRATANTE OBRIGA-SE AO PAGAMENTO DOS ALUGUÉIS MENSAIS VINCENDOS ATÉ O ENCERRAMENTO DO PERÍODO DE FIDELIDADE, ACRESCIDOS DE MULTA COMPENSATÓRIA DE ${percentual}, INCIDENTE SOBRE O SOMATÓRIO DOS ALUGUÉIS MENSAIS REMANESCENTES DO PERÍODO SUBSEQUENTE.\n4. DA RESCISÃO APÓS O 6º MÊS: OCORRENDO A RESCISÃO APÓS O 6º MÊS DE VIGÊNCIA, SERÁ DEVIDA MULTA COMPENSATÓRIA DE ${percentual}, INCIDENTE SOBRE O SOMATÓRIO DOS ALUGUÉIS MENSAIS REMANESCENTES ATÉ O TERMO FINAL DA VIGÊNCIA CONTRATUAL.\n\nA MESMA REGRA SE APLICA À DEVOLUÇÃO PARCIAL OU REDUÇÃO DA QUANTIDADE DE EQUIPAMENTOS, POR EQUIPAMENTO RETIRADO.`;
  drawParagraph(clausulaPrazo, { size: 9.6, color: gold, bold: true, gap: 5, indent: 3 });

  sectionTitle("Responsabilidades da contratante");
  drawParagraph(value(proposta.resp, "Por conta da Contratante."), { size: 9.5, gap: 3, indent: 2 });

  if (proposta.mostrarKmHr) {
    drawParagraph(
      `KM atual do equipamento: ${value(proposta.km)}. Horímetro atual: ${value(proposta.horimetro)}.`,
      { size: 9.5, bold: true, gap: 4 },
    );
  }

  if (proposta.seguro || proposta.temSeguro) {
    sectionTitle("Seguro");
    drawParagraph(value(proposta.seguro || proposta.temSeguro), { size: 9.5, gap: 3, indent: 3 });
    drawParagraph("CONDIÇÕES:", { size: 10, bold: true, gap: 2, indent: 3 });
    drawParagraph(
      "OS RISCOS INDICADOS COMO (NÃO), QUANDO OCORRIDOS, SERÃO REPARADOS ÀS EXPENSAS EXCLUSIVAS DA CONTRATANTE, INDEPENDENTEMENTE DE CULPA.\nA DIFERENÇA ENTRE O VALOR INDENIZADO PELA APÓLICE E O VALOR DE REPOSIÇÃO DO EQUIPAMENTO É DE RESPONSABILIDADE DA CONTRATANTE.\nEM CASO DE SINISTRO COBERTO, A FRANQUIA DA APÓLICE É DE RESPONSABILIDADE DA CONTRATANTE.\nEM CASO DE PERDA TOTAL OU SINISTRO NÃO COBERTO, A CONTRATANTE INDENIZARÁ A CONTRATADA PELO VALOR DE REPOSIÇÃO DO EQUIPAMENTO, ACRESCIDO DOS VALORES DO PERÍODO REMANESCENTE DO CONTRATO. A PARALISAÇÃO POR SINISTRO NÃO SUSPENDE NEM REDUZ O VALOR MENSAL.",
      { size: 9.2, gap: 3, indent: 3 },
    );
  }

  ensureSpace(25);
  doc.setDrawColor(...lightLine);
  doc.roundedRect(margin, currentY, contentWidth, 19, 3, 3, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...gray);
  doc.text("CICLO DE MEDIÇÃO", margin + 5, currentY + 7);
  doc.text("CONDIÇÃO DE PAGAMENTO", margin + contentWidth / 2, currentY + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...dark);
  doc.text(`CICLO DE MEDIÇÃO: ${value(proposta.ciclo).toUpperCase()}`, margin + 5, currentY + 14);
  doc.text(value(proposta.pagamento), margin + contentWidth / 2, currentY + 14);
  currentY += 25;

  sectionTitle("Condições de faturamento");
  drawParagraph(
    "O CICLO DE MEDIÇÃO SEGUIRÁ O CALENDÁRIO DA CONTRATANTE, FORMALIZADO NO CONTRATO. A APROVAÇÃO DA MEDIÇÃO PELA CONTRATANTE DEVERÁ OCORRER EM ATÉ 5 (CINCO) DIAS ÚTEIS DO FECHAMENTO DO CICLO; NÃO HAVENDO MANIFESTAÇÃO NESSE PRAZO, A MEDIÇÃO CONSIDERA-SE APROVADA E A NOTA FISCAL SERÁ EMITIDA. O PRAZO DE PAGAMENTO CONTA DA EMISSÃO DA NOTA FISCAL. ATRASO NO PAGAMENTO SUJEITA-SE A MULTA DE 2%, JUROS DE 1% AO MÊS E CORREÇÃO PELO IPCA.",
    { size: 9.4, gap: 6 },
  );

  sectionTitle("Da proposta como parte integrante");
  drawParagraph(
    "ESTA PROPOSTA COMERCIAL, UMA VEZ APROVADA PELA CONTRATANTE, INTEGRA O CONTRATO DE LOCAÇÃO PARA TODOS OS EFEITOS, INDEPENDENTEMENTE DE TRANSCRIÇÃO, SEJA O INSTRUMENTO CONTRATUAL DA CONTRATADA OU DA CONTRATANTE. EM CASO DE DÚVIDA, OMISSÃO, DIVERGÊNCIA OU CONFLITO ENTRE OS TERMOS DO CONTRATO, DA ORDEM DE COMPRA OU DE QUALQUER OUTRO DOCUMENTO E OS TERMOS DESTA PROPOSTA, PREVALECEM AS CONDIÇÕES DESTA PROPOSTA, QUE REFLETE AS CONDIÇÕES COMERCIAIS EFETIVAMENTE NEGOCIADAS E APROVADAS ENTRE AS PARTES. A APROVAÇÃO DA PROPOSTA, POR ESCRITO OU POR EMISSÃO DE ORDEM DE COMPRA, IMPLICA ACEITAÇÃO INTEGRAL DE TODAS AS SUAS CONDIÇÕES.",
    { size: 9.4, gap: 8 },
  );

  addPage();
  doc.setDrawColor(...lightLine);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  doc.setLineDashPattern([], 0);
  currentY += 8;
  drawParagraph(
    "Agradecemos a oportunidade e a confiança em nossos serviços. Permanecemos à inteira disposição para esclarecer dúvidas e ajustar esta proposta conforme a sua necessidade.\n\nAtenciosamente,",
    { size: 10, color: gray, gap: 3 },
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...red);
  doc.text("Equipe MH3 Rental", margin, currentY);
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(18);
  doc.setTextColor(155, 155, 155);
  doc.text("MH3 RENTAL LTDA", pageWidth / 2, 82, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);
  doc.text("CNPJ: 26.881.195/0001-10 | Rodovia BR 381, km 361 - João Monlevade/MG", pageWidth / 2, 90, { align: "center" });
  doc.text("(31) 99977-6105 | Noninho | comercial@mh3rental.com.br", pageWidth / 2, 97, { align: "center" });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    drawFooter(page, totalPages);
  }

  const filename = `Proposta_${proposta.numero || proposta.id}_${proposta.contratante || "Cliente"}`
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.setProperties({ title: `Proposta - ${proposta.contratante || "Cliente"}` });
  doc.save(`${filename}.pdf`);
}