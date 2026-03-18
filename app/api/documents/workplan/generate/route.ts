// app/api/documents/workplan/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWorkPlanDraftFromRisk } from '@/lib/linkage/riskToWorkPlan'
import { extractSupervisorDuties, buildSupervisorDutiesSection } from '@/lib/linkage/riskToSupervisorDuties'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const { risk_id, include_all, work_start_date, work_end_date, location } = body

  if (!risk_id) {
    return NextResponse.json({ error: 'risk_id가 필요합니다.' }, { status: 400 })
  }

  const { data: ra, error } = await supabase
    .from('risk_assessments')
    .select(`
      id, title, eval_type, work_types, eval_start_date, eval_end_date,
      company:companies(name),
      project:projects(name, site_name),
      author:user_profiles!author_id(name, position),
      items:risk_items(
        id, seq, work_content, hazard_factor, hazard_type,
        current_level, current_score,
        engineering_measure, admin_measure, ppe_measure,
        measure_owner, measure_due_date,
        link_to_work_plan
      )
    `)
    .eq('id', risk_id)
    .single()

  if (error || !ra) {
    return NextResponse.json({ error: '위험성평가를 찾을 수 없습니다.' }, { status: 404 })
  }

  const linkedCount = (ra.items as any[]).filter((i: any) => i.link_to_work_plan).length
  if (linkedCount === 0 && !include_all) {
    return NextResponse.json({
      warning: '작업계획서 연계로 체크된 위험요인 항목이 없습니다. include_all=true 로 전체 항목을 포함할 수 있습니다.',
      linked_count: 0,
    })
  }

  const draft = generateWorkPlanDraftFromRisk(ra as any, {
    includeAll:    include_all ?? false,
    workStartDate: work_start_date,
    workEndDate:   work_end_date,
    location,
  })

  // 관리감독자의 유해위험방지업무 자동 추출 (별표2 연계)
  const riskItemsForDuty = (ra.items as any[]).map((i: any) => ({
    work_type:         i.work_content,
    hazard:            i.hazard_factor,
    risk_factor:       i.hazard_factor,
    reduction_measure: [i.engineering_measure, i.admin_measure, i.ppe_measure].filter(Boolean).join(' '),
  }))
  const matchedDuties = extractSupervisorDuties(riskItemsForDuty)
  const supervisorDutiesSection = buildSupervisorDutiesSection(matchedDuties)

  return NextResponse.json({
    data: {
      ...draft,
      source_risk_id:          ra.id,
      source_risk_title:        ra.title,
      project_id:               null,
      supervisor_duties:        supervisorDutiesSection,   // 자동 연계된 별표2 항목
      supervisor_duties_count:  matchedDuties.length,
    },
  })
}
