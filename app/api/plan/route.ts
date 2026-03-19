// app/api/plan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProfileForAuth } from '@/lib/supabase/auth-profile'
import { z } from 'zod'

const itemSchema = z.object({
  activity_type:      z.string(),
  title:              z.string().min(1),
  description:        z.string().optional(),
  scheduled_date:     z.string().min(1),
  scheduled_time:     z.string().optional(),
  notify_days_before: z.array(z.number().int()).default([1, 3]),
  notify_channel:     z.enum(['email','kakao','both','none']).default('email'),
  notify_email:       z.string().email().optional().or(z.literal('')),
  notify_phone:       z.string().optional(),
})

// ─── GET /api/plan?year=2025&month=3 ─────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year  = Number(searchParams.get('year')  ?? new Date().getFullYear())
  const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)

  // 계획표 헤더 조회 (없으면 null)
  const { data: plan } = await supabase
    .from('activity_plans')
    .select(`id, year, month, project_id, project:projects(site_name)`)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (!plan) return NextResponse.json({ data: null, items: [] })

  // 항목 조회
  const { data: items, error } = await supabase
    .from('activity_items')
    .select('*')
    .eq('plan_id', plan.id)
    .order('scheduled_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: plan, items: items ?? [] })
}

// ─── POST /api/plan ── 계획표 + 항목 일괄 저장 ───────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { profile, errorMessage } = await getProfileForAuth<{ company_id: string; role: string }>(
    supabase,
    user.id,
    'company_id, role'
  )

  if (!profile) {
    return NextResponse.json(
      { error: errorMessage ? `프로필 없음 (${errorMessage})` : '프로필 없음' },
      { status: 403 }
    )
  }

  if (!['super_admin','company_admin','manager'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const { year, month, project_id, items: rawItems } = body

  if (!year || !month)
    return NextResponse.json({ error: 'year, month 필수' }, { status: 400 })

  // 계획표 upsert
  const { data: plan, error: planErr } = await supabase
    .from('activity_plans')
    .upsert({ company_id: profile!.company_id, project_id: project_id ?? null, year, month },
             { onConflict: 'company_id,project_id,year,month' })
    .select()
    .single()

  if (planErr) return NextResponse.json({ error: planErr.message }, { status: 500 })

  // 기존 항목 전체 교체
  if (Array.isArray(rawItems)) {
    await supabase.from('activity_items').delete().eq('plan_id', plan.id)

    const parsed = rawItems.map((it: unknown) => itemSchema.safeParse(it)).filter(r => r.success)
    if (parsed.length > 0) {
      const rows = parsed.map(r => ({
        ...(r as { success: true; data: z.infer<typeof itemSchema> }).data,
        plan_id:       plan.id,
        notify_email:  (r as any).data.notify_email || null,
        notify_phone:  (r as any).data.notify_phone || null,
      }))
      const { error: itemErr } = await supabase.from('activity_items').insert(rows)
      if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ data: plan }, { status: 201 })
}
