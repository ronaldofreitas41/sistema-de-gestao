import type jsPDF from "jspdf";

/** "baixar" salva o arquivo na pasta Downloads; "arquivo" devolve o PDF para ser compartilhado (WhatsApp). */
export type EntregaPdf = "baixar" | "arquivo";

export function entregarPdf(doc: jsPDF, nome: string, modo: EntregaPdf = "baixar"): File | undefined {
  if (modo === "arquivo") {
    return new File([doc.output("blob")], nome, { type: "application/pdf" });
  }
  doc.save(nome);
  return undefined;
}
