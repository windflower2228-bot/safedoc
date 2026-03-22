import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getProfileForAuth } from '@/lib/supabase/auth-profile'
type P = { params: { id: string } }

const EDIT_ROLES = ['super_admin', 'company_admin', 'manager']
const DELETE_ROLES = ['super_admin', 'company_admin']

export async function GET(_: NextRequest, { params }: P) {
  const supabase = createClient()
  const admin = createAdminClient()
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
  const { data, error } = await admin.from('safety_documents')
    .select('*,author:user_profiles!author_id(name,position),company:companies(name,address,logo_url,ceo_name,business_number)')
    .eq('id', params.id)
    .eq('company_id', profile.company_id)
    .single()
  if (error||!data) return NextResponse.json({ error: '문서 없음' }, { status: 404 })
  return NextResponse.json({ data })
}
export async function PATCH(req: NextRequest, { params }: P) {
  const supabase = createClient()
  const admin = createAdminClient()
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
  if (!EDIT_ROLES.includes(profile.role ?? '')) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }
  const body = await req.json()
  const { change_summary, ...upd } = body
  const { data, error } = await admin
    .from('safety_documents')
    .update({ ...upd, updated_at:new Date().toISOString() })
    .eq('id', params.id)
    .eq('company_id', profile.company_id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { count } = await admin
    .from('document_versions')
    .select('*',{count:'exact',head:true})
    .eq('doc_id', params.id)
    .eq('company_id', profile.company_id)
  await admin.from('document_versions').insert({
    company_id: profile.company_id,
    doc_type: 'safety_document',
    doc_id: params.id,
    doc_number: data.doc_number,
    version: (count ?? 0) + 1,
    change_summary: change_summary ?? '내용 수정',
    snapshot: data,
    author_id: user.id,
  })
  return NextResponse.json({ data })
}
export async function DELETE(_: NextRequest, { params }: P) {
  const supabase = createClient()
  const admin = createAdminClient()
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
  if (!DELETE_ROLES.includes(profile.role ?? '')) {
    return NextResponse.json({ error: '삭제 권한 없음' }, { status: 403 })
  }
  await admin
    .from('document_versions')
    .delete()
    .eq('doc_id', params.id)
    .eq('company_id', profile.company_id)
  const { error } = await admin
    .from('safety_documents')
    .delete()
    .eq('id', params.id)
    .eq('company_id', profile.company_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
