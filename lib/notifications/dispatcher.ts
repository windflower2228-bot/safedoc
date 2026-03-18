// lib/notifications/dispatcher.ts
// 통합 알림 발송 — 채널별 라우팅 + 실패 시 폴백

import { sendEmail, buildActivityReminderEmail } from './email'
import { sendKakaoAlimtalk, buildActivityReminderVars } from './kakao'
import { createAdminClient } from '@/lib/supabase/server'
import type { NotifyChannel } from '@/types/plan'

interface NotifyPayload {
  company_id:     string
  item_id:        string
  company_name:   string
  activity_title: string
  scheduled_date: string
  dday:           number
  recipients: {
    email:   string
    phone:   string | null
    name:    string
    channel: NotifyChannel
  }[]
}

export async function dispatchNotifications(payload: NotifyPayload) {
  const supabase   = createAdminClient()
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://safedoc.kr'
  const planUrl    = `${siteUrl}/plan`
  const sent: string[] = []
  const failed: string[] = []

  for (const r of payload.recipients) {
    const channel = r.channel

    // ── 이메일 발송 ─────────────────────────────────────────
    if (channel === 'email' || channel === 'both') {
      const { subject, html } = buildActivityReminderEmail({
        recipientName:  r.name,
        companyName:    payload.company_name,
        activityTitle:  payload.activity_title,
        scheduledDate:  payload.scheduled_date,
        daysLeft:       payload.dday,
        planUrl,
      })

      const result = await sendEmail({ to: r.email, subject, html })

      await supabase.from('notification_logs').insert({
        company_id: payload.company_id,
        item_id:    payload.item_id,
        channel:    'email',
        recipient:  r.email,
        status:     result.success ? 'sent' : 'failed',
        error_msg:  result.error ?? null,
      })

      if (result.success) sent.push(`email:${r.email}`)
      else failed.push(`email:${r.email} → ${result.error}`)
    }

    // ── 카카오 알림톡 발송 ──────────────────────────────────
    if ((channel === 'kakao' || channel === 'both') && r.phone) {
      const templateId = process.env.KAKAO_ACTIVITY_TEMPLATE_ID ?? ''

      if (!templateId) {
        failed.push(`kakao:${r.phone} → KAKAO_ACTIVITY_TEMPLATE_ID 미설정`)
      } else {
        const variables = buildActivityReminderVars({
          company_name:   payload.company_name,
          activity_title: payload.activity_title,
          scheduled_date: payload.scheduled_date,
          dday:           payload.dday,
          plan_url:       planUrl,
        })

        const result = await sendKakaoAlimtalk({
          to:         r.phone,
          templateId,
          variables,
        })

        await supabase.from('notification_logs').insert({
          company_id: payload.company_id,
          item_id:    payload.item_id,
          channel:    'kakao',
          recipient:  r.phone,
          status:     result.success ? 'sent' : 'failed',
          error_msg:  result.error ?? null,
        })

        if (result.success) sent.push(`kakao:${r.phone}`)
        else {
          failed.push(`kakao:${r.phone} → ${result.error}`)

          // 카카오 실패 시 이메일로 폴백
          if (channel === 'kakao' && r.email) {
            const { subject, html } = buildActivityReminderEmail({
              recipientName:  r.name,
              companyName:    payload.company_name,
              activityTitle:  payload.activity_title,
              scheduledDate:  payload.scheduled_date,
              daysLeft:       payload.dday,
              planUrl,
            })
            const fbResult = await sendEmail({ to: r.email, subject, html })
            if (fbResult.success) sent.push(`email(fallback):${r.email}`)
          }
        }
      }
    }
  }

  // 마지막 알림 시각 업데이트
  await supabase
    .from('activity_items')
    .update({ last_notified_at: new Date().toISOString() })
    .eq('id', payload.item_id)

  return { sent: sent.length, failed: failed.length, details: { sent, failed } }
}
