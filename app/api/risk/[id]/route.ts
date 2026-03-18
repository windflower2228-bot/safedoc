// app/api/risk/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { riskAssessmentSchema } from '@/lib/validators/schemas'

type Params = { params: { id: string } }

// ─── GET /api/risk/:id ───────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('risk_assessments')
    .select(`
      *,
      author:user_profiles!author_id(id, name, position),
      reviewer:user_profiles!reviewer_id(id, name, position),
      approver:user_profiles!approver_id(id, name, position),
      project:projects(id, name, site_name, site_address),
      items:risk_items(*)
    `)
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 항목을 seq 순으로 정렬
  if (data.items) {
    data.items.sort((a: { seq: number }, b: { seq: number }) => a.seq - b.seq)
  }

  return NextResponse.json({ data })
}

// ─── PATCH /api/risk/:id ─────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body   = await req.json()
  const action = body.action  // 'save' | 'submit_review' | 'approve' | 'archive'

  if (action === 'submit_review') {
    // 검토 제출
    const { data, error } = await supabase
      .from('risk_assessments')
      .update({ status: 'in_review' })
      .eq('id', params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'approve') {
    const { data, error } = await supabase
      .from('risk_assessments')
      .update({ status: 'approved', approver_id: user.id, approved_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // 일반 수정
  const parsed = riskAssessmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력 오류', details: parsed.error.flatten() }, { status: 400 })
  }

  const { title, project_id, eval_type, eval_start_date, eval_end_date, work_types, overview, items } = parsed.data

  // 1) 헤더 업데이트
  const { data: assessment, error: updateError } = await supabase
    .from('risk_assessments')
    .update({
      title,
      project_id:       project_id || null,
      eval_type,
      eval_start_date,
      eval_end_date,
      work_types:       work_types.split(',').map(s => s.trim()).filter(Boolean),
      overview:         overview || null,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // 2) 기존 항목 전체 삭제 후 재삽입 (단순 upsert보다 안전)
  await supabase.from('risk_items').delete().eq('assessment_id', params.id)

  if (items.length > 0) {
    const itemRows = items.map(item => ({
      assessment_id:       params.id,
      seq:                 item.seq,
      work_content:        item.work_content,
      hazard_factor:       item.hazard_factor,
      hazard_type:         item.hazard_type,
      current_probability: item.current_probability,
      current_severity:    item.current_severity,
      engineering_measure: item.engineering_measure || null,
      admin_measure:       item.admin_measure || null,
      ppe_measure:         item.ppe_measure || null,
      measure_owner:       item.measure_owner || null,
      measure_due_date:    item.measure_due_date || null,
      residual_probability: item.residual_probability ?? null,
      residual_severity:    item.residual_severity ?? null,
      link_to_education:   item.link_to_education,
      link_to_work_plan:   item.link_to_work_plan,
    }))

    const { error: itemsError } = await supabase.from('risk_items').insert(itemRows)
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ data: assessment })
}

// ─── DELETE /api/risk/:id ────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 권한 확인 (admin만 삭제 가능)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['super_admin', 'company_admin'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
  }

  const { error } = await supabase
    .from('risk_assessments')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
