/** Mantém só os dígitos e acrescenta o DDI 55 quando o número parece nacional. */
function normalizarTelefone(telefone?: string | null) {
  const digitos = String(telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return "";
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}

function baixarArquivo(arquivo: File) {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = arquivo.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Compartilha a mensagem (e o PDF, quando houver) pelo WhatsApp.
 * Com arquivo, usa o compartilhamento do sistema (anexa o PDF direto no WhatsApp). Se o navegador
 * não suportar, baixa o PDF e abre a conversa com a mensagem pronta para o usuário anexar.
 */
export async function compartilharWhatsApp(
  mensagem: string,
  telefone?: string | null,
  arquivo?: File | null,
) {
  if (arquivo && typeof navigator !== "undefined" && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], text: mensagem, title: arquivo.name });
      return;
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === "AbortError") return;
    }
  }

  if (arquivo) baixarArquivo(arquivo);
  const numero = normalizarTelefone(telefone);
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
