// app/api/plan/annual/route.ts
// GET /api/plan/annual?year=2025 — 1년치 전체 항목 반환
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const year = Number(new URL(req.url).searchParams.get('year') ?? new Date().getFullYear())

  // 해당 연도의 모든 activity_plans 조회
  const { data: plans } = await supabase
    .from('activity_plans')
    .select('id, month')
    .eq('year', year)

  if (!plans?.length) return NextResponse.json({ data: [] })

  const planIds = plans.map(p => p.id)

  // 해당 계획표들의 모든 항목 조회
  const { data: items, error } = await supabase
    .from('activity_items')
    .select('*')
    .in('plan_id', planIds)
    .order('scheduled_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: items ?? [], year })
}
