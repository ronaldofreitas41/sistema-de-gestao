/** Mantém só os dígitos e acrescenta o DDI 55 quando o número parece nacional. */
function normalizarTelefone(telefone?: string | null) {
  const digitos = String(telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return "";
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}

/**
 * Abre o WhatsApp (aplicativo ou WhatsApp Web, conforme o computador) com a mensagem pronta.
 * O PDF não pode ser anexado automaticamente: o usuário baixa o PDF e anexa na conversa.
 */
export function compartilharWhatsApp(mensagem: string, telefone?: string | null) {
  const numero = normalizarTelefone(telefone);
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
