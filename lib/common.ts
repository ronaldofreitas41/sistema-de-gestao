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
  DollarSign,
  Truck,
  Wrench,
  Camera,
  Lock,
  Box,
  LibraryBig,
  LoaderPinwheel,
  ArchiveRestore,
  Siren,
  Handshake,
  FileText,
  Search,
} from "lucide-react";
import { NavItem } from "./types";



export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Visão geral",
    items: [
      { href: "/dashboard", label: "Dashboard", resource: "dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/contas-pagar", label: "Contas a pagar", resource: "contas_pagar", icon: Receipt },
      { href: "/contas-receber", label: "Contas a receber", resource: "contas_receber", icon: Receipt },
      { href: "/fluxo", label: "Fluxo de caixa", resource: "fluxo", icon: Landmark },
      { href: "/relatorios", label: "Relatórios", resource: "relatorios", icon: BarChart3 },
      { href: "/prejuizos", label: "Prejuízos", resource: "prejuizos", icon: ArrowDownRight },
      { href: "/funcionarios", label: "Funcionarios", resource: "funcionarios", icon: IdCardLanyard },
    ],
  },
  {
    label: "Faturamento",
    items: [
      { href: "/clientes", label: "Clientes", resource: "contas_pagar", icon: UsersRound },
      { href: "/proposta", label: "Proposta", resource: "contas_receber", icon: Receipt },
      { href: "/medicoes", label: "Medições", resource: "fluxo", icon: ChartLine },
      { href: "/ajuda-motoristas", label: "Ajuda Motoristas", resource: "relatorios", icon: CircleQuestionMark },
      { href: "/fatura-locacao", label: "Fatura Locação", resource: "prejuizos", icon: DollarSign },
    ],
  },
  {
    label: "Frota e Manutenção",
    items: [
      { href: "/frota", label: "Frota ", resource: "estoque", icon: Truck },
      { href: "/manutencao", label: "Manutenção", resource: "compras", icon: Wrench },
      { href: "/venda-avaria", label: "Venda/Avaria  ", resource: "compras", icon: CircleDollarSign },
      { href: "/acomp-revisao", label: "Acomp. Revisão", resource: "compras", icon: Wrench },
      { href: "/mobilizacao", label: "Mobilização", resource: "compras", icon: Camera },
      { href: "/seguro", label: "Seguro", resource: "compras", icon: Lock },
    ],
  },
  {
    label: "Estoque e Compras",
    items: [
      { href: "/estoque", label: "Estoque", resource: "checklist", icon: Box },
      { href: "/nf-e", label: "Nf-e", resource: "auditoria", icon: LibraryBig },
      { href: "/pneus", label: "Pneus", resource: "sistema", icon: LoaderPinwheel },
      { href: "/saida-de-material", label: "Saida de Material", resource: "ajuda", icon: ArchiveRestore },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/pendencias", label: "Pendencias", resource: "checklist", icon: Siren },
      { href: "/tratativas", label: "Tratativas", resource: "auditoria", icon: Handshake },
      { href: "/configuracoes", label: "Configurações", resource: "sistema", icon: Settings2 },
      { href: "/ajuda", label: "Ajuda", resource: "ajuda", icon: CircleHelp },
    ],
  },
];