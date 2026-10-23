export type OrientacaoPdf = "landscape" | "portrait";

type ResolverOrientacao = (orientacao: OrientacaoPdf | null) => void;
type OrientacaoHandler = (resolver: ResolverOrientacao) => void;

let orientacaoHandler: OrientacaoHandler | null = null;

export function registerOrientacaoPdfHandler(handler: OrientacaoHandler) {
  orientacaoHandler = handler;
  return () => {
    if (orientacaoHandler === handler) orientacaoHandler = null;
  };
}

/** Abre o modal de orientação do PDF. Resolve com a escolha, ou null se o usuário cancelar. */
export function escolherOrientacaoPdf(): Promise<OrientacaoPdf | null> {
  if (!orientacaoHandler) return Promise.resolve("landscape");
  return new Promise((resolve) => orientacaoHandler?.(resolve));
}
