// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { userInviteSchema } from '@/lib/validators/schemas'

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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 권한 조회는 admin client로 수행 (RLS 영향 제거)
  const { data: profile, error: accessProfileError } = await adminSupabase
    .from('user_profiles')
    .select('company_id, role')
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

  // Supabase Admin API로 초대 이메일 발송 + 계정 생성
  const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
    email,
    {
      data: { name, position, role },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    }
  )

  if (inviteError) {
    if (inviteError.message.includes('already been registered')) {
      return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 400 })
    }
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
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
    .eq('id', inviteData.user.id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({
    message: `${email}로 초대 이메일을 발송했습니다.`,
    userId: inviteData.user.id,
  }, { status: 201 })
}
