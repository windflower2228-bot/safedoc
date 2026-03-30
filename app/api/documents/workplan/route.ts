// app/api/documents/workplan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_ANNEX4_BY_PLAN_TYPE,
  ensureWorkPlanLegalBasis,
  ensureWorkPlanScopeWithLegal,
} from '@/lib/legal/mandatoryContent'
import { ANNEX4_WORK_LABELS, type Annex4WorkKey } from '@/types/workplan'
import { z } from 'zod'

const workPlanRiskItemSchema = z.object({
  seq:                 z.number().int().positive(),
  source_risk_item_id: z.string().uuid().nullable().optional(),
  work_content:        z.string().min(1),
  hazard_factor:       z.string().min(1),
  hazard_type:         z.string().default('other'),
  risk_level:          z.string().default('medium'),
  risk_score:          z.number().default(0),
  engineering_measure: z.string().default(''),
  admin_measure:       z.string().default(''),
  ppe_measure:         z.string().default(''),
  measure_owner:       z.string().default(''),
  measure_due_date:    z.string().default(''),
  work_method:         z.string().default(''),
  equipment_needed:    z.string().default(''),
  worker_count:        z.number().int().min(1).default(1),
  check_items:         z.string().default(''),
})

const workerSchema = z.object({
  seq:      z.number().int().positive(),
  name:     z.string().default(''),
  position: z.string().default(''),
  role:     z.string().default(''),
  license:  z.string().default(''),
})

const createWorkPlanSchema = z.object({
  source_risk_id:      z.string().uuid().optional(),
  project_id:          z.string().uuid().optional(),
  title:               z.string().min(2, '작업계획서 제목을 입력해주세요'),
  plan_type:           z.enum(['height','excavation','crane','confined','demolition',
                               'electrical','welding','chemical','heavy_equip','other']),
  work_location:       z.string().min(1, '작업 장소를 입력해주세요'),
  work_start_date:     z.string().min(1, '작업 시작일을 입력해주세요'),
  work_end_date:       z.string().min(1, '작업 종료일을 입력해주세요'),
  work_start_time:     z.string().optional(),
  work_end_time:       z.string().optional(),
  work_scope:          z.string().optional(),
  legal_basis:         z.string().optional(),
  supervisor_name:     z.string().optional(),
  supervisor_position: z.string().optional(),
  supervisor_phone:    z.string().optional(),
  safety_summary:      z.string().optional(),
  risk_items:          z.array(workPlanRiskItemSchema).min(1, '작업 항목을 1개 이상 입력해주세요'),
  workers:             z.array(workerSchema).default([]),
  annex4_work_key:     z.string().optional(),
  plan_round:          z.number().int().min(1).optional(),
})

// ─── GET /api/documents/workplan ─────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page     = Number(searchParams.get('page')     ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 20)
  const q        = searchParams.get('q')
  const status   = searchParams.get('status')
  const planType = searchParams.get('plan_type')

  let query = supabase
    .from('work_plans')
    .select(`
      id, title, plan_type, work_location,
      work_start_date, work_end_date, status,
      link_type, source_risk_id,
      work_scope,
      supervisor_name, created_at, updated_at,
      author:user_profiles!author_id(name),
      project:projects(site_name),
      source_risk:risk_assessments!source_risk_id(title)
    `, { count: 'exact' })
    .order('work_start_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (q)        query = query.or(`title.ilike.%${q}%,work_scope.ilike.%${q}%`)
  if (status)   query = query.eq('status', status)
  if (planType) query = query.eq('plan_type', planType)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize })
}

// ─── POST /api/documents/workplan ────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: '프로필 없음' }, { status: 403 })
  if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: '작성 권한 없음' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = createWorkPlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력값 오류', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const d = parsed.data
  const annex4WorkKey = (
    d.annex4_work_key && d.annex4_work_key in ANNEX4_WORK_LABELS
      ? d.annex4_work_key
      : DEFAULT_ANNEX4_BY_PLAN_TYPE[d.plan_type]
  ) as Annex4WorkKey
  const planRound = d.plan_round ?? 1
  const enforcedScope = ensureWorkPlanScopeWithLegal(d.work_scope, annex4WorkKey, planRound)
  const enforcedLegalBasis = ensureWorkPlanLegalBasis(d.legal_basis, d.plan_type)

  const { data: plan, error } = await supabase
    .from('work_plans')
    .insert({
      company_id:          profile.company_id,
      project_id:          d.project_id ?? null,
      source_risk_id:      d.source_risk_id ?? null,
      link_type:           d.source_risk_id ? 'auto_from_risk' : 'manual',
      title:               d.title,
      plan_type:           d.plan_type,
      work_location:       d.work_location,
      work_start_date:     d.work_start_date,
      work_end_date:       d.work_end_date,
      work_start_time:     d.work_start_time ?? null,
      work_end_time:       d.work_end_time ?? null,
      work_scope:          enforcedScope,
      legal_basis:         enforcedLegalBasis,
      supervisor_name:     d.supervisor_name ?? null,
      supervisor_position: d.supervisor_position ?? null,
      supervisor_phone:    d.supervisor_phone ?? null,
      safety_summary:      d.safety_summary ?? null,
      risk_items:          d.risk_items,
      workers:             d.workers,
      status:              'draft',
      author_id:           user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 활동계획표 자동 이행 체크
  if (plan) {
    const now   = new Date()
    const { data: actPlan } = await supabase
      .from('activity_plans')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('year', now.getFullYear())
      .eq('month', now.getMonth() + 1)
      .single()

    if (actPlan) {
      await supabase
        .from('activity_items')
        .update({ is_completed: true, completed_at: now.toISOString(), linked_doc_id: plan.id })
        .eq('plan_id', actPlan.id)
        .eq('activity_type', 'work_plan')
        .eq('is_completed', false)
    }
  }

  return NextResponse.json({ data: plan }, { status: 201 })
}
