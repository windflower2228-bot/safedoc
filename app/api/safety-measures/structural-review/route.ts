import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
const TABLE_MAP: Record<string,string> = {
  'supervisor-duties': 'supervisor_duties',
  'ppe-ledger':        'ppe_ledger',
  'work-commander':    'work_commanders',
  'structural-review': 'structural_reviews',
}
const TABLE = TABLE_MAP['structural-review']
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  let q = supabase.from(TABLE).select('*').order('created_at',{ascending:false})
  const type = searchParams.get('type')
  if (type) {
    if (TABLE === 'structural_reviews') q = q.eq('review_type', type)
    if (TABLE === 'work_commanders') q = q.eq('commander_type', type)
  }
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('company_id,role').eq('id',user.id).single()
  if (!['super_admin','company_admin','manager'].includes(profile?.role??'')) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const body = await req.json()
  const year = new Date().getFullYear()
  const { count } = await supabase.from(TABLE).select('*',{count:'exact',head:true}).eq('company_id',profile!.company_id).gte('created_at',`${year}-01-01`)
  const prefixMap: Record<string,string> = { supervisor_duties:'관리감독', ppe_ledger:'보호구', work_commanders:'작업지휘', structural_reviews:'구조검토' }
  const docNumber = `${prefixMap[TABLE]??'문서'}-${year}-${String((count??0)+1).padStart(3,'0')}`
  const { data, error } = await supabase.from(TABLE).insert({...body,company_id:profile!.company_id,doc_number:docNumber,author_id:user.id}).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
