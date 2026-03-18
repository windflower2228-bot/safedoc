// app/api/documents/education/generate/route.ts
// POST: 위험성평가 ID를 받아 교육일지 초안 데이터를 반환 (저장은 하지 않음)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEduDraftFromRisk } from '@/lib/linkage/riskToEducation'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const { risk_id, include_all, edu_date, instructor, location } = body

  if (!risk_id) {
    return NextResponse.json({ error: 'risk_id가 필요합니다.' }, { status: 400 })
  }

  // 위험성평가 + 항목 전체 조회
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
        link_to_education
      )
    `)
    .eq('id', risk_id)
    .single()

  if (error || !ra) {
    return NextResponse.json({ error: '위험성평가를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 교육 연계 항목이 없으면 경고
  const linkedCount = (ra.items as any[]).filter((i: any) => i.link_to_education).length
  if (linkedCount === 0 && !include_all) {
    return NextResponse.json({
      warning: '교육 연계로 체크된 위험요인 항목이 없습니다. include_all=true 로 전체 항목을 포함할 수 있습니다.',
      linked_count: 0,
    }, { status: 200 })
  }

  // 초안 생성
  const draft = generateEduDraftFromRisk(ra as any, {
    includeAll: include_all ?? false,
    eduDate:    edu_date,
    instructor: instructor ?? ra.author?.name ?? '',
    location:   location,
  })

  return NextResponse.json({
    data: {
      ...draft,
      source_risk_id:    ra.id,
      source_risk_title: ra.title,
      project_id:        null,
      // worker_type 기본값: 현장직(상용직) — 사용자가 기본정보에서 변경 가능
      worker_type: 'regular_field',
    },
  })
}
