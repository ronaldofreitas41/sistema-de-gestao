import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ManutencaoPDF = {
  id: string;
  osNum?: string | null;
  placa?: string | null;
  tipo?: string | null;
  en?: string | null;
  sa?: string | null;
  km?: string | number | null;
  hr?: string | number | null;
  pkm?: string | number | null;
  phr?: string | number | null;
  custo?: string | null;
  status?: string | null;
  finStatus?: string | null;
  resp?: string | null;
  ob?: string | null;
  eqLbl?: string | null;
  lancs?: unknown;
  checklist?: unknown;
  fotos?: unknown;
};

type ChecklistEntry = {
  label: string;
  completed: boolean;
};

type ProductEntry = {
  description: string;
  type: string;
  quantity: string;
  amount: number;
};

type PhotoEntry = {
  label: string;
  source: string;
};

type Rgb = [number, number, number];

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? value.slice(0, 10) : value;
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCost(value?: string | null) {
  if (!value) return "—";
  const amount = Number(value.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(amount) ? formatCurrency(amount) : value;
}

function getChecklist(value: unknown): ChecklistEntry[] {
  const parsed = parseJson(value);
  const root = parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : undefined;
  const entries = Array.isArray(parsed)
    ? parsed
    : Array.isArray(root?.itens)
      ? root.itens
      : Array.isArray(root?.items)
        ? root.items
        : Array.isArray(root?.respostas)
          ? root.respostas
          : [];

  return entries.flatMap((entry): ChecklistEntry[] => {
    if (typeof entry === "string") return [{ label: entry, completed: true }];
    if (!entry || typeof entry !== "object") return [];

    const item = entry as Record<string, unknown>;
    const label = item.nome ?? item.descricao ?? item.texto ?? item.item ?? item.label;
    if (!label) return [];
    const state = item.concluido ?? item.checked ?? item.ok ?? item.feito ?? item.status;
    const completed = typeof state === "boolean"
      ? state
      : ["sim", "ok", "feito", "concluido", "concluida", "true", "1"]
        .includes(String(state ?? "").toLowerCase());

    return [{ label: String(label), completed }];
  });
}

function getProducts(value: unknown): ProductEntry[] {
  const parsed = parseJson(value);
  const root = parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : undefined;
  const entries = Array.isArray(parsed)
    ? parsed
    : Array.isArray(root?.itens)
      ? root.itens
      : Array.isArray(root?.items)
        ? root.items
        : Array.isArray(root?.lancamentos)
          ? root.lancamentos
          : [];

  return entries.flatMap((entry): ProductEntry[] => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const description = item.descricao ?? item.desc ?? item.nome ?? item.item;
    if (!description) return [];
    const amountValue = Number(item.valor ?? item.val ?? item.custo ?? 0);
    return [{
      description: String(description),
      type: String(item.tipo ?? "Peça"),
      quantity: String(item.quantidade ?? item.qtd ?? 1),
      amount: Number.isFinite(amountValue) ? amountValue : 0,
    }];
  });
}

function getPhotos(value: unknown): PhotoEntry[] {
  const parsed = parseJson(value);
  if (Array.isArray(parsed)) {
    return parsed.flatMap((entry, index) => {
      if (typeof entry === "string") return [{ label: `Foto ${index + 1}`, source: entry }];
      if (entry && typeof entry === "object") {
        const photo = entry as Record<string, unknown>;
        const source = photo.src ?? photo.url ?? photo.data;
        return typeof source === "string"
          ? [{ label: String(photo.nome ?? photo.label ?? `Foto ${index + 1}`), source }]
          : [];
      }
      return [];
    });
  }

  if (!parsed || typeof parsed !== "object") return [];
  return Object.entries(parsed as Record<string, unknown>).flatMap(([group, value]) => {
    const entries = Array.isArray(value) ? value : [value];
    return entries.flatMap((entry, index) => {
      if (typeof entry === "string" && entry.startsWith("data:image/")) {
        return [{ label: `${group} · Foto ${index + 1}`, source: entry }];
      }
      if (entry && typeof entry === "object") {
        const photo = entry as Record<string, unknown>;
        const source = photo.src ?? photo.url ?? photo.data;
        return typeof source === "string"
          ? [{ label: String(photo.nome ?? `${group} · Foto ${index + 1}`), source }]
          : [];
      }
      return [];
    });
  });
}

export async function printManutencaoPDF(os: ManutencaoPDF) {
  const printWindow = window.open("about:blank", "_blank");
  if (!printWindow) {
    alert("Permita a abertura de uma nova janela para imprimir a O.S.");
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const red: Rgb = [190, 0, 0];
  const dark: Rgb = [45, 45, 45];
  const gray: Rgb = [145, 145, 145];
  const light: Rgb = [226, 228, 230];
  const pageWidth = 210;
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
    doc.text("ORDEM DE SERVIÇO", pageWidth - margin, 20, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...gray);
    doc.text(`${os.osNum || `OS-${os.id}`} · ${os.placa || os.eqLbl || ""}`, pageWidth - margin, 28, {
      align: "right",
    });
    doc.setDrawColor(...red);
    doc.setLineWidth(1.1);
    doc.line(0, 35, pageWidth, 35);
  };

  const drawFooter = (page: number, total: number) => {
    doc.setFillColor(28, 28, 28);
    doc.rect(0, 270, pageWidth, 18, "F");
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(10);
    doc.setTextColor(245, 245, 245);
    doc.text("MH3 RENTAL LTDA", pageWidth / 2, 277, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(220, 220, 220);
    doc.text("CNPJ: 26.881.195/0001-10 · Rodovia BR 381, km 361 — João Monlevade/MG", pageWidth / 2, 282, { align: "center" });
    doc.text("(31) 99977-6105 · comercial@mh3rental.com.br", pageWidth / 2, 286, { align: "center" });
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 288, pageWidth, 9, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(`Pág. ${page} de ${total}`, pageWidth - margin, 294, { align: "right" });
  };

  const fields: [string, string][] = [
    ["Nº OS", os.osNum || `OS-${os.id}`],
    ["TIPO", os.tipo || "—"],
    ["VEÍCULO / EQUIPAMENTO", os.placa || os.eqLbl || "—"],
    ["STATUS", os.status || "—"],
    ["ENTRADA | SAÍDA", `${formatDate(os.en)} | ${formatDate(os.sa)}`],
    ["KM / HORÍMETRO", `${os.km ?? "—"} / ${os.hr ? `${os.hr}h` : "—"}`],
    ["PRÓXIMA REVISÃO", `${os.pkm ? `${os.pkm}km` : "—"} / ${os.phr ? `${os.phr}h` : "—"}`],
    ["RESPONSÁVEL", os.resp || "—"],
    ["CUSTO", formatCost(os.custo)],
  ];
  const checklist = getChecklist(os.checklist);
  const products = getProducts(os.lancs);
  const photos = getPhotos(os.fotos);

  drawHeader();
  doc.setFillColor(250, 251, 252);
  doc.setDrawColor(...light);
  doc.roundedRect(margin, 42, contentWidth, 49, 2.5, 2.5, "FD");

  const columns = 3;
  const columnWidth = contentWidth / columns;
  fields.forEach(([label, raw], index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = margin + 5 + column * columnWidth;
    const y = 49 + row * 14.5;
    if (column > 0) {
      doc.setDrawColor(...light);
      doc.line(margin + column * columnWidth, y - 5, margin + column * columnWidth, y + 8);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...gray);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(index === 4 ? 8.5 : 9.5);
    doc.setTextColor(...dark);
    const fieldLines = doc.splitTextToSize(String(raw || "—"), columnWidth - 11);
    doc.text(fieldLines.slice(0, index === 4 ? 1 : 2), x, y + 5);
    if (column === columns - 1 && row < 2) {
      doc.setDrawColor(...light);
      doc.line(margin + 5, y + 10, pageWidth - margin - 5, y + 10);
    }
  });

  let currentY = 97;
  const drawSection = (title: string) => {
    if (currentY + 13 > 270) {
      doc.addPage();
      currentY = 18;
    }
    doc.setFillColor(...red);
    doc.roundedRect(margin, currentY - 4, 1.5, 6, 0.7, 0.7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...red);
    doc.text(title.toUpperCase(), margin + 4, currentY + 1);
    currentY += 8;
  };

  drawSection(`Checklist (${checklist.filter((item) => item.completed).length}/${checklist.length})`);
  const checklistHeight = Math.max(14, checklist.length * 6.5 + 7);
  if (currentY + checklistHeight > 270) {
    doc.addPage();
    currentY = 18;
  }
  doc.setFillColor(250, 251, 252);
  doc.setDrawColor(...light);
  doc.roundedRect(margin, currentY, contentWidth, checklistHeight, 2, 2, "FD");
  if (checklist.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text("— sem checklist —", margin + 5, currentY + 8);
  } else {
    checklist.forEach((item, index) => {
      const y = currentY + 7 + index * 6.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const checkColor: Rgb = item.completed ? [36, 137, 76] : gray;
      doc.setTextColor(...checkColor);
      doc.text(item.completed ? "✓" : "○", margin + 5, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...gray);
      doc.text(item.label, margin + 10, y);
      if (item.completed) {
        const labelWidth = doc.getTextWidth(item.label);
        doc.setDrawColor(...gray);
        doc.setLineWidth(0.25);
        doc.line(margin + 10, y - 1, margin + 10 + labelWidth, y - 1);
      }
      if (index < checklist.length - 1) {
        doc.setDrawColor(...light);
        doc.line(margin + 4, y + 2.5, pageWidth - margin - 4, y + 2.5);
      }
    });
  }
  currentY += checklistHeight + 6;

  drawSection("Produtos / Peças");
  const productRows = products.length
    ? products.map((item) => [
        item.description,
        item.type,
        `${item.quantity}x`,
        formatCurrency(item.amount),
      ])
    : [["—", "—", "—", formatCurrency(0)]];
  const total = products.reduce((sum, item) => sum + item.amount, 0);
  autoTable(doc, {
    startY: currentY - 1,
    head: [["DESCRIÇÃO", "TIPO", "QTD", "VALOR"]],
    body: productRows,
    foot: [["", "", "TOTAL", formatCurrency(total)]],
    theme: "grid",
    margin: { left: margin, right: margin, bottom: 26 },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: dark,
      cellPadding: 3,
      lineColor: light,
      lineWidth: 0.25,
      valign: "middle",
    },
    headStyles: {
      fillColor: red,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    footStyles: {
      fillColor: [255, 245, 246],
      textColor: red,
      fontStyle: "bold",
      halign: "right",
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 42, halign: "right", fontStyle: "bold", textColor: red },
    },
  });
  currentY = (doc as any).lastAutoTable.finalY + 7;

  if (os.ob) {
    drawSection("Observações");
    const observationLines = doc.splitTextToSize(os.ob, contentWidth - 8);
    const observationHeight = Math.max(13, observationLines.length * 4.5 + 7);
    if (currentY + observationHeight > 266) {
      doc.addPage();
      currentY = 18;
      drawSection("Observações");
    }
    doc.setFillColor(250, 251, 252);
    doc.setDrawColor(...light);
    doc.roundedRect(margin, currentY, contentWidth, observationHeight, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text(observationLines, margin + 4, currentY + 7);
    currentY += observationHeight + 7;
  }

  drawSection("Fotos");
  const photoRows = photos.length ? photos : [
    { label: "", source: "" },
    { label: "", source: "" },
  ];
  const photoColumns = 2;
  const photoGap = 3;
  const photoWidth = (contentWidth - photoGap) / photoColumns;
  for (let index = 0; index < photoRows.length; index += photoColumns) {
    const row = photoRows.slice(index, index + photoColumns);
    const height = row.some((photo) => photo.source) ? 43 : 11;
    if (currentY + height > 266) {
      doc.addPage();
      currentY = 18;
    }
    row.forEach((photo, column) => {
      const x = margin + column * (photoWidth + photoGap);
      doc.setDrawColor(...light);
      doc.roundedRect(x, currentY, photoWidth, height, 1.7, 1.7, "S");
      doc.setFillColor(...red);
      doc.circle(x + 2, currentY + (photo.source ? 6 : 5.5), 0.9, "F");
      if (photo.source) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...gray);
        doc.text(photo.label, x + 5, currentY + 6.5);
        try {
          const format = photo.source.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          const image = doc.getImageProperties(photo.source);
          const box = { x: x + 3, y: currentY + 10, w: photoWidth - 6, h: height - 12 };
          const scale = Math.min(box.w / image.width, box.h / image.height);
          const width = image.width * scale;
          const imageHeight = image.height * scale;
          doc.addImage(
            photo.source,
            format,
            box.x + (box.w - width) / 2,
            box.y + (box.h - imageHeight) / 2,
            width,
            imageHeight,
            undefined,
            "FAST",
          );
        } catch {
          doc.setFontSize(7.5);
          doc.text("Imagem indisponível", x + 5, currentY + 23);
        }
      }
    });
    currentY += height + 3;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    drawFooter(page, pageCount);
  }

  doc.setProperties({ title: `Ordem de Serviço ${os.osNum || os.id}` });
  doc.autoPrint();
  printWindow.location.href = doc.output("bloburl").toString();
}