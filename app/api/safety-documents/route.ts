import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProfileForAuth } from '@/lib/supabase/auth-profile'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const role_id = searchParams.get('role_id')
  let query = supabase.from('safety_documents')
    .select('id,role_id,doc_type,doc_number,person_name,person_affiliation,person_position,effective_date,expiry_date,status,created_at,author:user_profiles!author_id(name)')
    .order('created_at', { ascending: false })
  if (role_id) query = query.eq('role_id', role_id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { profile, errorMessage } = await getProfileForAuth<{ company_id: string; role: string }>(
    supabase,
    user.id,
    'company_id, role'
  )
  if (!profile) {
    return NextResponse.json(
      { error: errorMessage ? `프로필 없음 (${errorMessage})` : '프로필 없음' },
      { status: 403 }
    )
  }
  if (!['super_admin','company_admin','manager'].includes(profile?.role??''))
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const body = await req.json()
  // 문서번호 채번
  const year = new Date().getFullYear()
  const { count } = await supabase.from('safety_documents').select('*',{count:'exact',head:true})
    .eq('company_id',profile!.company_id).eq('role_id',body.role_id).gte('created_at',`${year}-01-01`)
  const roleCode: Record<string,string> = { responsibility_manager:'안책', supervisor:'감독', safety_manager:'안관', health_manager:'보관', safety_health_officer:'안담', industrial_physician:'산보', honorary_inspector:'명예' }
  const code = roleCode[body.role_id] ?? '기타'
  const docType = body.doc_type || '지정서'
  const prefix = docType === '선임서' ? '선임' : docType === '위촉서' ? '위촉' : '지정'
  const docNumber = `${prefix}-${code}-${year}-${String((count??0)+1).padStart(3,'0')}`
  const { data, error } = await supabase.from('safety_documents')
    .insert({ ...body, company_id:profile!.company_id, doc_number:docNumber, author_id:user.id })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // 버전 이력
  await supabase.from('document_versions').insert({ company_id:profile!.company_id, doc_type:'safety_document', doc_id:data.id, doc_number:docNumber, version:1, change_summary:'최초 작성', snapshot:data, author_id:user.id })
  return NextResponse.json({ data }, { status: 201 })
}
