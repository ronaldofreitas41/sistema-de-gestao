'use client'

import { useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CarFront,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Truck,
  Users,
  WalletCards,
  X,
} from 'lucide-react'

const navGroups = [
  { label: 'Visão geral', items: [{ label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Operação',
    items: [
      { label: 'Agenda', icon: CalendarDays },
      { label: 'Contratos', icon: FileText },
      { label: 'Frota', icon: CarFront },
      { label: 'Clientes', icon: Users },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Financeiro', icon: CircleDollarSign },
      { label: 'Estoque', icon: Package },
      { label: 'Relatórios', icon: Activity },
    ],
  },
]

const bookings = [
  { id: 'CTR-2026-084', client: 'Mariana Alves', vehicle: 'Toyota Corolla · RZT-4H21', date: 'Hoje, 14:30', status: 'Em andamento', tone: 'green' },
  { id: 'CTR-2026-083', client: 'Grupo Conecta Ltda.', vehicle: 'Fiat Toro · GHF-8A02', date: 'Hoje, 16:00', status: 'Aguardando retirada', tone: 'amber' },
  { id: 'CTR-2026-082', client: 'Rafael Nogueira', vehicle: 'Jeep Compass · BXE-1C91', date: 'Amanhã, 09:00', status: 'Reservado', tone: 'blue' },
  { id: 'CTR-2026-081', client: 'Ana Beatriz Costa', vehicle: 'Chevrolet Onix · QWE-6F33', date: 'Amanhã, 11:30', status: 'Reservado', tone: 'blue' },
]

const fleet = [
  { name: 'Toyota Corolla', plate: 'RZT-4H21', category: 'Sedan', status: 'Alugado', tone: 'green', health: 92 },
  { name: 'Jeep Compass', plate: 'BXE-1C91', category: 'SUV', status: 'Disponível', tone: 'blue', health: 87 },
  { name: 'Fiat Toro', plate: 'GHF-8A02', category: 'Picape', status: 'Reservado', tone: 'amber', health: 76 },
]

export function RentalDashboard() {
  const [active, setActive] = useState('Dashboard')
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-sidebar px-5 py-6 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-9 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-MmQnEBDcdmjJH5Ts9HWlQiYShvAUAO.png"
              alt="MH3 Rental"
              className="h-auto w-20 object-contain"
            />
            <div><p className="text-lg font-semibold tracking-tight">Rental</p><p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground">GESTÃO DE FROTAS</p></div>
          </div>
          <button className="rounded-lg p-2 text-muted-foreground lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu"><X /></button>
        </div>
        <nav className="flex flex-1 flex-col gap-7" aria-label="Navegação principal">
          {navGroups.map((group) => <div key={group.label} className="flex flex-col gap-2"><p className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{group.label}</p>{group.items.map((item) => <button key={item.label} onClick={() => { setActive(item.label); setOpen(false) }} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${active === item.label ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}><item.icon className="size-4" />{item.label}{item.label === 'Agenda' && <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">8</span>}</button>)}</div>)}
        </nav>
        <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold">Saúde da operação</span><ShieldCheck className="size-4 text-primary" /></div><div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-[84%] rounded-full bg-primary" /></div><p className="text-xs text-muted-foreground">Tudo funcionando normalmente</p></div>
        <div className="mt-5 flex items-center gap-3 border-t border-border pt-5"><div className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">MC</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Marcos Carvalho</p><p className="truncate text-xs text-muted-foreground">Administrador</p></div><Settings2 className="size-4 text-muted-foreground" /></div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur md:px-9"><div className="flex items-center gap-4"><button className="rounded-xl border border-border p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></button><div><p className="text-sm text-muted-foreground">Terça-feira, 2 de setembro de 2026</p><h1 className="text-xl font-bold tracking-tight md:text-2xl">Olá, Marcos <span aria-hidden="true">.</span></h1></div></div><div className="flex items-center gap-2 md:gap-4"><button className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground md:flex"><Search className="size-4" />Buscar <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘ K</kbd></button><button className="relative rounded-xl border border-border bg-card p-2.5" aria-label="Notificações"><Bell className="size-4" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" /></button><div className="hidden items-center gap-2 md:flex"><div className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-bold">MC</div><ChevronDown className="size-4 text-muted-foreground" /></div></div></header>

        <main className="mx-auto max-w-[1500px] p-5 md:p-9">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-1 text-sm font-medium text-primary">Resumo da operação</p><h2 className="text-3xl font-bold tracking-tight md:text-4xl">Visão geral</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Acompanhe o que está acontecendo na sua locadora em tempo real.</p></div><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"><Plus className="size-4" />Novo contrato</button></div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
            {[['Receita do mês','R$ 84.920,00','+18,4%','vs. mês anterior',CircleDollarSign,'up'],['Contratos ativos','48','+12,5%','vs. mês anterior',FileText,'up'],['Taxa de ocupação','76,8%','+4,2%','vs. mês anterior',CarFront,'up'],['A receber','R$ 12.480,00','-8,1%','vs. mês anterior',WalletCards,'down']].map(([label, value, delta, compare, Icon, direction]) => <div key={label as string} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><p className="text-sm text-muted-foreground">{label as string}</p><div className="rounded-xl bg-accent p-2.5 text-accent-foreground"><Icon className="size-4" /></div></div><p className="text-2xl font-bold tracking-tight">{value as string}</p><div className="mt-2 flex items-center gap-2 text-xs"><span className={`flex items-center gap-1 font-semibold ${direction === 'down' ? 'text-primary' : 'text-primary'}`}>{direction === 'down' ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}{delta as string}</span><span className="text-muted-foreground">{compare as string}</span></div></div>)}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6"><div className="mb-6 flex items-start justify-between"><div><h3 className="font-semibold">Receita e contratos</h3><p className="mt-1 text-xs text-muted-foreground">Acompanhe o desempenho dos últimos 7 meses</p></div><button className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground">Últimos 7 meses <ChevronDown className="size-3" /></button></div><div className="flex h-56 items-end gap-3 border-b border-border px-2 pb-0 sm:gap-6">{[['Abr','55%'],['Mai','68%'],['Jun','59%'],['Jul','78%'],['Ago','72%'],['Set','92%'],['Out','84%']].map(([month, height], index) => <div key={month} className="flex h-full flex-1 flex-col items-center justify-end gap-3"><div className={`w-full max-w-10 rounded-t-lg transition ${index === 5 ? 'bg-primary' : 'bg-accent'}`} style={{ height }} title={`${month}: ${height}`} /><span className="pb-3 text-[11px] text-muted-foreground">{month}</span></div>)}</div><div className="mt-5 flex gap-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />Receita</span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-accent" />Contratos</span></div></div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6"><div className="mb-5 flex items-start justify-between"><div><h3 className="font-semibold">Próximas retiradas</h3><p className="mt-1 text-xs text-muted-foreground">Sua agenda para hoje e amanhã</p></div><button onClick={() => setActive('Agenda')} className="text-xs font-semibold text-primary">Ver agenda</button></div><div className="flex flex-col gap-1">{bookings.slice(0, 3).map((booking) => <div key={booking.id} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-accent"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent"><CalendarDays className="size-4 text-accent-foreground" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{booking.client}</p><p className="truncate text-xs text-muted-foreground">{booking.vehicle}</p></div><div className="text-right"><p className="text-xs font-semibold">{booking.date}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${booking.tone === 'green' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{booking.status}</span></div></div>)}</div></div>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-border p-5 md:flex-row md:items-center md:p-6"><div><h3 className="font-semibold">Contratos recentes</h3><p className="mt-1 text-xs text-muted-foreground">Últimas movimentações da sua operação</p></div><div className="flex gap-2"><button className="rounded-lg border border-border p-2 text-muted-foreground" aria-label="Buscar contratos"><Search className="size-4" /></button><button className="rounded-lg border border-border px-3 py-2 text-xs font-medium">Exportar</button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-6 py-3 font-medium">Contrato</th><th className="px-6 py-3 font-medium">Cliente</th><th className="px-6 py-3 font-medium">Veículo</th><th className="px-6 py-3 font-medium">Data</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3" /></tr></thead><tbody>{bookings.map((booking) => <tr key={booking.id} className="border-t border-border transition hover:bg-accent/40"><td className="px-6 py-4 font-mono text-xs font-semibold">{booking.id}</td><td className="px-6 py-4 font-medium">{booking.client}</td><td className="px-6 py-4 text-muted-foreground">{booking.vehicle}</td><td className="px-6 py-4 text-muted-foreground">{booking.date}</td><td className="px-6 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${booking.tone === 'green' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{booking.status}</span></td><td className="px-6 py-4 text-right"><button aria-label={`Mais opções para ${booking.id}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><MoreHorizontal className="size-4" /></button></td></tr>)}</tbody></table></div></section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]"><div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6"><div className="mb-5 flex items-start justify-between"><div><h3 className="font-semibold">Status da frota</h3><p className="mt-1 text-xs text-muted-foreground">Disponibilidade atual dos veículos</p></div><button onClick={() => setActive('Frota')} className="text-xs font-semibold text-primary">Ver frota</button></div><div className="flex items-center gap-7"><div className="relative flex size-32 shrink-0 items-center justify-center rounded-full" style={{ background: 'conic-gradient(var(--primary) 0 76%, var(--muted) 76% 100%)' }}><div className="flex size-24 items-center justify-center rounded-full bg-card"><div className="text-center"><p className="text-2xl font-bold">76%</p><p className="text-[10px] text-muted-foreground">ocupação</p></div></div></div><div className="flex flex-col gap-3 text-xs"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />Alugados <b className="ml-auto pl-4">24</b></span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-secondary" />Disponíveis <b className="ml-auto pl-4">15</b></span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-muted-foreground" />Manutenção <b className="ml-auto pl-4">3</b></span></div></div></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold">Manutenção preventiva</h3><p className="mt-1 text-xs text-muted-foreground">Veículos que precisam de atenção</p></div><ClipboardCheck className="size-5 text-primary" /></div><div className="flex flex-col gap-3">{fleet.map((car) => <div key={car.plate} className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-accent"><CarFront className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-xs"><span className="font-medium">{car.name}</span><span className="text-muted-foreground">{car.health}%</span></div><div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${car.health}%` }} /></div></div><span className="hidden rounded-full bg-secondary px-2 py-1 text-[10px] text-secondary-foreground sm:inline-flex">{car.plate}</span></div>)}</div></div></section>
        </main>
      </div>
    </div>
  )
}

export default RentalDashboard
