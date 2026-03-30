// app/api/documents/workplan/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  DEFAULT_ANNEX4_BY_PLAN_TYPE,
  ensureWorkPlanLegalBasis,
  ensureWorkPlanScopeWithLegal,
} from '@/lib/legal/mandatoryContent'
import { ANNEX4_WORK_LABELS, type Annex4WorkKey, type WorkPlanType } from '@/types/workplan'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { data, error } = await admin
    .from('work_plans')
    .select(`
      *,
      author:user_profiles!author_id(name, position, phone),
      approved_user:user_profiles!approved_by(name, position),
      project:projects(name, site_name, site_address),
      source_risk:risk_assessments!source_risk_id(id, title, eval_type, eval_start_date),
      company:companies(name, address, logo_url)
    `)
    .eq('id', params.id)
    .single()

  if (error || !data || data.company_id !== profile.company_id) return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json() as Record<string, unknown>

  // 승인 처리
  if (body.action === 'approve') {
    const { data, error } = await supabase
      .from('work_plans')
      .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() })
      .eq('id', params.id)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  const { action: _action, annex4_work_key, plan_round, ...updateBody } = body

  const { data: current, error: currentError } = await supabase
    .from('work_plans')
    .select('plan_type, work_scope, legal_basis')
    .eq('id', params.id)
    .single()
  if (currentError || !current) {
    return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  }

  const finalPlanType = ((updateBody.plan_type as WorkPlanType | undefined) ?? current.plan_type) as WorkPlanType
  const annex4WorkKey = (
    typeof annex4_work_key === 'string' && annex4_work_key in ANNEX4_WORK_LABELS
      ? annex4_work_key
      : DEFAULT_ANNEX4_BY_PLAN_TYPE[finalPlanType]
  ) as Annex4WorkKey

  const roundFromPayload = typeof plan_round === 'number' && Number.isFinite(plan_round)
    ? Math.max(1, Math.floor(plan_round))
    : null
  const scopeSeed = ((updateBody.work_scope as string | undefined) ?? (current.work_scope as string | undefined) ?? '').trim()
  const roundFromScopeMatch = scopeSeed.match(/\[계획서 회차\]\s*(\d+)차/)
  const roundFromScope = roundFromScopeMatch ? Number(roundFromScopeMatch[1]) : 1
  const finalRound = roundFromPayload ?? roundFromScope

  updateBody.work_scope = ensureWorkPlanScopeWithLegal(scopeSeed, annex4WorkKey, finalRound)
  updateBody.legal_basis = ensureWorkPlanLegalBasis(
    ((updateBody.legal_basis as string | undefined) ?? (current.legal_basis as string | undefined) ?? ''),
    finalPlanType
  )

  const { data, error } = await supabase
    .from('work_plans')
    .update({ ...updateBody, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (!['super_admin', 'company_admin'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: '삭제 권한 없음' }, { status: 403 })
  }

  const { error } = await supabase.from('work_plans').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
