// app/api/plan/item/route.ts
// 달력에서 단건 항목 직접 추가 (계획표 헤더가 이미 있을 때)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const itemSchema = z.object({
  plan_id:            z.string().uuid(),
  activity_type:      z.string().default('other'),
  title:              z.string().min(1, '일정명을 입력해주세요'),
  description:        z.string().optional(),
  scheduled_date:     z.string().min(1),
  scheduled_time:     z.string().optional(),
  notify_days_before: z.array(z.number()).default([1, 3]),
  notify_channel:     z.enum(['email','kakao','both','none']).default('email'),
  notify_email:       z.string().optional(),
  notify_phone:       z.string().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body   = await req.json()
  const parsed = itemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값 오류', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  // plan이 실제로 있는지 확인 (RLS로 자동 필터됨)
  const { data: plan } = await supabase
    .from('activity_plans')
    .select('id')
    .eq('id', d.plan_id)
    .single()

  if (!plan) return NextResponse.json({ error: '활동계획표를 찾을 수 없습니다.' }, { status: 404 })

  const { data: item, error } = await supabase
    .from('activity_items')
    .insert({
      plan_id:            d.plan_id,
      activity_type:      d.activity_type,
      title:              d.title,
      description:        d.description ?? null,
      scheduled_date:     d.scheduled_date,
      scheduled_time:     d.scheduled_time || null,
      notify_days_before: d.notify_days_before,
      notify_channel:     d.notify_channel,
      notify_email:       d.notify_email || null,
      notify_phone:       d.notify_phone || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: item }, { status: 201 })
}
