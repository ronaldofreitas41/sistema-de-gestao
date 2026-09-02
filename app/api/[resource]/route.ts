import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const queries: Record<string, string> = {
  dashboard: 'SELECT 1 AS ready',
  contratos: 'SELECT * FROM contratos ORDER BY id DESC LIMIT 100',
  clientes: 'SELECT * FROM clientes ORDER BY id DESC LIMIT 100',
  veiculos: 'SELECT * FROM veiculos ORDER BY id DESC LIMIT 100',
  financeiro: 'SELECT * FROM financeiro ORDER BY id DESC LIMIT 100',
  estoque: 'SELECT * FROM estoque ORDER BY id DESC LIMIT 100',
  manutencao: 'SELECT * FROM manutencao ORDER BY id DESC LIMIT 100',
  agenda: 'SELECT * FROM contratos WHERE status IN (\'reservado\', \'ativo\') ORDER BY data_inicio LIMIT 100',
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params
  const query = queries[resource]
  if (!query) return NextResponse.json({ error: 'Recurso não encontrado' }, { status: 404 })
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) return NextResponse.json({ data: [], configured: false, resource })
  try {
    const [rows] = await getDb().query(query)
    return NextResponse.json({ data: rows, configured: true, resource })
  } catch (error) {
    console.error('[v0] Falha ao consultar recurso:', resource, error)
    return NextResponse.json({ error: 'Não foi possível consultar os dados.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params
  if (!queries[resource]) return NextResponse.json({ error: 'Recurso não encontrado' }, { status: 404 })
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) return NextResponse.json({ error: 'Banco de dados não configurado.' }, { status: 503 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  return NextResponse.json({ message: 'Use um handler específico para persistir este recurso.', resource, received: body }, { status: 501 })
}
