/** Chama a API e lança Error com a mensagem do servidor quando a resposta não for OK. */
export async function chamarApi<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" | "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Não foi possível concluir a operação.");
  }
  return data as T;
}

export function mensagemErro(erro: unknown, padrao = "Não foi possível concluir a operação.") {
  return erro instanceof Error ? erro.message : padrao;
}
