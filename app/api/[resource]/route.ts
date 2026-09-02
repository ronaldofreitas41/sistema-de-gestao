import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const moduleByResource: Record<string, string> = {
  agenda: 'propostas',
  contratos: 'vendas',
  clientes: 'clientes',
  veiculos: 'equips',
  financeiro: 'vendas',
  estoque: 'so_no_aparelho',
  manutencao: 'manutencoes',
  propostas: 'propostas',
  pendencias: 'revisoes',
  tratativas: 'ajudasMotorista',
  fluxo: 'vendas',
  contas_pagar: 'despesas',
  despesas: 'despesas',
  prejuizos: 'despesas',
  compras: 'vendas',
  pneus: 'pneus',
  checklist: 'checklists',
  auditoria: 'auditoria',
  ajuda: 'ajudasMotorista',
  sistema: 'config',
}

const resources = new Set(['dashboard', ...Object.keys(moduleByResource)])

function parseRecord(row: { id: string; modulo: string; dados: string; criado_em?: string; atualizado_em?: string }) {
  try {
    const parsed = JSON.parse(row.dados)
    return {
      ...(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { valor: parsed }),
      _id: row.id,
      _modulo: row.modulo,
      _atualizado_em: row.atualizado_em,
    }
  } catch {
    return { _id: row.id, _modulo: row.modulo, dados: row.dados, _atualizado_em: row.atualizado_em }
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params
  if (!resources.has(resource)) return NextResponse.json({ error: 'Recurso não encontrado' }, { status: 404 })
  if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER) {
    return NextResponse.json({ data: [], configured: false, resource })
  }

  try {
    if (resource === 'dashboard') {
      const [rows] = await getDb().query(
        `SELECT modulo, COUNT(*) AS registros, MAX(atualizado_em) AS atualizado_em
         FROM mh3_dados GROUP BY modulo ORDER BY atualizado_em DESC`,
      )
      return NextResponse.json({ data: rows, configured: true, resource })
    }

    const modulo = moduleByResource[resource]
    const limit = resource === 'pneus' ? 200 : 100
    const [rows] = await getDb().query(
      'SELECT id, modulo, dados, criado_em, atualizado_em FROM mh3_dados WHERE modulo = ? ORDER BY atualizado_em DESC LIMIT ?',
      [modulo, limit],
    )
    return NextResponse.json({ data: (rows as Array<{ id: string; modulo: string; dados: string; criado_em?: string; atualizado_em?: string }>).map(parseRecord), configured: true, resource, modulo })
  } catch (error) {
    console.error('[v0] Falha ao consultar recurso:', resource, error)
    return NextResponse.json({ error: 'Não foi possível consultar os dados do banco.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params
  if (!resources.has(resource)) return NextResponse.json({ error: 'Recurso não encontrado' }, { status: 404 })
  if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER) return NextResponse.json({ error: 'Banco de dados não configurado.' }, { status: 503 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  return NextResponse.json({ message: 'A leitura está conectada. A gravação deste módulo será habilitada com validação específica.', resource }, { status: 501 })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
