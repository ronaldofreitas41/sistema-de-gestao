import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CarFront,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Settings2,
  ShieldCheck,
  WalletCards,
  X,
  Receipt,
  BarChart3,
  Database,
  CircleHelp,
  Landmark,
  IdCardLanyard,
  UsersRound,
  ChartLine,
  CircleQuestionMark,
  Truck,
  Wrench,
  Camera,
  Lock,
  Box,
  LibraryBig,
  LoaderPinwheel,
  Siren,
  Handshake,
  FileText,
  Search,
  Check,
  Building2,
} from "lucide-react";
import { NavItem, Permissoes } from "./types";

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Visão geral",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        resource: "dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Financeiro",
    items: [
      {
        href: "/contas-pagar",
        label: "Contas a pagar",
        resource: "contas_pagar",
        icon: Receipt,
      },
      {
        href: "/contas-receber",
        label: "Contas a receber",
        resource: "contas_receber",
        icon: Receipt,
      },
      {
        href: "/fluxo",
        label: "Fluxo de caixa",
        resource: "fluxo",
        icon: Landmark,
      },
      {
        href: "/relatorios",
        label: "Relatórios",
        resource: "relatorios",
        icon: BarChart3,
      },
      {
        href: "/prejuizos",
        label: "Prejuízos",
        resource: "prejuizos",
        icon: ArrowDownRight,
      },
      {
        href: "/funcionarios",
        label: "Funcionarios",
        resource: "funcionarios",
        icon: IdCardLanyard,
      },
    ],
  },
  {
    label: "Faturamento",
    items: [
      {
        href: "/clientes",
        label: "Clientes",
        resource: "clientes",
        icon: UsersRound,
      },
      {
        href: "/parceiros",
        label: "Parceiros",
        resource: "parceiros",
        icon: Handshake,
      },
      {
        href: "/proposta",
        label: "Proposta",
        resource: "propostas",
        icon: Receipt,
      },
      {
        href: "/medicoes",
        label: "Medições",
        resource: "medicoes",
        icon: ChartLine,
      },
      {
        href: "/ajuda-motoristas",
        label: "Ajuda Motoristas",
        resource: "ajudas_motoristas",
        icon: CircleQuestionMark,
      },
    ],
  },
  {
    label: "Frota e Manutenção",
    items: [
      { href: "/frota", label: "Frota ", resource: "frota", icon: Truck },
      {
        href: "/manutencao",
        label: "Manutenção",
        resource: "manutencao",
        icon: Wrench,
      },
      {
        href: "/venda-avaria",
        label: "Venda/Avaria  ",
        resource: "venda_avaria",
        icon: CircleDollarSign,
      },
      {
        href: "/acomp-revisao",
        label: "Acomp. Revisão",
        resource: "acomp_revisao",
        icon: Wrench,
      },
      {
        href: "/mobilizacao",
        label: "Mobilização",
        resource: "mobilizacao",
        icon: Camera,
      },
      { href: "/seguro", label: "Seguro", resource: "seguro", icon: Lock },
    ],
  },
  {
    label: "Estoque e Compras",
    items: [
      { href: "/estoque", label: "Estoque", resource: "estoque", icon: Box },
      { href: "/nf-e", label: "Nf-e", resource: "nf_e", icon: LibraryBig },
      {
        href: "/pneus",
        label: "Pneus",
        resource: "pneus",
        icon: LoaderPinwheel,
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        href: "/pendencias",
        label: "Pendencias",
        resource: "pendencias",
        icon: Siren,
      },
      {
        href: "/tratativas",
        label: "Tratativas",
        resource: "tratativas",
        icon: Handshake,
      },
      { href: "/ajuda", label: "Ajuda", resource: "ajuda", icon: CircleHelp },
    ],
  },
  {
    label: "Configuracoes",
    items: [
      {
        href: "/usuarios",
        label: "Usuarios",
        resource: "usuarios",
        icon: UsersRound,
      },
      {
        href: "/empresas",
        label: "Empresas",
        resource: "empresas",
        icon: Building2,
      },
      {
        href: "/cheklist",
        label: "Checklist",
        resource: "checklist",
        icon: Check,
      },
    ],
  },
];

export type MetricaCard = {
  label: string;
  valor: number;
  percentual?: number;
  tipo: "positivo" | "negativo" | "neutro";
};

export type RelatorioTab = 
  | "financeiro" 
  | "receitas" 
  | "despesas" 
  | "frota" 
  | "clientes" 
  | "estoque" 
  | "os" 
  | "contratos" 
  | "fluxo-caixa" 
  | "contas-pagar" 
  | "contas-receber" 
  | "resultado-placa" 
  | "resultado-geral";

export const modulosPermissoes = navGroups.flatMap((group) =>
  group.items
    .filter((item) => item.resource)
    .map((item) => ({
      resource: item.resource as string,
      label: item.label.trim(),
    })),
);

export const permissoesModulosPadrao: Permissoes = Object.fromEntries(
  modulosPermissoes.flatMap(({ resource }) => [
    [resource, true],
    [`${resource}:editar`, false],
    [`${resource}:excluir`, false],
  ]),
);

export const permissoesPadrao: Permissoes = {
  dash: false,
  whatsapp: false,
  adm: false,
  custo: true,
  preco: true,
  desc: true,
  "estq-edit": false,
  "venda-eq": false,
  "pneu-edit": false,
  rel: false,
  "rel-fin": false,
  "rel-os": true,
  "rel-frota": false,
  "rel-resultado": false,
  "rel-estq": true,
  "rel-cpagar": false,
  "rel-creceber": false,
  "rel-fin-imp": false,
  "rel-os-imp": true,
  "rel-frota-imp": false,
  "rel-resultado-imp": false,
  "rel-estq-imp": true,
  "rel-cpagar-imp": false,
  "rel-creceber-imp": false,
  "contas-dia": false,
  aniversarios: false,
  "confirma-ajuda": true,
  motivacao: true,
  "kpi-fin": false,
  "contas-banco": false,
  "backup-manual": false,
  exportar: false,
  "ajuda-custo": true,
  "ver-auditoria": false,
  "ver-resultado-placa": false,
  "gerenciar-usuarios": false,
  "enviar-email": false,
  seguro: false,
  "doc-veiculo": true,
  frota: true,
  "frota-criar": false,
  "frota-editar": false,
  "frota-excluir": false,
  manut: true,
  "manut-criar": true,
  "manut-editar": true,
  "manut-excluir": false,
  cts: false,
  "cts-criar": false,
  "cts-editar": false,
  "cts-excluir": false,
  meds: false,
  "meds-criar": false,
  "meds-editar": false,
  "meds-excluir": false,
  vend: true,
  "vend-criar": true,
  "vend-editar": true,
  "vend-excluir": false,
  estq: true,
  "estq-criar": true,
  "estq-editar": false,
  "estq-excluir": false,
  desp: false,
  "desp-criar": false,
  "desp-editar": false,
  "desp-excluir": false,
  fin: false,
  "fin-criar": false,
  "fin-editar": false,
  "fin-excluir": false,
  pneus: true,
  "pneus-criar": false,
  "pneus-editar": false,
  "pneus-excluir": false,
  resultado: false,
  "resultado-criar": false,
  "resultado-editar": false,
  "resultado-excluir": false,
  clientes: false,
  "clientes-criar": false,
  "clientes-editar": false,
  "clientes-excluir": false,
  mob: true,
  "mob-criar": false,
  "mob-editar": false,
  "mob-excluir": false,
  func: false,
  "func-criar": false,
  "func-editar": false,
  "func-excluir": false,
  prej: false,
  "prej-criar": false,
  "prej-editar": false,
  "prej-excluir": false,
  sm: true,
  "sm-criar": true,
  "sm-editar": true,
  "sm-excluir": false,
  sist: false,
  "sist-criar": false,
  "sist-editar": false,
  "sist-excluir": false,
  cpagar: false,
  "cpagar-criar": false,
  "cpagar-editar": false,
  "cpagar-excluir": false,
  creceber: false,
  "creceber-criar": false,
  "creceber-editar": false,
  "creceber-excluir": false,
  prop: true,
  "prop-criar": true,
  "prop-editar": true,
  "prop-excluir": false,
  tratativas: false,
  "tratativas-criar": false,
  "tratativas-editar": false,
  "tratativas-excluir": false,
  "fatloc-ver": false,
  "fatloc-criar": false,
  "fatloc-excluir": false,
  "fatloc-enviar": false,
};

export const nomesPermissoes: Record<string, string> = {
  dash: "Dashboard",
  whatsapp: "WhatsApp",
  adm: "Administração",
  custo: "Visualizar custo",
  preco: "Visualizar preço",
  desc: "Visualizar descrição",
  "estq-edit": "Editar estoque",
  "venda-eq": "Vender equipamento",
  "pneu-edit": "Editar pneus",
  rel: "Relatórios",
  "rel-fin": "Relatório financeiro",
  "rel-os": "Relatório de ordens de serviço",
  "rel-frota": "Relatório de frota",
  "rel-resultado": "Relatório de resultado",
  "rel-estq": "Relatório de estoque",
  "rel-cpagar": "Relatório de contas a pagar",
  "rel-creceber": "Relatório de contas a receber",
  "rel-fin-imp": "Imprimir relatório financeiro",
  "rel-os-imp": "Imprimir relatório de OS",
  "rel-frota-imp": "Imprimir relatório de frota",
  "rel-resultado-imp": "Imprimir relatório de resultado",
  "rel-estq-imp": "Imprimir relatório de estoque",
  "rel-cpagar-imp": "Imprimir relatório de contas a pagar",
  "rel-creceber-imp": "Imprimir relatório de contas a receber",
  "contas-dia": "Contas do dia",
  aniversarios: "Aniversários",
  "confirma-ajuda": "Confirmar ajuda",
  motivacao: "Motivação",
  "kpi-fin": "KPIs financeiros",
  "contas-banco": "Contas bancárias",
  "backup-manual": "Backup manual",
  exportar: "Exportar dados",
  "ajuda-custo": "Ajuda de custo",
  "ver-auditoria": "Visualizar auditoria",
  "ver-resultado-placa": "Resultado por placa",
  "gerenciar-usuarios": "Gerenciar usuários",
  "enviar-email": "Enviar e-mail",
  seguro: "Seguros",
  "doc-veiculo": "Documentos do veículo",
  frota: "Frota",
  "frota-criar": "Criar veículo",
  "frota-editar": "Editar veículo",
  "frota-excluir": "Excluir veículo",
  manut: "Manutenção",
  "manut-criar": "Criar manutenção",
  "manut-editar": "Editar manutenção",
  "manut-excluir": "Excluir manutenção",
  cts: "Contratos",
  "cts-criar": "Criar contrato",
  "cts-editar": "Editar contrato",
  "cts-excluir": "Excluir contrato",
  meds: "Medições",
  "meds-criar": "Criar medição",
  "meds-editar": "Editar medição",
  "meds-excluir": "Excluir medição",
  vend: "Vendas",
  "vend-criar": "Criar venda",
  "vend-editar": "Editar venda",
  "vend-excluir": "Excluir venda",
  estq: "Estoque",
  "estq-criar": "Criar item no estoque",
  "estq-editar": "Editar item do estoque",
  "estq-excluir": "Excluir item do estoque",
  desp: "Despesas",
  "desp-criar": "Criar despesa",
  "desp-editar": "Editar despesa",
  "desp-excluir": "Excluir despesa",
  fin: "Financeiro",
  "fin-criar": "Criar lançamento financeiro",
  "fin-editar": "Editar lançamento financeiro",
  "fin-excluir": "Excluir lançamento financeiro",
  pneus: "Pneus",
  "pneus-criar": "Criar pneu",
  "pneus-editar": "Editar pneu",
  "pneus-excluir": "Excluir pneu",
  resultado: "Resultado",
  "resultado-criar": "Criar resultado",
  "resultado-editar": "Editar resultado",
  "resultado-excluir": "Excluir resultado",
  clientes: "Clientes",
  "clientes-criar": "Criar cliente",
  "clientes-editar": "Editar cliente",
  "clientes-excluir": "Excluir cliente",
  mob: "Mobilização",
  "mob-criar": "Criar mobilização",
  "mob-editar": "Editar mobilização",
  "mob-excluir": "Excluir mobilização",
  func: "Funcionários",
  "func-criar": "Criar funcionário",
  "func-editar": "Editar funcionário",
  "func-excluir": "Excluir funcionário",
  prej: "Prejuízos",
  "prej-criar": "Criar prejuízo",
  "prej-editar": "Editar prejuízo",
  "prej-excluir": "Excluir prejuízo",
  sist: "Sistema",
  "sist-criar": "Criar configuração",
  "sist-editar": "Editar configuração",
  "sist-excluir": "Excluir configuração",
  cpagar: "Contas a pagar",
  "cpagar-criar": "Criar conta a pagar",
  "cpagar-editar": "Editar conta a pagar",
  "cpagar-excluir": "Excluir conta a pagar",
  creceber: "Contas a receber",
  "creceber-criar": "Criar conta a receber",
  "creceber-editar": "Editar conta a receber",
  "creceber-excluir": "Excluir conta a receber",
  prop: "Propostas",
  "prop-criar": "Criar proposta",
  "prop-editar": "Editar proposta",
  "prop-excluir": "Excluir proposta",
  tratativas: "Tratativas",
  "tratativas-criar": "Criar tratativa",
  "tratativas-editar": "Editar tratativa",
  "tratativas-excluir": "Excluir tratativa",
  "fatloc-ver": "Visualizar fatura de locação",
  "fatloc-criar": "Criar fatura de locação",
  "fatloc-excluir": "Excluir fatura de locação",
  "fatloc-enviar": "Enviar fatura de locação",
};

export const bancos = [
  { id: 1, nome: "Banco do Brasil" },
  { id: 2, nome: "Caixa Econômica Federal" },
  { id: 3, nome: "Itaú" },
  { id: 4, nome: "Bradesco" },
  { id: 5, nome: "Santander" },
  { id: 6, nome: "Banco Safra" },
  { id: 7, nome: "Banco Inter" },
  { id: 8, nome: "Banco Original" },
  { id: 9, nome: "Banco BTG Pactual" },
  { id: 10, nome: "Banco Modal" },
  { id: 11, nome: "Sicoob" },
  { id: 12, nome: "Banco PAN" },
  { id: 13, nome: "Banco Votorantim" },
  { id: 14, nome: "Banco Daycoval" },
  { id: 15, nome: "Banco BMG" },
  { id: 16, nome: "Banco Panamericano" },
  { id: 17, nome: "Banco Mercantil do Brasil" },
  { id: 18, nome: "Banco Fibra" },
  { id: 19, nome: "Banco ABC Brasil" },
  { id: 20, nome: "Banco Banrisul" },
  { id: 21, nome: "Nubank" },
  { id: 22, nome: "C6 Bank" },
  { id: 23, nome: "Banco Next" },
  { id: 24, nome: "Banco Original" },
];

export const tipos_conta = [
  { id: 1, nome: "Corrente" },
  { id: 2, nome: "Poupança" },
  { id: 3, nome: "Investimento" },
];


export const CLAUSULA_PRAZO_PADRAO = `1. DO PRAZO: O PRESENTE CONTRATO VIGORARÁ PELO PRAZO MÍNIMO DE 12 (DOZE) MESES, CONTADOS A PARTIR DA DATA DE INÍCIO DA LOCAÇÃO.
2. DA FIDELIDADE: OS PRIMEIROS 6 (SEIS) MESES DE VIGÊNCIA CONSTITUEM PERÍODO DE FIDELIDADE INTEGRAL.
3. DA RESCISÃO ATÉ O 6º MÊS: CASO A RESCISÃO OCORRA ANTES DE COMPLETADO O 6º MÊS DE VIGÊNCIA, A CONTRATANTE OBRIGA-SE AO PAGAMENTO DOS ALUGUÉIS MENSAIS VINCENDOS ATÉ O ENCERRAMENTO DO PERÍODO DE FIDELIDADE.

A MESMA REGRA SE APLICA À DEVOLUÇÃO PARCIAL OU REDUÇÃO DA QUANTIDADE DE EQUIPAMENTOS, POR EQUIPAMENTO RETIRADO.`;

export const RESPONSABILIDADES_PADRAO = `EFETUAR OS PAGAMENTOS NAS DATAS DE VENCIMENTO ACORDADAS, CONFORME CONDIÇÕES COMERCIAIS ESTABELECIDAS NESTA PROPOSTA.
OPERADOR DEVIDAMENTE TREINADO E QUALIFICADO PARA TAL OPERAÇÃO.
ABASTECIMENTO DO VEÍCULO.
GUARDA DO VEÍCULO/EQUIPAMENTO.
REALIZAR A LAVAGEM E LUBRIFICAÇÃO A CADA 15 DIAS.
CUMPRIR PLANO DE MANUTENÇÃO.
MATERIAL DE DESGASTE (LÂMPADAS, FUSÍVEIS, DISCO/BOBINA TACÓGRAFO, SIRENE DE RÉ, FUROS E CORTE EM PNEUS, DESGASTE PREMATURO DE PNEUS E PEÇAS).
MATERIAL DE DESGASTE DO IMPLEMENTO.
SOLICITAR À CONTRATADA A MANUTENÇÃO PREVENTIVA DE ACORDO COM O PLANO DE MANUTENÇÃO E CORRETIVA.
AVARIAS POR MAU USO E DESGASTE ANORMAL.
QUALQUER ALTERAÇÃO OU MANUTENÇÃO NO VEÍCULO/EQUIPAMENTO SEM AUTORIZAÇÃO DA CONTRATADA.
CEDER À CONTRATADA 1 (UM) DIA POR MÊS PARA REALIZAR MANUTENÇÕES SEM DESCONTO EM MEDIÇÃO.
GUARDA, VIGILÂNCIA E SEGURANÇA DO EQUIPAMENTO 24 HORAS, INCLUSIVE FORA DO HORÁRIO DE OPERAÇÃO, FINAIS DE SEMANA E PARADAS.
VEDADA A SUBLOCAÇÃO, CESSÃO OU TRANSFERÊNCIA DO EQUIPAMENTO A TERCEIROS OU A OUTRA FRENTE DE SERVIÇO SEM AUTORIZAÇÃO PRÉVIA E ESCRITA DA CONTRATADA.
A CONTRATADA NÃO POSSUI OBRIGAÇÃO DE FORNECIMENTO DE EQUIPAMENTO RESERVA.
O EQUIPAMENTO DEVERÁ SER DEVOLVIDO NAS MESMAS CONDIÇÕES EM QUE FOI ENTREGUE, CONFORME TERMO DE ENTREGA E VISTORIA, RESSALVADO O DESGASTE NATURAL DO USO NORMAL.`;

export const SEGURO_PADRAO = `COLISÃO COM TERCEIROS (SIM)
COBERTURA CONTRA FURTO 80% FIPE, ROUBO, COLISÃO (CASCO) E INCÊNDIO PROVENIENTE DE ACIDENTE (SIM)
GUINCHO (NÃO) QUANDO O DEFEITO FOR DE RESPONSABILIDADE DA CONTRATADA.
COBERTURA DE OPERAÇÃO EM LOCAIS DE RISCO, PRÓXIMO À ÁGUA E BARRAGENS (NÃO)
COBERTURA DE VIDROS (NÃO)
COBERTURA DOS IMPLEMENTOS (NÃO)`;