import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { companyJoinRequestReviewSchema } from '@/lib/validators/schemas'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = companyJoinRequestReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값 오류', details: parsed.error.flatten() }, { status: 400 })
  }

  const { action, reviewerMemo } = parsed.data

  const { data: adminProfile, error: adminProfileError } = await admin
    .from('user_profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (adminProfileError || !adminProfile?.company_id) {
    return NextResponse.json({ error: '관리자 프로필을 찾을 수 없습니다.' }, { status: 403 })
  }

  if (!['super_admin', 'company_admin'].includes(adminProfile.role)) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { data: requestRow, error: requestError } = await admin
    .from('company_join_requests')
    .select('id, company_id, user_id, requester_name, requester_position, requester_department, requester_phone, requested_role, status')
    .eq('id', params.id)
    .single()

  if (requestError || !requestRow) {
    return NextResponse.json({ error: '가입신청을 찾을 수 없습니다.' }, { status: 404 })
  }

  if (requestRow.company_id !== adminProfile.company_id) {
    return NextResponse.json({ error: '다른 회사 신청은 처리할 수 없습니다.' }, { status: 403 })
  }

  if (requestRow.status !== 'pending') {
    return NextResponse.json({ error: '이미 처리된 신청입니다.' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const nextStatus = action === 'approve' ? 'approved' : 'rejected'

  if (action === 'approve') {
    const { error: updateProfileError } = await admin
      .from('user_profiles')
      .update({
        company_id: requestRow.company_id,
        role: requestRow.requested_role,
        name: requestRow.requester_name || undefined,
        position: requestRow.requester_position || undefined,
        department: requestRow.requester_department || null,
        phone: requestRow.requester_phone || null,
        is_active: true,
      })
      .eq('id', requestRow.user_id)

    if (updateProfileError) {
      return NextResponse.json({ error: `사용자 반영 실패: ${updateProfileError.message}` }, { status: 500 })
    }
  }

  const { error: reviewError } = await admin
    .from('company_join_requests')
    .update({
      status: nextStatus,
      reviewed_at: nowIso,
      reviewed_by: user.id,
      reviewer_memo: reviewerMemo || null,
    })
    .eq('id', requestRow.id)

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 })
  }

  return NextResponse.json({
    message: action === 'approve' ? '가입신청을 승인했습니다.' : '가입신청을 반려했습니다.',
  })
}

