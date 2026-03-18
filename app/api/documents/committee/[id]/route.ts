import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
type P = { params: { id: string } }
export async function GET(_: NextRequest, { params }: P) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data, error } = await supabase.from('committee_minutes').select('*,author:user_profiles!author_id(name,position),company:companies(name,address),source_risk:risk_assessments!source_risk_id(id,title)').eq('id',params.id).single()
  if (error||!data) return NextResponse.json({ error: '문서 없음' }, { status: 404 })
  return NextResponse.json({ data })
}
export async function PATCH(req: NextRequest, { params }: P) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id',user.id).single()
  const body = await req.json(); const { change_summary, ...upd } = body
  const { data, error } = await supabase.from('committee_minutes').update({...upd,updated_at:new Date().toISOString()}).eq('id',params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { count } = await supabase.from('document_versions').select('*',{count:'exact',head:true}).eq('doc_id',params.id)
  await supabase.from('document_versions').insert({ company_id:profile!.company_id, doc_type:'committee', doc_id:params.id, doc_number:data.doc_number, version:(count??0)+1, change_summary:change_summary??'내용 수정', snapshot:data, author_id:user.id })
  return NextResponse.json({ data })
}
export async function DELETE(_: NextRequest, { params }: P) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  await supabase.from('document_versions').delete().eq('doc_id',params.id)
  await supabase.from('committee_minutes').delete().eq('id',params.id)
  return NextResponse.json({ success: true })
}
