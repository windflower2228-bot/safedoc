import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const p = Number(new URL(req.url).searchParams.get('page')??1), ps=20
  const { data, count, error } = await supabase.from('committee_minutes')
    .select('id,doc_number,meeting_date,meeting_type,meeting_place,status,source_risk_id,created_at,author:user_profiles!author_id(name),source_risk:risk_assessments!source_risk_id(title)',{count:'exact'})
    .order('meeting_date',{ascending:false}).range((p-1)*ps,p*ps-1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('company_id,role').eq('id',user.id).single()
  if (!['super_admin','company_admin','manager'].includes(profile?.role??'')) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const body = await req.json()
  const year = new Date().getFullYear()
  const { count: seq } = await supabase.from('committee_minutes').select('*',{count:'exact',head:true}).eq('company_id',profile!.company_id).gte('created_at',`${year}-01-01`)
  const docNumber = `협의체-${year}-${String((seq??0)+1).padStart(3,'0')}`
  const { data, error } = await supabase.from('committee_minutes').insert({ ...body, company_id:profile!.company_id, doc_number:docNumber, author_id:user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('document_versions').insert({ company_id:profile!.company_id, doc_type:'committee', doc_id:data.id, doc_number:docNumber, version:1, change_summary:'최초 작성', snapshot:data, author_id:user.id })
  const now=new Date()
  const { data: plan } = await supabase.from('activity_plans').select('id').eq('company_id',profile!.company_id).eq('year',now.getFullYear()).eq('month',now.getMonth()+1).single()
  if (plan) await supabase.from('activity_items').update({is_completed:true,completed_at:now.toISOString(),linked_doc_id:data.id,linked_doc_type:'committee'}).eq('plan_id',plan.id).eq('activity_type','committee').eq('is_completed',false)
  return NextResponse.json({ data }, { status: 201 })
}
