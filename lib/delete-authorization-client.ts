export type DeleteAuthorization = {
  senha: string;
};

type ResolveAuthorization = (authorization: DeleteAuthorization | null) => void;
type AuthorizationHandler = (resolve: ResolveAuthorization) => void;

let authorizationHandler: AuthorizationHandler | null = null;

export function registerDeleteAuthorizationHandler(handler: AuthorizationHandler) {
  authorizationHandler = handler;
  return () => {
    if (authorizationHandler === handler) authorizationHandler = null;
  };
}

export function requestDeleteAuthorization(): Promise<DeleteAuthorization | null> {
  if (!authorizationHandler) {
    return Promise.reject(new Error("A confirmação de exclusão está indisponível."));
  }

  return new Promise((resolve) => authorizationHandler?.(resolve));
}
