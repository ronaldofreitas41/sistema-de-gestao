import { LayoutDashboard } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  resource?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface Usuario {
  id: string;
  nome: string;
  login: string;
  perfil: string;
  empresaId?: number | null;
}

export interface ApiResponse {
  data?: any;
  error?: string;
  configured?: boolean;
}

interface ContasPagarResponse {
  data?: ContaPagar[];
  error?: string;
  configured?: boolean;
}
export interface Booking {
  id: string;
  client: string;
  vehicle: string;
  date: string;
  status: string;
}

export interface ContaPagar {
  id: string | number;
  descricao?: string | null;
  fornecedor?: string | null;
  vencimento?: string | null;
  valor?: number | string
  status?: string | null;
  tipo?: string | null;
}

export interface Despesa {
  id: string;
  descricao: string;
  categoria: string;
  fornecedor: string;
  data_competencia: string;
  data_vencimento: string;
  data_pagamento: string | null;
  valor: string;
  status_disp: "pago" | "pendente" | string;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
  conta_banco_id: string | null;
  conta_banco: string | null;
  placa: string | null;
  antigo: boolean;
  num_desp: string | null;
}