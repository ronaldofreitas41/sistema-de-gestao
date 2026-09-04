import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ApiResponse } from './types';

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

