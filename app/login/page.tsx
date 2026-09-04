"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LockKeyhole, UserRound } from "lucide-react";

interface LoginResponse {
  token?: string;
  error?: string;
  usuario?: {
    id: string;
    nome: string;
    login: string;
    perfil: string;
    empresaId?: number | null;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    if (!login.trim() || !senha) {
      setErro("Preencha o login e a senha.");
      return;
    }

    try {
      setCarregando(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          login: login.trim(),
          senha,
        }),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Usuário ou senha inválidos.");
      }

      if (!data.token) {
        throw new Error("O servidor não retornou o token de autenticação.");
      }

      sessionStorage.setItem("mh3_token", data.token);

      if (data.usuario) {
        sessionStorage.setItem("mh3_usuario", JSON.stringify(data.usuario));
      }

      const redirect = searchParams.get("redirect");

      const destino =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//")
          ? redirect
          : "/dashboard";

      router.replace(destino);
      router.refresh();
    } catch (error) {
      console.error("Erro ao realizar login:", error);

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o login.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-md">
        <div className="mb-6 text-center">
          {/* <p className="mt-2 text-sm text-muted-foreground">
            Gestão inteligente de locadoras
          </p> */}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <img
            className="mx-auto mb-2 flex h-19 w-78 items-center justify-center "
            src="/apple-icon.png"
            alt="MH3 Rental Logo"
          />
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-card-foreground">
              Acesse sua conta
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Informe seu login e senha para continuar.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="login"
                className="text-sm font-medium text-foreground"
              >
                Login
              </label>

              <div className="relative">
                <UserRound
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  id="login"
                  name="login"
                  type="text"
                  value={login}
                  onChange={(event) => {
                    setLogin(event.target.value);
                    if (erro) setErro("");
                  }}
                  placeholder="Digite seu login"
                  autoComplete="username"
                  autoFocus
                  disabled={carregando}
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="senha"
                className="text-sm font-medium text-foreground"
              >
                Senha
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  id="senha"
                  name="senha"
                  type="password"
                  value={senha}
                  onChange={(event) => {
                    setSenha(event.target.value);
                    if (erro) setErro("");
                  }}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  disabled={carregando}
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            {erro && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MH3 Rental. Todos os direitos reservados.
        </p>
      </section>
    </main>
  );
}
