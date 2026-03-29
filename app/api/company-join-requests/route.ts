import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { companyJoinRequestCreateSchema } from '@/lib/validators/schemas'

export async function GET() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
    return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 403 })
  }

  if (!['super_admin', 'company_admin'].includes(profile.role)) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('company_join_requests')
    .select('id, company_id, user_id, requester_email, requester_name, requester_position, requester_department, requester_phone, requested_role, status, requested_at')
    .eq('company_id', profile.company_id)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const admin = createAdminClient()

  const body = await req.json()
  const parsed = companyJoinRequestCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값 오류', details: parsed.error.flatten() }, { status: 400 })
  }

  const payload = parsed.data

  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(payload.userId)
  if (authError || !authUser?.user) {
    return NextResponse.json({ error: '회원 정보를 찾을 수 없습니다.' }, { status: 400 })
  }

  const authEmail = (authUser.user.email ?? '').toLowerCase()
  if (!authEmail || authEmail !== payload.email.toLowerCase()) {
    return NextResponse.json({ error: '회원 이메일 검증에 실패했습니다.' }, { status: 400 })
  }

  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id')
    .eq('id', payload.companyId)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: '선택한 회사를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { data: pending } = await admin
    .from('company_join_requests')
    .select('id')
    .eq('company_id', payload.companyId)
    .eq('user_id', payload.userId)
    .eq('status', 'pending')
    .maybeSingle()

  if (pending?.id) {
    return NextResponse.json({ message: '이미 가입신청이 접수되어 있습니다.', requestId: pending.id }, { status: 200 })
  }

  const { data, error } = await admin
    .from('company_join_requests')
    .insert({
      company_id: payload.companyId,
      user_id: payload.userId,
      requester_email: payload.email,
      requester_name: payload.name,
      requester_position: payload.position,
      requester_department: payload.department || null,
      requester_phone: payload.phone || null,
      requested_role: payload.requestedRole,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: '가입신청이 접수되었습니다. 관리자 승인 후 이용 가능합니다.', requestId: data.id }, { status: 201 })
}

