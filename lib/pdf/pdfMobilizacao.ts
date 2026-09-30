import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { gruposFotos } from "@/lib/common";
import { Mobilizacao } from "@/lib/types";

type Rgb = [number, number, number];

export function generateMobilizacaoPDF(mobilizacao: Mobilizacao) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const red: Rgb = [190, 0, 0];
  const dark: Rgb = [45, 45, 45];
  const gray: Rgb = [145, 145, 145];
  const light: Rgb = [226, 228, 230];
  const margin = 14;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 18;

  const value = (input: unknown, fallback = "—") =>
    input === undefined || input === null || input === "" ? fallback : String(input);

  const formatDate = (input?: string | null) => {
    if (!input) return "—";
    const localDate = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (localDate) return `${localDate[3]}/${localDate[2]}/${localDate[1]}`;
    const brazilianDate = input.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return brazilianDate ? input.slice(0, 10) : input;
  };

  const addPage = () => {
    doc.addPage("a4", "portrait");
    currentY = 17;
  };

  const ensureSpace = (height: number) => {
    if (currentY + height > 266) addPage();
  };

  const drawHeader = () => {
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(35);
    doc.setTextColor(...red);
    doc.text("MH3", margin, 29);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("RENTAL", margin + 49, 28);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.setTextColor(...red);
    doc.text("MOBILIZAÇÃO", pageWidth - margin, 20, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...gray);
    const subtitle = `${value(mobilizacao.tipo, "VISTORIA DE SAÍDA").toUpperCase()} · ${value(mobilizacao.codigo, `ID ${mobilizacao.id}`)}`;
    doc.text(subtitle, pageWidth - margin, 28, { align: "right", maxWidth: 115 });
    doc.setDrawColor(...red);
    doc.setLineWidth(1.1);
    doc.line(0, 34, pageWidth, 34);
  };

  const sectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFillColor(...red);
    doc.roundedRect(margin, currentY - 3, 1.5, 6, 0.7, 0.7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...red);
    doc.text(title.toUpperCase(), margin + 4, currentY + 2);
    currentY += 9;
  };

  const drawInfoCard = () => {
    const fields = [
      ["ENTREGUE AO CONTRATANTE", `${formatDate(mobilizacao.data)}${mobilizacao.responsavel ? ` · ${mobilizacao.responsavel}` : ""}`],
      ["SITUAÇÃO", value(mobilizacao.status, "Vigente")],
      ["REGISTRADO POR", value(mobilizacao.responsavel)],
      ["SAÍDA / ORIGEM", value(mobilizacao.local_origem)],
      ["TIPO", value(mobilizacao.tipo).split("(")[0].trim()],
      ["STATUS", value(mobilizacao.status, "Vigente")],
      ["CÓDIGO", value(mobilizacao.codigo, `MOB-${String(mobilizacao.id).padStart(5, "0")}`)],
      ["CONTRATANTE / CLIENTE", value(mobilizacao.contratante || mobilizacao.cliente)],
      ["SAÍDA", formatDate(mobilizacao.data)],
      ["MARCA / FABRICANTE", value(mobilizacao.marca_modelo?.split(" ")[0])],
      ["MODELO", value(mobilizacao.marca_modelo?.split(" ").slice(1).join(" "))],
      ["ANO", value(mobilizacao.ano)],
      ["TIPO DE EQUIPAMENTO", value(mobilizacao.tipo_equipamento)],
      ["DESTINO", value(mobilizacao.local_destino)],
      ["CHEGADA / RETORNO", formatDate(mobilizacao.data_chegada)],
      ["KM", value(mobilizacao.km)],
      ["HORÍMETRO", value(mobilizacao.horimetro)],
      ["ESTEPE", value(mobilizacao.estepe)],
    ];
    const columns = 3;
    const rows = Math.ceil(fields.length / columns);
    const rowHeight = 13;
    const top = currentY;
    const cardHeight = rows * rowHeight + 5;
    doc.setFillColor(250, 251, 252);
    doc.setDrawColor(...light);
    doc.roundedRect(margin, top, contentWidth, cardHeight, 2.5, 2.5, "FD");

    fields.forEach(([label, fieldValue], index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const columnWidth = contentWidth / columns;
      const x = margin + 5 + column * columnWidth;
      const y = top + 7 + row * rowHeight;
      if (column > 0) {
        doc.setDrawColor(...light);
        doc.line(margin + column * columnWidth, y - 5, margin + column * columnWidth, y + 5);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...gray);
      doc.text(label, x, y - 1);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.2);
      doc.setTextColor(...dark);
      const wrapped = doc.splitTextToSize(value(fieldValue), columnWidth - 12);
      doc.text(wrapped.slice(0, 1), x, y + 4);
      if (column === columns - 1 && row < rows - 1) {
        doc.setDrawColor(...light);
        doc.line(margin + 5, y + 8, pageWidth - margin - 5, y + 8);
      }
    });
    currentY += cardHeight + 7;
  };

  const drawFooter = (page: number, total: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(`Pág. ${page} de ${total}`, pageWidth - margin, 290, { align: "right" });
  };

  drawHeader();
  currentY = 42;
  drawInfoCard();

  sectionTitle("Pneus por eixo");
  const tires = Object.entries(mobilizacao.pneus_por_eixo || {}).map(([axle, details]) => {
    const tire = details?.pneu || "";
    const measure = details?.rebaba || "";
    const returned = details?.retornado || "";
    return [axle, tire || "—", measure || "—", returned || "—"];
  });
  autoTable(doc, {
    startY: currentY - 1,
    head: [["EIXO", "Nº MH3", "MEDIDA", "REFORMADO"]],
    body: tires.length ? tires : [["—", "—", "—", "—"]],
    theme: "grid",
    margin: { left: margin, right: margin, bottom: 24 },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: dark,
      cellPadding: 3,
      lineColor: light,
      lineWidth: 0.25,
    },
    headStyles: {
      fillColor: red,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { minCellHeight: 7 },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 45 },
      2: { cellWidth: 47 },
      3: { cellWidth: "auto" },
    },
  });
  currentY = (doc as any).lastAutoTable.finalY + 6;

  sectionTitle("Observações");
  const observation = mobilizacao.observacoes || "— sem observações —";
  const observationLines = doc.splitTextToSize(observation, contentWidth - 8);
  const observationHeight = Math.max(13, observationLines.length * 4.5 + 7);
  ensureSpace(observationHeight + 8);
  doc.setFillColor(250, 251, 252);
  doc.setDrawColor(...light);
  doc.roundedRect(margin, currentY, contentWidth, observationHeight, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...dark);
  doc.text(observationLines, margin + 4, currentY + 7);
  currentY += observationHeight + 7;

  sectionTitle("Fotos");
  const photoItems = gruposFotos.flatMap((group) => {
    const photos = mobilizacao.fotos?.[group.grupo] || [];
    const title = group.titulo.replace(/^[^A-Za-zÀ-ÿ]+/, "");
    return photos.length
      ? photos.map((src, index) => ({ title: `${title} · Foto ${index + 1}`, src }))
      : [{ title, src: "" }];
  });
  const columns = 2;
  const gap = 3;
  const cellWidth = (contentWidth - gap) / columns;
  for (let index = 0; index < photoItems.length; index += columns) {
    const rowItems = photoItems.slice(index, index + columns);
    const cellHeight = rowItems.some((item) => item.src) ? 44 : 10;
    ensureSpace(cellHeight + 3);
    rowItems.forEach((item, column) => {
      const x = margin + column * (cellWidth + gap);
      doc.setDrawColor(...light);
      doc.setLineWidth(0.35);
      doc.roundedRect(x, currentY, cellWidth, cellHeight, 1.7, 1.7, "S");
      doc.setFillColor(...red);
      doc.circle(x + 2.2, currentY + 7, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...dark);
      doc.text(doc.splitTextToSize(item.title, cellWidth - 10).slice(0, 1), x + 5, currentY + (item.src ? 8 : 6.5));

      if (item.src) {
        try {
          const imageFormat = item.src.startsWith("data:image/jpeg")
            ? "JPEG"
            : item.src.startsWith("data:image/webp")
              ? "WEBP"
              : "PNG";
          const image = doc.getImageProperties(item.src);
          const boxX = x + 3;
          const boxY = currentY + 11;
          const boxWidth = cellWidth - 6;
          const boxHeight = cellHeight - 14;
          const scale = Math.min(boxWidth / image.width, boxHeight / image.height);
          const imageWidth = image.width * scale;
          const imageHeight = image.height * scale;
          doc.addImage(
            item.src,
            imageFormat,
            boxX + (boxWidth - imageWidth) / 2,
            boxY + (boxHeight - imageHeight) / 2,
            imageWidth,
            imageHeight,
            undefined,
            "FAST",
          );
        } catch {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...gray);
          doc.text("Não foi possível exibir esta imagem", x + 5, currentY + 27);
        }
      }
    });
    currentY += cellHeight + 3;
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    drawFooter(page, totalPages);
  }

  doc.setPage(totalPages);
  doc.setFillColor(28, 28, 28);
  doc.rect(0, 266, pageWidth, 18, "F");
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(12);
  doc.setTextColor(245, 245, 245);
  doc.text("MH3 RENTAL LTDA", pageWidth / 2, 273, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(220, 220, 220);
  doc.text("CNPJ: 26.881.195/0001-10 · Rodovia BR 381, km 361 — João Monlevade/MG", pageWidth / 2, 278, { align: "center" });
  doc.setPage(totalPages);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(`Pág. ${totalPages} de ${totalPages}`, pageWidth - margin, 290, { align: "right" });

  const filename = `Mobilizacao_${mobilizacao.codigo || mobilizacao.id}_${mobilizacao.contratante || "Contratante"}`
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.setProperties({ title: `Mobilização - ${mobilizacao.contratante || mobilizacao.id}` });
  doc.save(`${filename}.pdf`);
}