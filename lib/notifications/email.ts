// lib/notifications/email.ts
// Resend 기반 이메일 알림 서비스

const RESEND_API_URL = 'https://api.resend.com/emails'

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY 가 설정되지 않았습니다. 이메일을 발송하지 않습니다.')
    return { success: false, error: 'API key missing' }
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    from ?? process.env.EMAIL_FROM ?? 'SafeDoc <noreply@safedoc.kr>',
      to:      Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    console.error('[Email] 발송 실패:', err)
    return { success: false, error: err.message }
  }
  return { success: true }
}

// ─── 이메일 템플릿 ─────────────────────────────────────────────────────────────

function baseLayout(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Malgun Gothic','맑은 고딕',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <!-- 헤더 -->
        <tr><td style="background:#1E3A5F;padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="color:#FFFFFF;font-size:18px;font-weight:700;">SafeDoc</span>
                <span style="color:#93C5FD;font-size:11px;margin-left:8px;">산업안전보건 문서관리</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- 본문 -->
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <!-- 푸터 -->
        <tr><td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;">
            본 메일은 SafeDoc 서비스에서 자동 발송된 메일입니다.<br>
            문의: <a href="mailto:support@safedoc.kr" style="color:#6B7280;">support@safedoc.kr</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/** 활동계획 D-day 알림 이메일 */
export function buildActivityReminderEmail(opts: {
  recipientName: string
  companyName: string
  activityTitle: string
  scheduledDate: string
  daysLeft: number
  planUrl: string
}): { subject: string; html: string } {
  const { recipientName, companyName, activityTitle, scheduledDate, daysLeft, planUrl } = opts

  const urgency = daysLeft <= 1 ? '🔴 오늘 마감!' : daysLeft <= 3 ? '🟡 기한 임박' : '🔵 일정 알림'
  const subject = `[SafeDoc] ${urgency} "${activityTitle}" — D-${daysLeft}`

  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#1E3A5F;">안전보건활동 ${urgency}</h2>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.6;">
      안녕하세요, <strong style="color:#111827;">${recipientName}</strong>님.<br>
      ${companyName}의 안전보건활동 일정을 알려드립니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:8px;border:1px solid #E5E7EB;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:.05em;">활동 정보</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ['활동명', activityTitle],
              ['예정일', scheduledDate],
              ['남은 일수', `<strong style="color:${daysLeft <= 1 ? '#DC2626' : daysLeft <= 3 ? '#D97706' : '#2563EB'}">D-${daysLeft}</strong>`],
            ].map(([label, value]) => `
              <tr>
                <td style="padding:5px 0;font-size:12px;color:#6B7280;width:80px;">${label}</td>
                <td style="padding:5px 0;font-size:13px;color:#111827;">${value}</td>
              </tr>
            `).join('')}
          </table>
        </td>
      </tr>
    </table>
    <a href="${planUrl}" style="display:inline-block;background:#1E3A5F;color:#FFFFFF;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
      활동계획표 확인하기 →
    </a>
  `

  return { subject, html: baseLayout(content, subject) }
}

/** 사용자 초대 이메일 (Supabase Auth 기본 외 커스텀 발송 시) */
export function buildInviteEmail(opts: {
  inviterName: string
  companyName: string
  inviteUrl: string
}): { subject: string; html: string } {
  const { inviterName, companyName, inviteUrl } = opts
  const subject = `[SafeDoc] ${companyName}에서 초대장이 왔습니다`

  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#1E3A5F;">팀원 초대</h2>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.6;">
      <strong style="color:#111827;">${inviterName}</strong>님이 SafeDoc <strong>${companyName}</strong> 팀에 초대했습니다.<br>
      아래 버튼을 눌러 가입을 완료하세요.
    </p>
    <a href="${inviteUrl}" style="display:inline-block;background:#1E3A5F;color:#FFFFFF;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
      초대 수락하기 →
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;">
      이 링크는 48시간 후 만료됩니다.
    </p>
  `

  return { subject, html: baseLayout(content, subject) }
}

/** 위험성평가 승인 요청 알림 */
export function buildApprovalRequestEmail(opts: {
  reviewerName: string
  authorName: string
  assessmentTitle: string
  reviewUrl: string
}): { subject: string; html: string } {
  const { reviewerName, authorName, assessmentTitle, reviewUrl } = opts
  const subject = `[SafeDoc] 위험성평가 검토 요청 — "${assessmentTitle}"`

  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#1E3A5F;">위험성평가 검토 요청</h2>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.6;">
      안녕하세요, <strong style="color:#111827;">${reviewerName}</strong>님.<br>
      <strong>${authorName}</strong>님이 아래 위험성평가의 검토를 요청했습니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7ED;border-radius:8px;border:1px solid #FED7AA;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;font-size:14px;color:#92400E;">
        📋 <strong>${assessmentTitle}</strong>
      </td></tr>
    </table>
    <a href="${reviewUrl}" style="display:inline-block;background:#1E3A5F;color:#FFFFFF;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
      검토하러 가기 →
    </a>
  `

  return { subject, html: baseLayout(content, subject) }
}
