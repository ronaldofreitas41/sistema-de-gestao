import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { entregarPdf } from "@/lib/pdf/entrega";
import type { OrientacaoPdf } from "@/lib/pdf/orientacao";

export type RomaneioPDF = {
  numero?: string | null;
  reformadora?: string | null;
  data_saida?: string | null;
  previsao_retorno?: string | null;
  observacoes?: string | null;
  itens: Array<{
    pneu?: {
      codigo?: string | null;
      numero?: string | null;
      marca?: string | null;
      modelo?: string | null;
      medida?: string | null;
      dot?: string | null;
      condicao?: string | null;
    } | null;
  }>;
};

function formatDate(value?: string | null) {
  const iso = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : value || "—";
}

/** Romaneio de saída para reforma em PDF (baixa sozinho, sem depender de pop-up). */
export function gerarPdfRomaneio(romaneio: RomaneioPDF, orientacao: OrientacaoPdf = "landscape") {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: orientacao });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(190, 0, 0);
  doc.text(`Romaneio de saída para reforma ${romaneio.numero ?? ""}`.trim(), margin, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(45, 45, 45);
  doc.text(`Reformadora: ${romaneio.reformadora ?? "—"}`, margin, 27);
  doc.text(
    `Data de saída: ${formatDate(romaneio.data_saida)}    Previsão de retorno: ${formatDate(romaneio.previsao_retorno)}`,
    margin,
    33,
  );
  let y = 39;
  if (romaneio.observacoes) {
    const linhas = doc.splitTextToSize(`Observações: ${romaneio.observacoes}`, pageWidth - margin * 2);
    doc.text(linhas, margin, y);
    y += linhas.length * 5;
  }

  autoTable(doc, {
    startY: y + 2,
    head: [["Código", "Nº pneu", "Marca / modelo", "Medida", "DOT", "Condição", "Observação"]],
    body: romaneio.itens.map((item) => [
      item.pneu?.codigo ?? "",
      item.pneu?.numero ?? "",
      `${item.pneu?.marca ?? ""} ${item.pneu?.modelo ?? ""}`.trim(),
      item.pneu?.medida ?? "",
      item.pneu?.dot ?? "",
      item.pneu?.condicao ?? "",
      "",
    ]),
    theme: "grid",
    margin: { left: margin, right: margin, bottom: 30 },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5, lineColor: [150, 150, 150], lineWidth: 0.2 },
    headStyles: { fillColor: [190, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
  });

  let fim = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.text(`Total: ${romaneio.itens.length} pneu(s)`, margin, fim);
  fim += 28;
  if (fim > pageHeight - 15) {
    doc.addPage();
    fim = 40;
  }
  doc.setDrawColor(0, 0, 0);
  const larguraLinha = Math.min(100, (pageWidth - margin * 2) / 2 - 15);
  doc.line(margin + 10, fim, margin + 10 + larguraLinha, fim);
  doc.line(pageWidth - margin - 10 - larguraLinha, fim, pageWidth - margin - 10, fim);
  doc.setFontSize(9);
  doc.text("Responsável MH3", margin + 10 + larguraLinha / 2, fim + 5, { align: "center" });
  doc.text("Reformadora", pageWidth - margin - 10 - larguraLinha / 2, fim + 5, { align: "center" });

  return entregarPdf(doc, `Romaneio-${romaneio.numero ?? "pneus"}.pdf`);
}
