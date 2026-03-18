// app/api/cron/reminders/route.ts  (v2 — 카카오 + 이메일 통합)
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { dispatchNotifications } from '@/lib/notifications/dispatcher'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const today    = new Date()
  const checkDates = [0, 1, 3, 7].map(d => {
    const dt = new Date(today)
    dt.setDate(dt.getDate() + d)
    return dt.toISOString().slice(0, 10)
  })

  const { data: items } = await supabase
    .from('activity_items')
    .select(`
      id, title, scheduled_date, notify_days_before,
      notify_channel, notify_email, notify_phone,
      plan:activity_plans(
        company_id,
        company:companies(name),
        project:projects(site_name)
      )
    `)
    .in('scheduled_date', checkDates)
    .eq('is_completed', false)
    .neq('notify_channel', 'none')

  if (!items?.length)
    return NextResponse.json({ sent: 0, failed: 0, timestamp: today.toISOString() })

  let totalSent = 0, totalFailed = 0

  for (const item of items) {
    const plan    = item.plan as any
    const company = plan?.company as { name: string } | null
    if (!plan?.company_id || !company) continue

    const target = new Date(item.scheduled_date)
    target.setHours(0,0,0,0)
    const base = new Date(today); base.setHours(0,0,0,0)
    const dday = Math.round((target.getTime() - base.getTime()) / 86_400_000)

    if (!(item.notify_days_before as number[]).includes(dday)) continue

    const { data: recipients } = await supabase
      .from('user_profiles')
      .select('email, name, phone')
      .eq('company_id', plan.company_id)
      .in('role', ['company_admin', 'manager'])
      .eq('is_active', true)

    if (!recipients?.length) continue

    const result = await dispatchNotifications({
      company_id:     plan.company_id,
      item_id:        item.id,
      company_name:   company.name,
      activity_title: item.title,
      scheduled_date: item.scheduled_date,
      dday,
      recipients: recipients.map(r => ({
        email:   item.notify_email || r.email,
        phone:   item.notify_phone || (r as any).phone || null,
        name:    r.name,
        channel: item.notify_channel,
      })),
    })

    totalSent   += result.sent
    totalFailed += result.failed
  }

  return NextResponse.json({
    sent: totalSent, failed: totalFailed,
    checked: items.length, timestamp: new Date().toISOString(),
  })
}
