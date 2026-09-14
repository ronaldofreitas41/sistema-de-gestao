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
  valor?: number | string;
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

export type Permissoes = Record<string, boolean>;

export interface Usuario {
  id: string;
  nome: string;
  login: string;
  senha?: string;
  perfil: string;
  permissoes: Permissoes | string | null;
  ativo: boolean;
  ultimo_acesso?: string | null;
  criado_em?: string | null;
  codigo_acesso?: string | null;
}

export interface Cliente {
  id: string | number;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  observacoes: string | null;
  obra: string;
}

export interface Ajuda_Motorista {
  id: string;
  empresa: string;
  motorista: string;
  telefone: string;
  valor: number;
  data: string;
  agencia: string;
  conta: string;
  forma_pagamento: string;
  pix: string;
  observacoes: string | null;
  placa: string;
  recorrente: boolean;
  confirma_user: string;
  despesa_id: string;
}

export interface ContasBancarias {
  id: string;
  banco: string;
  nome: string;
  conta: string;
  tipo: string;
  saldo: number;
  saldo_polpanca: number;
  fluxo: boolean;
  agencia: string;
}

export interface Equipamento {
  id: string | number;
  placa?: string;
  frota?: string;
  tipo?: string;
  marca?: string;
  modelo?: string;
  ano?: string;
  renavam?: string;
  chassi?: string;
  km_atual?: number;
  horimetro?: number;
  status?: string;
  observacoes?: string | null;
  criado_em?: string;
  atualizado_em?: string;
  crv?: string;
  estado?: string;
  dt_km_atual?: string;
  prorietario?: string;
  crlv?: string;
  valor_aquisição?: number;
  data_aquisicao?: string;
  situacao_financeira?: string;
  quantidade_parcelas?: string;
  tipo_parcela?: string;
  valor_parcela?: number;
  parcelas_pagas?: string;
  data_primeira_parcela?: string;
  banco_financiamento?: string;
  data_levantamento?: string;
  valor_quitacao_atual?: number;
  valor_atualizado?: number;
  desvalorizacao_anual?: string;
  possui_implemento?: boolean | number;
  tipo_implemento?: string;
  marca_implemento?: string;
  modelo_implemento?: string;
  valor_implemento?: number;
  data_compra_implemento?: string;
  obs_implemento?: string;
  vencimento_licenca_antt?: string;
  cronotacografo_venc?: string;
  seguro_id?: string;
}

export interface Seguro {
  id: string;
  seguradora: string;
  apolice: string;
  data_inicio: string;
  data_fim: string;
  valor: number | null;
  franquia: number | null;
  status: string;
  obs: string;
}

export interface VendaItem {
  id: string;
  desc: string;
  qtd: number;
  val: number;
  tipo: string;
  fonte: string;
}

export interface Venda {
  id: string;
  numero: string;
  cliente: string;
  data: string;
  documento?: string;
  tipo_documento?: string;
  contato?: string;
  pagamento?: string;
  observacoes?: string;
  items: VendaItem[];
  sub_total: number;
  desconto: number;
  total: number;
  status: "pendente" | "pago" | "cancelado";
  faturada: boolean;
  vencimento?: string;
  avaria: boolean;
  em_medicao: boolean;
  sinal_medicao?: "+" | "-";
  placa_medicao?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface Funcionario {
  id: number 
  nome: string;
  cpf?: string 
  rg?: string 
  cnh?: string 
  cnh_validade?: string 
  endereco?: string 
  cargo?: string 
  telefone?: string 
  nascimento?: string 
  emergencia_nome?: string 
  emergencia_tel?: string 
  clt_num?: string 
  pis?: string 
  admissao?: string 
  salario: number 
  beneficio: number 
  seguro_valor: number 
  seguro_vig?: string 
  seguro_seguradora?: string 
  fotos?: unknown;
  arqs?: unknown;
  observacao?: string 
}

export interface Estoque {
  codigo: string;
  descricao: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  estoque_minimo: number;
  custo_unitario: number;
  localizacao: string;
  ativo: boolean;
  tabela_venda: string;
  margem: number;
  nf_num: string;
}

export interface ItemNotaFiscal {
  id: string;
  descicao: string; // Mantido exatamente como no payload
  quantidade: number;
  valor: number;
}

export interface NotaFiscalEntrada {
  id: string;
  numero_nf: string;
  data_emissao: string;
  fornecedor: string;
  cnpj: string;
  items: ItemNotaFiscal[];
  valor: number;
  vencimento: string;
  contas_pagar: boolean;
  status: "pendente" | "pago" | "cancelado" | string;
  observacao: string;
}

export interface Pneu {
  id: string;
  numero: string;
  marca: string;
  modelo: string;
  medida: string;
  dot: string;
  condicao: string;
  valor: string;
  data: string;
  observacao: string | null;
  status: string;
  local: string;
  reformadora: string | null;
  data_saida: string | null;
  previsao_retorno: string | null;
  saiu_reforma: boolean;
}