import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data, error } = await supabase.from('safety_regulations').select('id,doc_number,title,version,effective_date,revision_reason,approver_name,status,created_at').order('version',{ascending:false})
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
  const docNumber = `안전보건관리규정-v${body.version}`
  const { data, error } = await supabase.from('safety_regulations').insert({...body,company_id:profile!.company_id,doc_number:docNumber,author_id:user.id}).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
