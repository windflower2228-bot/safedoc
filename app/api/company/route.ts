// app/api/company/route.ts — 회사 정보·로고 조회·수정
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('company_id').eq('id', user.id).single()

  const { data, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, logo_name, doc_header_type, doc_header_custom, address, ceo_name, business_number, safety_manager, phone, fax')
    .eq('id', profile!.company_id).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('company_id, role').eq('id', user.id).single()

  if (!['super_admin','company_admin'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: '관리자만 수정 가능합니다.' }, { status: 403 })

  const body = await req.json()
  const allowed = ['name','logo_url','logo_name','doc_header_type','doc_header_custom','address','ceo_name','business_number','safety_manager','phone','fax']
  const update  = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase
    .from('companies')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', profile!.company_id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
