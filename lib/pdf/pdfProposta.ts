import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Proposta } from "@/lib/types";

type Rgb = [number, number, number];

export function generatePropostaPDF(proposta: Proposta) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const red: Rgb = [191, 0, 0];
  const dark: Rgb = [55, 55, 55];
  const gray: Rgb = [110, 110, 110];
  const lightLine: Rgb = [225, 225, 225];
  const margin = 14;
  const contentWidth = 182;

  const formatCurrency = (value?: number | string | null) => {
    if (value === undefined || value === null || value === "") return "-";
    return `R$ ${Number(value).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const parts = value.slice(0, 10).split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
  };

  const text = (value: unknown, fallback = "-") =>
    value === undefined || value === null || value === "" ? fallback : String(value);

  const drawFirstPageHeader = () => {
    doc.addImage("/placeholder-logo.png", "PNG", margin, 12, 45, 15.7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...red);
    doc.text("PROPOSTA DE LOCAÇÃO", 196, 18, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...gray);
    doc.text("VEÍCULOS & EQUIPAMENTOS", 196, 25, { align: "right" });
    doc.setDrawColor(...red);
    doc.setLineWidth(1.2);
    doc.line(margin, 36, 196, 36);
  };

  const sectionTitle = (title: string, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...red);
    doc.text(title.toUpperCase(), margin, y);
    return y + 7;
  };

  const paragraph = (value: string, y: number, size = 9.5) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(value, contentWidth);
    doc.text(lines, margin, y);
    return y + lines.length * 5 + 4;
  };

  const addPageIfNeeded = (y: number, needed = 30) => {
    if (y + needed <= 276) return y;
    doc.addPage();
    return 20;
  };

  drawFirstPageHeader();

  let currentY = 48;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  doc.text("Prezado(a)", margin, currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...red);
  doc.text(text(proposta.contratante), margin + 17, currentY);
  currentY = paragraph(
    "É com satisfação que a MH3 Rental apresenta sua proposta comercial para locação, elaborada para atender às necessidades da sua operação.",
    currentY + 6,
  );

  autoTable(doc, {
    startY: currentY + 3,
    body: [
      ["DATA", "VALIDADE DA PROPOSTA", "EMPRESA / SOLICITANTE", "E-MAIL"],
      [formatDate(proposta.data), formatDate(proposta.validade), text(proposta.contratante), text(proposta.email)],
      ["OBRA / CIDADE", "VEÍCULO / EQUIPAMENTO", "MODELO", "ANO"],
      [text(proposta.obra), text(proposta.veiculo), text(proposta.modelo), text(proposta.ano)],
    ],
    theme: "grid",
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 8.5, textColor: dark, cellPadding: 4, lineColor: lightLine },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 45 }, 2: { cellWidth: 45 }, 3: { cellWidth: 45 } },
    didParseCell: (data) => {
      if (data.row.index === 0 || data.row.index === 2) {
        data.cell.styles.fontStyle = "normal";
        data.cell.styles.textColor = gray;
        data.cell.styles.fontSize = 7.5;
      } else {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  currentY = sectionTitle("Valores", currentY);
  autoTable(doc, {
    startY: currentY,
    head: [["VALOR DA HORA", "TURNO(S)", "GARANTIA", "VALOR MENSAL", "FRANQUIA KM/MÊS"]],
    body: [[
      formatCurrency(proposta.linhas?.[0]?.vh || proposta.valorFechado),
      text(proposta.turnoFechado || proposta.linhas?.[0]?.turno, "1"),
      formatCurrency(proposta.linhas?.[0]?.gar),
      formatCurrency(proposta.linhas?.[0]?.vm || proposta.valorFechado),
      text(proposta.franquia),
    ]],
    theme: "grid",
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [255, 255, 255], textColor: gray, fontStyle: "bold", fontSize: 7.5, halign: "center" },
    bodyStyles: { textColor: dark, fontStyle: "bold", fontSize: 10, halign: "center", cellPadding: 5 },
    tableLineColor: lightLine,
    tableLineWidth: 0.3,
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  currentY = sectionTitle("Regime de turnos e medição", currentY);
  currentY = paragraph(
    `A operação será realizada em ${text(proposta.turnoFechado, "1")} turno(s), com medição mensal baseada na leitura do horímetro. ${proposta.franquia ? `A franquia contratada é de ${proposta.franquia}.` : "A medição seguirá as condições comerciais desta proposta."}`,
    currentY,
  );
  currentY = paragraph(
    "Horas excedentes à garantia mínima aplicável ao mês serão faturadas pelo valor da hora desta proposta. Horas não utilizadas não são acumuláveis e não geram crédito ou restituição.",
    currentY,
  );

  if (proposta.mobilValor) {
    currentY = paragraph(
      `Mobilização / Desmobilização: ${text(proposta.mobilTipo, "Por conta da contratante")} - ${formatCurrency(proposta.mobilValor)}.`,
      currentY,
    );
  }

  currentY = addPageIfNeeded(currentY, 55);
  currentY = sectionTitle("Prazo, fidelidade e rescisão", currentY);
  currentY = paragraph(
    `Prazo de locação: ${text(proposta.duracao || (proposta.tempoLocacao ? `${proposta.tempoLocacao} mês(es)` : "não informado"))}. ${proposta.fidelidade ? `Fidelidade contratual de ${proposta.fidelidade} meses.` : "As condições de fidelidade serão definidas no contrato."}`,
    currentY,
  );
  currentY = paragraph(
    proposta.multaTipo || proposta.multaPct
      ? `Rescisão: ${text(proposta.multaTipo)}${proposta.multaPct ? `, multa de ${proposta.multaPct}%.` : "."}`
      : "A rescisão seguirá as condições acordadas entre as partes no contrato de locação.",
    currentY,
  );

  currentY = addPageIfNeeded(currentY, 55);
  currentY = sectionTitle("Responsabilidades da contratante", currentY);
  currentY = paragraph(
    "Efetuar os pagamentos nas datas acordadas, disponibilizar operador devidamente treinado, zelar pela guarda do equipamento e cumprir as condições de operação, manutenção e abastecimento definidas no contrato.",
    currentY,
  );
  currentY = paragraph(
    "A contratante deverá comunicar imediatamente qualquer ocorrência, defeito ou paralisação do equipamento para que sejam tomadas as providências necessárias.",
    currentY,
  );

  currentY = addPageIfNeeded(currentY, 60);
  currentY = sectionTitle("Seguro", currentY);
  currentY = paragraph(text(proposta.seguro || proposta.temSeguro, "As condições de seguro serão apresentadas no contrato."), currentY);
  currentY = paragraph(
    "Os riscos não cobertos pela apólice, quando ocorridos, serão de responsabilidade da contratante, conforme as condições contratadas.",
    currentY,
  );

  currentY = addPageIfNeeded(currentY, 60);
  currentY = sectionTitle("Condições de faturamento", currentY);
  currentY = paragraph(
    `Ciclo de medição: ${text(proposta.ciclo)}. Condição de pagamento: ${text(proposta.pagamento)}. ${proposta.manutTipo ? `Manutenção: ${proposta.manutTipo}.` : ""}`,
    currentY,
  );
  if (proposta.obs) currentY = paragraph(proposta.obs, currentY);

  currentY = addPageIfNeeded(currentY, 45);
  currentY = paragraph(
    "Esta proposta comercial, uma vez aprovada pela contratante, integra o contrato de locação para todos os efeitos. Em caso de divergência, prevalecerão as condições formalizadas no contrato assinado pelas partes.",
    currentY + 4,
  );
  currentY = paragraph("Agradecemos a oportunidade e permanecemos à disposição para esclarecer dúvidas.", currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...red);
  doc.text("Equipe MH3 Rental", margin, currentY + 4);

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(`${page}/${totalPages}`, 196, 287, { align: "right" });
  }

  const nomeArquivo = `Proposta_${proposta.numero || proposta.id}_${proposta.contratante || "Cliente"}`
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.setProperties({ title: `Proposta - ${proposta.contratante || "Cliente"}` });
  doc.save(`${nomeArquivo}.pdf`);
}
