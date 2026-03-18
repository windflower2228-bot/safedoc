// app/api/company/create/route.ts
// 회원가입 시 새 회사 생성 + 사용자 프로필 등록 (service role 사용)
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { name, userId } = await req.json()

    if (!name || !userId) {
      return NextResponse.json({ error: '회사명과 사용자 ID가 필요합니다.' }, { status: 400 })
    }

    // service role 클라이언트 (RLS 우회)
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 회사 생성
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name })
      .select()
      .single()

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 500 })
    }

    // 2. auth.users에서 이메일 가져오기
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)

    // 3. user_profiles 생성 (super_admin 권한)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id:         userId,
        company_id: company.id,
        email:      user?.email ?? '',
        name:       user?.user_metadata?.name ?? '',
        position:   user?.user_metadata?.position ?? '',
        role:       'super_admin',
      })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ data: { company_id: company.id } }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
