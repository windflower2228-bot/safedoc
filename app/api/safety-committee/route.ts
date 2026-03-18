import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data, error } = await supabase.from('safety_committee_minutes')
    .select('*,author:user_profiles!author_id(name)').order('meeting_date',{ascending:false})
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
  const { count } = await supabase.from('safety_committee_minutes').select('*',{count:'exact',head:true}).eq('company_id',profile!.company_id).gte('created_at',`${year}-01-01`)
  const prefix = body.committee_type === 'labor_management' ? '노사협의체' : '안전보건위원회'
  const docNumber = `${prefix}-${year}-${String((count??0)+1).padStart(3,'0')}`
  const { data, error } = await supabase.from('safety_committee_minutes').insert({...body,company_id:profile!.company_id,doc_number:docNumber,author_id:user.id}).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('document_versions').insert({ company_id:profile!.company_id, doc_type:'safety_committee', doc_id:data.id, doc_number:docNumber, version:1, change_summary:'최초 작성', snapshot:data, author_id:user.id })
  return NextResponse.json({ data }, { status: 201 })
}
