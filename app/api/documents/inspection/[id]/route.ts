import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
type P = { params: { id: string } }
export async function GET(_: NextRequest, { params }: P) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data, error } = await supabase.from('inspections').select('*,author:user_profiles!author_id(name,position),project:projects(name,site_name),company:companies(name,address),source_risk:risk_assessments!source_risk_id(id,title,eval_type)').eq('id',params.id).single()
  if (error||!data) return NextResponse.json({ error: '문서 없음' }, { status: 404 })
  return NextResponse.json({ data })
}
export async function PATCH(req: NextRequest, { params }: P) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id',user.id).single()
  const body = await req.json()
  const { change_summary, ...updateData } = body
  const { data, error } = await supabase.from('inspections').update({ ...updateData, updated_at: new Date().toISOString() }).eq('id',params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // 버전 이력 저장
  const { count } = await supabase.from('document_versions').select('*',{count:'exact',head:true}).eq('doc_id',params.id)
  await supabase.from('document_versions').insert({ company_id:profile!.company_id, doc_type:'inspection', doc_id:params.id, doc_number:data.doc_number, version:(count??0)+1, change_summary:change_summary??'내용 수정', snapshot:data, author_id:user.id })
  return NextResponse.json({ data })
}
export async function DELETE(_: NextRequest, { params }: P) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  await supabase.from('document_versions').delete().eq('doc_id',params.id)
  const { error } = await supabase.from('inspections').delete().eq('id',params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
