// app/api/risk/route.ts — GET(목록), POST(생성) — v18 fix: 4가지 평가방법 지원
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProfileForAuth } from '@/lib/supabase/auth-profile'
import { riskAssessmentSchema } from '@/lib/validators/schemas'

// ─── GET /api/risk ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page     = Number(searchParams.get('page') ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 20)
  const status   = searchParams.get('status')
  const q        = searchParams.get('q')
  const method   = searchParams.get('eval_method')

  let query = supabase
    .from('risk_assessments')
    .select(`
      id, title, eval_type, eval_method, matrix_size,
      eval_start_date, eval_end_date,
      work_types, status, version, created_at, updated_at,
      author:user_profiles!author_id(name, position),
      project:projects(name, site_name),
      items:risk_items(current_level)
    `, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status)
  if (q)      query = query.ilike('title', `%${q}%`)
  if (method) query = query.eq('eval_method', method)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize })
}

// ─── POST /api/risk ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

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
  if (!['super_admin','company_admin','manager'].includes(profile.role))
    return NextResponse.json({ error: '작성 권한이 없습니다.' }, { status: 403 })

  const body = await req.json()
  const evalMethod = body.eval_method ?? 'matrix'

  // ── 빈도강도법(matrix) 이외의 방법은 별도 처리 ──────────────
  if (evalMethod !== 'matrix') {
    // eval_date → eval_start_date, eval_end_date 모두 동일 날짜로
    const evalDate = body.eval_date || new Date().toISOString().slice(0, 10)

    const { data: assessment, error } = await supabase
      .from('risk_assessments')
      .insert({
        company_id:        profile.company_id,
        title:             body.title || '위험성평가',
        eval_type:         body.eval_type || 'initial',
        eval_method:       evalMethod,
        matrix_size:       body.matrix_size || null,
        eval_start_date:   evalDate,
        eval_end_date:     evalDate,
        work_types:        body.work_types ? [body.work_types] : [],
        overview:          body.work_location || '',
        status:            'draft',
        author_id:         user.id,
        // 각 방법별 JSON 데이터
        checklist_items:   evalMethod === 'checklist'    ? (body.checklist_items ?? [])    : [],
        three_level_items: evalMethod === 'three_level'  ? (body.three_level_items ?? [])  : [],
        ops_items:         evalMethod === 'ops'          ? (body.ops_items ?? [])          : [],
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: assessment }, { status: 201 })
  }

  // ── 빈도강도법(matrix) — 기존 schema 검증 ───────────────────
  const parsed = riskAssessmentSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: '입력값이 올바르지 않습니다.', details: parsed.error.flatten() },
      { status: 400 }
    )

  const { title, project_id, eval_type, eval_start_date, eval_end_date, work_types, overview, items } = parsed.data

  const { data: assessment, error: assessError } = await supabase
    .from('risk_assessments')
    .insert({
      company_id:       profile.company_id,
      project_id:       project_id || null,
      title,
      eval_type,
      eval_method:      'matrix',
      matrix_size:      body.matrix_size || 5,
      eval_start_date,
      eval_end_date,
      work_types:       work_types.split(',').map((s: string) => s.trim()).filter(Boolean),
      overview:         overview || null,
      status:           'draft',
      author_id:        user.id,
    })
    .select().single()

  if (assessError) return NextResponse.json({ error: assessError.message }, { status: 500 })

  if (items.length > 0) {
    const itemRows = items.map(item => ({
      assessment_id:        assessment.id,
      seq:                  item.seq,
      work_content:         item.work_content,
      hazard_factor:        item.hazard_factor,
      hazard_type:          item.hazard_type,
      current_probability:  item.current_probability,
      current_severity:     item.current_severity,
      engineering_measure:  item.engineering_measure || null,
      admin_measure:        item.admin_measure || null,
      ppe_measure:          item.ppe_measure || null,
      measure_owner:        item.measure_owner || null,
      measure_due_date:     item.measure_due_date || null,
      residual_probability: item.residual_probability ?? null,
      residual_severity:    item.residual_severity ?? null,
      link_to_education:    item.link_to_education,
      link_to_work_plan:    item.link_to_work_plan,
    }))

    const { error: itemsError } = await supabase.from('risk_items').insert(itemRows)
    if (itemsError) {
      await supabase.from('risk_assessments').delete().eq('id', assessment.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  // ── 관리감독자 유해위험방지업무 자동 연계 (백그라운드) ──────
  // risk_items의 텍스트 → 별표2 작업유형 매핑
  if (items.length > 0) {
    try {
      const { extractSupervisorDuties } = await import('@/lib/linkage/riskToSupervisorDuties')
      const duties = extractSupervisorDuties(items.map(it => ({
        work_type:        it.work_content,
        hazard:           it.hazard_factor,
        risk_factor:      it.hazard_type,
        reduction_measure: it.engineering_measure || '',
      })))
      if (duties.length > 0) {
        // supervisor_duties 테이블에 연계 레코드 생성 (있으면 upsert)
        if (duties.length > 0) {
          await supabase.from('supervisor_duties').insert({
            company_id:      profile.company_id,
            linked_risk_id:  assessment.id,
            work_date:       body.eval_start_date || new Date().toISOString().slice(0,10),
            supervisor_name: body.evaluator_name || '',
            duty_items:      duties.slice(0, 10).map(d => ({
              duty_id:   d.id,
              work_type: d.workType,
              duties:    d.duties || [],
              preChecks: d.preChecks || [],
            })),
            status:    'draft',
            author_id: user.id,
          }).then(() => {})
        }
      }
    } catch (_) { /* 연계 실패는 무시 */ }
  }

  return NextResponse.json({ data: assessment }, { status: 201 })
}
