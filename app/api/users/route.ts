// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { userInviteSchema } from '@/lib/validators/schemas'
import { sendEmail, buildInviteEmail } from '@/lib/notifications/email'

// ─── GET /api/users — 회사 사용자 목록 ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  let query = supabase
    .from('user_profiles')
    .select('id, name, email, position, department, phone, role, is_active, created_at')
    .order('created_at', { ascending: false })

  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,position.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// ─── POST /api/users — 사용자 초대 ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase      = createClient()
  const adminSupabase = createAdminClient()
  const requestOrigin = new URL(req.url).origin
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin).replace(/\/$/, '')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 권한 조회는 admin client로 수행 (RLS 영향 제거)
  const { data: profile, error: accessProfileError } = await adminSupabase
    .from('user_profiles')
    .select('company_id, role, name')
    .eq('id', user.id)
    .single()

  if (accessProfileError || !profile?.company_id) {
    return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다. 관리자에게 권한을 확인해주세요.' }, { status: 403 })
  }

  if (!['super_admin', 'company_admin'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: '초대 권한이 없습니다.' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = userInviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값 오류', details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, name, position, department, phone, role } = parsed.data

  // 1) 초대 링크 생성 (이메일은 직접 한국어 템플릿 발송)
  // - 신규 사용자: invite 링크
  // - 기존(초대 이력 포함) 사용자: magiclink 재초대 링크로 폴백
  let inviteData: any = null
  const { data: firstInviteData, error: inviteError } = await adminSupabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { name, position, role },
      redirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (!inviteError) {
    inviteData = firstInviteData
  } else if (inviteError.message?.includes('already been registered')) {
    const { data: resendData, error: resendError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        data: { name, position, role },
        redirectTo: `${siteUrl}/auth/callback`,
      },
    })

    if (resendError) {
      return NextResponse.json({ error: `재초대 링크 생성 실패: ${resendError.message}` }, { status: 500 })
    }
    inviteData = resendData
  } else {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  const actionLink = inviteData.properties?.action_link
  const invitedUserId = inviteData.user?.id
  if (!actionLink || !invitedUserId) {
    return NextResponse.json({ error: '초대 링크 생성에 실패했습니다.' }, { status: 500 })
  }

  // 회사명/초대자명 조회
  const { data: companyData } = await adminSupabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .single()

  const inviterName = profile.name || '관리자'
  const companyName = companyData?.name || 'SafeDoc'

  const { subject, html } = buildInviteEmail({
    inviterName,
    companyName,
    inviteUrl: actionLink,
  })

  const emailResult = await sendEmail({ to: email, subject, html })
  if (!emailResult.success) {
    // Resend 실패 시 Supabase 기본 메일(영문 템플릿)로 폴백
    const { error: fallbackError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    })

    if (fallbackError) {
      return NextResponse.json({
        error: '초대 메일 발송에 실패했습니다.',
        details: {
          korean_mail_error: emailResult.error ?? null,
          fallback_error: fallbackError.message,
        },
      }, { status: 500 })
    }
  }

  // user_profiles 에 회사 정보 연결
  const { error: profileError } = await adminSupabase
    .from('user_profiles')
    .update({
      company_id: profile!.company_id,
      name, position,
      department: department || null,
      phone: phone || null,
      role,
    })
    .eq('id', invitedUserId)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({
    message: emailResult.success
      ? `${email}로 한국어 초대 이메일을 발송했습니다.`
      : `${email}로 초대 이메일을 발송했습니다. (기본 템플릿)`,
    userId: invitedUserId,
    mailChannel: emailResult.success ? 'korean_custom' : 'supabase_fallback',
  }, { status: 201 })
}
