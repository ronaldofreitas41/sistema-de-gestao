import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { entregarPdf, type EntregaPdf } from "@/lib/pdf/entrega";
import type { OrientacaoPdf } from "@/lib/pdf/orientacao";

export type VendaPDF = {
  id: string;
  numero?: string | null;
  cliente: string;
  data?: string | null;
  contato?: string | null;
  pagamento?: string | null;
  vencimento?: string | null;
  observacoes?: string | null;
  status?: string | null;
  em_medicao?: boolean;
  placa_medicao?: string | null;
  sinal_medicao?: string | null;
  sub_total: number;
  desconto: number;
  total: number;
  items: Array<{ desc: string; qtd: number; val: number; tipo?: string }>;
};

type Rgb = [number, number, number];

const STATUS: Record<string, string> = { pendente: "Pendente", faturada: "Faturada", cancelado: "Cancelada" };

function formatDate(value?: string | null) {
  if (!value) return "—";
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : value;
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function gerarPdfVenda(
  venda: VendaPDF,
  modo: EntregaPdf = "baixar",
  orientacao: OrientacaoPdf = "landscape",
) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: orientacao });
  const red: Rgb = [190, 0, 0];
  const dark: Rgb = [45, 45, 45];
  const gray: Rgb = [145, 145, 145];
  const light: Rgb = [226, 228, 230];
  // As medidas derivam do tamanho real da página para valer em paisagem e retrato.
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const rodapeY = pageHeight - 24;
  const limiteConteudo = pageHeight - 27;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const logo = new Image();
  logo.src = "/placeholder.jpg";
  try {
    await new Promise<void>((resolve, reject) => {
      logo.onload = () => resolve();
      logo.onerror = () => reject(new Error("Não foi possível carregar o logo."));
    });
  } catch {
    // O cabeçalho mantém a marca em texto caso o arquivo não carregue.
  }

  const drawHeader = () => {
    if (logo.complete && logo.naturalWidth > 0) {
      doc.addImage(logo, "JPEG", margin, 13, 64, 19);
    } else {
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(34);
      doc.setTextColor(...red);
      doc.text("MH3", margin, 29);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...red);
    doc.text("VENDA / AVARIA", pageWidth - margin, 20, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...gray);
    doc.text(`${venda.numero || venda.id} · ${venda.cliente}`, pageWidth - margin, 28, { align: "right" });
    doc.setDrawColor(...red);
    doc.setLineWidth(1.1);
    doc.line(0, 35, pageWidth, 35);
  };

  const drawFooter = (page: number, total: number) => {
    doc.setFillColor(28, 28, 28);
    doc.rect(0, rodapeY, pageWidth, 18, "F");
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(10);
    doc.setTextColor(245, 245, 245);
    doc.text("MH3 RENTAL LTDA", pageWidth / 2, rodapeY + 7, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(220, 220, 220);
    doc.text("CNPJ: 26.881.195/0001-10 · Rodovia BR 381, km 361 — João Monlevade/MG", pageWidth / 2, rodapeY + 12, { align: "center" });
    doc.text("(31) 99977-6105 · comercial@mh3rental.com.br", pageWidth / 2, rodapeY + 16, { align: "center" });
    doc.setFillColor(255, 255, 255);
    doc.rect(0, rodapeY + 18, pageWidth, 6, "F");
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(`Pág. ${page} de ${total}`, pageWidth - margin, pageHeight - 1.5, { align: "right" });
  };

  const pagamento = venda.em_medicao
    ? `Em medição (${venda.sinal_medicao === "-" ? "desconta" : "acrescenta"}${venda.placa_medicao ? ` · ${venda.placa_medicao}` : ""})`
    : venda.pagamento || "—";
  const fields: [string, string][] = [
    ["Nº VENDA", venda.numero || venda.id],
    ["CLIENTE", venda.cliente || "—"],
    ["DATA", formatDate(venda.data)],
    ["STATUS", STATUS[venda.status ?? ""] ?? venda.status ?? "—"],
    ["PAGAMENTO", pagamento],
    ["VENCIMENTO", venda.em_medicao ? "—" : formatDate(venda.vencimento)],
    ["CONTATO", venda.contato || "—"],
  ];

  drawHeader();
  doc.setFillColor(250, 251, 252);
  doc.setDrawColor(...light);
  const columns = orientacao === "portrait" ? 3 : 4;
  const linhasCampos = Math.ceil(fields.length / columns);
  const alturaCampos = 5 + linhasCampos * 15;
  doc.roundedRect(margin, 42, contentWidth, alturaCampos, 2.5, 2.5, "FD");
  const columnWidth = contentWidth / columns;
  fields.forEach(([label, raw], index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = margin + 5 + column * columnWidth;
    const y = 49 + row * 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...gray);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...dark);
    doc.text(doc.splitTextToSize(String(raw || "—"), columnWidth - 10).slice(0, 2), x, y + 5);
  });

  const linhas = venda.items.length
    ? venda.items.map((item) => [
        item.desc,
        item.tipo || "Produto",
        String(item.qtd),
        formatCurrency(item.val),
        formatCurrency(item.qtd * item.val),
      ])
    : [["—", "—", "—", "—", formatCurrency(0)]];
  const foot: string[][] = [];
  if (venda.desconto > 0) {
    foot.push(["", "", "", "SUBTOTAL", formatCurrency(venda.sub_total)]);
    foot.push(["", "", "", "DESCONTO", `- ${formatCurrency(venda.desconto)}`]);
  }
  foot.push(["", "", "", "TOTAL", formatCurrency(venda.total)]);

  autoTable(doc, {
    startY: 42 + alturaCampos + 7,
    head: [["DESCRIÇÃO", "TIPO", "QTD", "VALOR UNIT.", "SUBTOTAL"]],
    body: linhas,
    foot,
    showFoot: "lastPage",
    theme: "grid",
    margin: { left: margin, right: margin, top: 42, bottom: 30 },
    styles: { font: "helvetica", fontSize: 8.5, textColor: dark, cellPadding: 3, lineColor: light, lineWidth: 0.25, valign: "middle" },
    headStyles: { fillColor: red, textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
    footStyles: { fillColor: [255, 245, 246], textColor: red, fontStyle: "bold", halign: "right" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 38, halign: "right" },
      4: { cellWidth: 42, halign: "right", fontStyle: "bold", textColor: red },
    },
    didDrawPage: (dados) => {
      if (dados.pageNumber > 1) drawHeader();
    },
  });

  if (venda.observacoes) {
    let y = (doc as any).lastAutoTable.finalY + 8;
    const textoObs = doc.splitTextToSize(venda.observacoes, contentWidth - 8);
    const altura = Math.max(13, textoObs.length * 4.5 + 7);
    if (y + altura + 8 > limiteConteudo) {
      doc.addPage();
      drawHeader();
      y = 46;
    }
    doc.setFillColor(...red);
    doc.roundedRect(margin, y - 4, 1.5, 6, 0.7, 0.7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...red);
    doc.text("OBSERVAÇÕES", margin + 4, y + 1);
    doc.setFillColor(250, 251, 252);
    doc.setDrawColor(...light);
    doc.roundedRect(margin, y + 4, contentWidth, altura, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text(textoObs, margin + 4, y + 11);
  }

  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    drawFooter(page, total);
  }

  doc.setProperties({ title: `Venda ${venda.numero || venda.id}` });
  return entregarPdf(doc, `Venda-${venda.numero || venda.id}.pdf`, modo);
}
