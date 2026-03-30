// app/api/documents/education/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildEducationLegalContent,
  ensureEducationItemsLegalBasis,
} from '@/lib/legal/mandatoryContent'
import type { EduItem } from '@/types/education'
import { z } from 'zod'

// ─── 입력 스키마 ──────────────────────────────────────────────────────────────
const eduItemSchema = z.object({
  seq:                 z.number().int().positive(),
  source_risk_item_id: z.string().uuid().nullable().optional(),
  work_content:        z.string().min(1),
  hazard_factor:       z.string().min(1),
  hazard_type:         z.string(),
  risk_level:          z.string(),
  edu_point:           z.string().default(''),
  legal_basis:         z.string().default(''),
  countermeasure:      z.string().default(''),
})

const attendeeSchema = z.object({
  seq:        z.number().int().positive(),
  name:       z.string().default(''),
  position:   z.string().default(''),
  department: z.string().default(''),
  sign:       z.string().nullable().default(null),
})

const createEduSchema = z.object({
  source_risk_id:      z.string().uuid().optional(),
  project_id:          z.string().uuid().optional(),
  title:               z.string().min(2, '교육명을 입력해주세요'),
  edu_type:            z.enum(['onboarding','regular','special','job_specific','accident','other']),
  edu_date:            z.string().min(1, '교육 일자를 입력해주세요'),
  edu_start_time:      z.string().optional(),
  edu_end_time:        z.string().optional(),
  worker_type:         z.enum(['regular_office','regular_field','daily','short_term','supervisor','atypical']).optional().nullable(),
  edu_duration_hours:  z.number().min(0).optional(),
  edu_location:        z.string().optional(),
  instructor_name:     z.string().optional(),
  instructor_position: z.string().optional(),
  instructor_affil:    z.string().optional(),
  edu_content:         z.string().optional(),
  edu_items:           z.array(eduItemSchema).min(1, '교육 항목을 1개 이상 입력해주세요'),
  attendees:           z.array(attendeeSchema).default([]),
})

// ─── GET /api/documents/education ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page     = Number(searchParams.get('page')     ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 20)
  const q        = searchParams.get('q')
  const status   = searchParams.get('status')
  const eduTypeRaw = searchParams.get('edu_type')
  const workerType = searchParams.get('worker_type')
  const excludeWorkerType = searchParams.get('exclude_worker_type')

  const EDU_TYPE_ALIAS: Record<string, string> = {
    'regular-worker': 'regular',
    'supervisor-regular': 'regular',
    'special-worker': 'special',
    'supervisor-special': 'special',
    'new-hire': 'onboarding',
    'special-employment': 'onboarding',
    'job-change': 'job_specific',
  }
  const eduType = eduTypeRaw ? (EDU_TYPE_ALIAS[eduTypeRaw] ?? eduTypeRaw) : null

  let query = supabase
    .from('education_journals')
    .select(`
      id, title, edu_type, worker_type, edu_date, edu_duration_hours,
      edu_location, instructor_name, attendee_count,
      status, link_type, source_risk_id,
      created_at, updated_at,
      author:user_profiles!author_id(name),
      project:projects(site_name),
      source_risk:risk_assessments!source_risk_id(title, eval_type)
    `, { count: 'exact' })
    .order('edu_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (q)      query = query.ilike('title', `%${q}%`)
  if (status) query = query.eq('status', status)
  if (eduType) query = query.eq('edu_type', eduType)
  if (workerType) query = query.eq('worker_type', workerType)
  if (excludeWorkerType) query = query.neq('worker_type', excludeWorkerType)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, pageSize })
}

// ─── POST /api/documents/education ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, role, name, position')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: '프로필 없음' }, { status: 403 })
  if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: '작성 권한이 없습니다.' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = createEduSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력값 오류', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const d = parsed.data
  const enforcedEduItems = ensureEducationItemsLegalBasis(d.edu_items as EduItem[])
  const enforcedEduContent = buildEducationLegalContent(
    d.edu_type,
    d.worker_type,
    d.edu_content ?? null
  )

  // 참석자 수 계산 (name 있는 행만)
  const realAttendees  = d.attendees.filter(a => a.name.trim())
  const attendeeCount  = realAttendees.length

  const { data: journal, error: insertError } = await supabase
    .from('education_journals')
    .insert({
      company_id:          profile.company_id,
      project_id:          d.project_id ?? null,
      source_risk_id:      d.source_risk_id ?? null,
      link_type:           d.source_risk_id ? 'auto_from_risk' : 'manual',
      title:               d.title,
      edu_type:            d.edu_type,
      worker_type:         d.worker_type ?? null,
      edu_date:            d.edu_date,
      edu_start_time:      d.edu_start_time ?? null,
      edu_end_time:        d.edu_end_time ?? null,
      edu_duration_hours:  d.edu_duration_hours ?? null,
      edu_location:        d.edu_location ?? null,
      instructor_name:     d.instructor_name ?? null,
      instructor_position: d.instructor_position ?? null,
      instructor_affil:    d.instructor_affil ?? null,
      edu_content:         enforcedEduContent,
      edu_items:           enforcedEduItems,
      attendees:           d.attendees,
      attendee_count:      attendeeCount,
      status:              'draft',
      author_id:           user.id,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // 활동계획표 자동 이행 체크
  if (journal) {
    const now   = new Date()
    const year  = now.getFullYear()
    const month = now.getMonth() + 1
    const { data: plan } = await supabase
      .from('activity_plans')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('year', year)
      .eq('month', month)
      .single()
    if (plan) {
      await supabase
        .from('activity_items')
        .update({ is_completed: true, completed_at: now.toISOString(), linked_doc_id: journal.id })
        .eq('plan_id', plan.id)
        .eq('activity_type', 'education')
        .eq('is_completed', false)
    }
  }

  return NextResponse.json({ data: journal }, { status: 201 })
}
