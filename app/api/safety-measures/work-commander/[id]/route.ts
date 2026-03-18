import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
const TABLE_MAP: Record<string,string> = {
  'supervisor-duties': 'supervisor_duties',
  'ppe-ledger':        'ppe_ledger',
  'work-commander':    'work_commanders',
  'structural-review': 'structural_reviews',
}
const TABLE = TABLE_MAP['work-commander']
type P = { params: { id: string } }
export async function GET(_: NextRequest, { params }: P) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data, error } = await supabase.from(TABLE).select('*').eq('id',params.id).single()
  if (error||!data) return NextResponse.json({ error: '없음' }, { status: 404 })
  return NextResponse.json({ data })
}
export async function PATCH(req: NextRequest, { params }: P) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const body = await req.json()
  const { data, error } = await supabase.from(TABLE).update({...body,updated_at:new Date().toISOString()}).eq('id',params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
export async function DELETE(_: NextRequest, { params }: P) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  await supabase.from(TABLE).delete().eq('id',params.id)
  return NextResponse.json({ success: true })
}
