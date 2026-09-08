import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ApiResponse, Permissoes } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("pt-BR");
}

export function getToken() {
  if (typeof window === "undefined") return "";

  return sessionStorage.getItem("mh3_token") || "";
}

export function isVencida(value: unknown) {
  if (!value) return false;

  const date = new Date(String(value));
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date < today;
}

export async function fetcher(url: string): Promise<ApiResponse> {
  const token = getToken();

  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Não foi possível carregar as contas.");
  }

  return data;
}

export function normalizarPermissoes(
  permissoes: Permissoes | string | null | undefined
): Permissoes {
  if (!permissoes) {
    return {};
  }

  if (typeof permissoes === "object") {
    return permissoes;
  }

  try {
    const resultado = JSON.parse(permissoes);

    if (
      resultado &&
      typeof resultado === "object" &&
      !Array.isArray(resultado)
    ) {
      return resultado as Permissoes;
    }

    return {};
  } catch (error) {
    console.error("Erro ao interpretar permissões:", error);
    return {};
  }
}

export function contarPermissoes(
  permissoes: Permissoes | string | null | undefined
) {
  const permissoesNormalizadas = normalizarPermissoes(permissoes);

  const valores = Object.values(permissoesNormalizadas);

  return {
    ativas: valores.filter((valor) => valor === true).length,
    total: valores.length,
  };
}

export function formatarPermissoes(
  permissoes: Permissoes | string | null | undefined
) {
  const { ativas, total } = contarPermissoes(permissoes);

  return `${ativas}/${total}`;
}

