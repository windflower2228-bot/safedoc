import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') ?? 1), ps = 20
  const q = searchParams.get('q'), type = searchParams.get('type')
  let query = supabase.from('inspections')
    .select('id,doc_number,inspection_type,inspection_date,inspection_area,inspector_name,status,link_type,source_risk_id,created_at,author:user_profiles!author_id(name),source_risk:risk_assessments!source_risk_id(title)', { count: 'exact' })
    .order('inspection_date', { ascending: false })
    .range((page-1)*ps, page*ps-1)
  if (q) query = query.ilike('inspection_area', `%${q}%`)
  if (type) query = query.eq('inspection_type', type)
  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('company_id,role').eq('id', user.id).single()
  if (!['super_admin','company_admin','manager'].includes(profile?.role ?? '')) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const body = await req.json()
  const year = new Date().getFullYear()
  const { count: seq } = await supabase.from('inspections').select('*',{count:'exact',head:true}).eq('company_id',profile!.company_id).gte('created_at',`${year}-01-01`)
  const docNumber = `순회-${year}-${String((seq??0)+1).padStart(3,'0')}`
  const { data, error } = await supabase.from('inspections').insert({ ...body, company_id: profile!.company_id, doc_number: docNumber, author_id: user.id, link_type: body.source_risk_id ? 'auto_from_risk' : 'manual' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // 버전 이력 자동 저장
  await supabase.from('document_versions').insert({ company_id:profile!.company_id, doc_type:'inspection', doc_id:data.id, doc_number:docNumber, version:1, change_summary:'최초 작성', snapshot:data, author_id:user.id })
  // 활동계획표 이행 체크
  const now = new Date()
  const { data: plan } = await supabase.from('activity_plans').select('id').eq('company_id',profile!.company_id).eq('year',now.getFullYear()).eq('month',now.getMonth()+1).single()
  if (plan) await supabase.from('activity_items').update({is_completed:true,completed_at:now.toISOString(),linked_doc_id:data.id,linked_doc_type:'inspection'}).eq('plan_id',plan.id).eq('activity_type','inspection').eq('is_completed',false)
  return NextResponse.json({ data }, { status: 201 })
}
