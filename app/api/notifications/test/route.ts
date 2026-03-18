// app/api/notifications/test/route.ts
// 카카오 또는 이메일 테스트 발송
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTestKakao } from '@/lib/notifications/kakao'
import { sendEmail } from '@/lib/notifications/email'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { channel, target } = await req.json()  // channel: 'email'|'kakao', target: email or phone

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('name, company:companies(name)')
    .eq('id', user.id)
    .single()

  const companyName = (profile?.company as any)?.name ?? 'SafeDoc'

  if (channel === 'email') {
    const result = await sendEmail({
      to: target,
      subject: '[SafeDoc] 이메일 알림 테스트',
      html: `<div style="font-family:sans-serif;padding:24px">
        <h2 style="color:#1E3A5F">SafeDoc 이메일 알림 테스트</h2>
        <p>${companyName}의 SafeDoc 알림 설정이 정상적으로 연결되었습니다.</p>
        <p style="color:#64748B;font-size:12px;margin-top:16px">본 메일은 알림 설정 테스트용 메시지입니다.</p>
      </div>`,
    })
    return NextResponse.json({ success: result.success, error: result.error })
  }

  if (channel === 'kakao') {
    const result = await sendTestKakao(target, companyName)
    return NextResponse.json({ success: result.success, error: result.error })
  }

  return NextResponse.json({ error: '지원하지 않는 채널입니다.' }, { status: 400 })
}
