// lib/notifications/kakao.ts
// 카카오 알림톡 발송 서비스
// 카카오 비즈메시지 API (solapi / coolsms) 연동

export interface KakaoMessage {
  to:          string    // 수신 번호 (010-0000-0000)
  templateId:  string    // 알림톡 템플릿 코드
  variables:   Record<string, string>  // 템플릿 변수
}

export interface KakaoSendResult {
  success:   boolean
  messageId: string | null
  error:     string | null
}

// ─── Solapi (구 CoolSMS) 연동 ─────────────────────────────────
// 카카오 알림톡은 Solapi 같은 메시지 플랫폼을 통해 발송합니다.
// https://developers.solapi.com/references/message/sendMany

async function sendViaSolapi(msg: KakaoMessage): Promise<KakaoSendResult> {
  const apiKey    = process.env.SOLAPI_API_KEY
  const apiSecret = process.env.SOLAPI_API_SECRET
  const senderKey = process.env.KAKAO_SENDER_KEY   // 카카오 발신 프로필 키
  const pfId      = process.env.KAKAO_PF_ID         // 카카오 채널 플러스친구 ID

  if (!apiKey || !apiSecret || !senderKey) {
    return { success: false, messageId: null, error: 'SOLAPI 설정이 없습니다.' }
  }

  // HMAC-SHA256 인증
  const date      = new Date().toISOString()
  const salt      = Math.random().toString(36).substring(2)
  const signature = await makeSignature(apiSecret, date, salt)

  const body = {
    message: {
      to:          msg.to.replace(/-/g, ''),
      from:        process.env.SOLAPI_SENDER_PHONE ?? '',
      type:        'ATA',   // 알림톡
      kakaoOptions: {
        pfId,
        templateId:  msg.templateId,
        variables:   msg.variables,
      },
    },
  }

  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ errorCode: res.status }))
    return { success: false, messageId: null, error: JSON.stringify(err) }
  }

  const data = await res.json()
  return {
    success:   data.failedMessageList?.length === 0,
    messageId: data.messageId ?? null,
    error:     data.failedMessageList?.[0]?.errorMessage ?? null,
  }
}

// ─── HMAC-SHA256 서명 생성 ─────────────────────────────────────
async function makeSignature(secret: string, date: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const msgData = encoder.encode(date + salt)

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig  = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  const arr  = Array.from(new Uint8Array(sig))
  return arr.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── 공개 API ──────────────────────────────────────────────────
export async function sendKakaoAlimtalk(msg: KakaoMessage): Promise<KakaoSendResult> {
  return sendViaSolapi(msg)
}

// ─── 활동계획 알림 템플릿 빌더 ────────────────────────────────
export interface ActivityReminderVars {
  company_name:    string
  activity_title:  string
  scheduled_date:  string
  dday:            number
  plan_url:        string
}

export function buildActivityReminderVars(v: ActivityReminderVars): Record<string, string> {
  const urgency = v.dday === 0 ? '오늘 마감!' : v.dday < 0 ? `${Math.abs(v.dday)}일 초과` : `D-${v.dday}`
  return {
    '#{회사명}':    v.company_name,
    '#{활동명}':    v.activity_title,
    '#{예정일}':    v.scheduled_date,
    '#{디데이}':    urgency,
    '#{링크}':      v.plan_url,
  }
}

// ─── 테스트 발송 ───────────────────────────────────────────────
export async function sendTestKakao(phone: string, companyName: string): Promise<KakaoSendResult> {
  const templateId = process.env.KAKAO_TEST_TEMPLATE_ID ?? ''
  if (!templateId) {
    return { success: false, messageId: null, error: '테스트 템플릿 ID가 설정되지 않았습니다.' }
  }

  return sendKakaoAlimtalk({
    to:         phone,
    templateId,
    variables: {
      '#{회사명}': companyName,
      '#{메시지}': 'SafeDoc 카카오 알림톡 연동 테스트 메시지입니다.',
    },
  })
}
