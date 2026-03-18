// lib/linkage/riskToEducation.ts
// 위험성평가 → 안전보건교육일지 자동 변환 핵심 로직

import type { EduItem } from '@/types/education'
import { generateEduPoint, HAZARD_LEGAL_BASIS } from '@/types/education'

// 위험성평가 항목 타입 (DB에서 조회한 형태)
interface RiskItemRow {
  id:                   string
  seq:                  number
  work_content:         string
  hazard_factor:        string
  hazard_type:          string
  current_level:        string   // 'high' | 'medium' | 'low'
  current_score:        number
  engineering_measure:  string | null
  admin_measure:        string | null
  ppe_measure:          string | null
  link_to_education:    boolean
}

interface RiskAssessmentRow {
  id:             string
  title:          string
  eval_type:      string
  work_types:     string[]
  eval_start_date: string
  items:          RiskItemRow[]
  company?:       { name: string }
  project?:       { name: string; site_name: string } | null
  author?:        { name: string; position: string } | null
}

// ─── 메인 변환 함수 ──────────────────────────────────────────

export interface GeneratedEduDraft {
  title:               string
  edu_type:            string
  edu_date:            string
  edu_duration_hours:  number
  edu_location:        string
  instructor_name:     string
  instructor_position: string
  edu_content:         string
  edu_items:           EduItem[]
  attendees:           { seq: number; name: string; position: string; department: string; sign: null }[]
  link_summary:        LinkSummary
}

export interface LinkSummary {
  source_risk_id:    string
  source_risk_title: string
  total_risk_items:  number
  linked_items:      number
  high_count:        number
  medium_count:      number
  low_count:         number
  work_types:        string[]
}

export function generateEduDraftFromRisk(
  ra: RiskAssessmentRow,
  options: {
    includeAll?: boolean     // false면 link_to_education=true 항목만
    eduDate?:    string
    instructor?: string
    location?:   string
  } = {}
): GeneratedEduDraft {
  const {
    includeAll  = false,
    eduDate     = new Date().toISOString().slice(0, 10),
    instructor  = '',
    location    = ra.project?.site_name ?? '',
  } = options

  // 연계 대상 항목 필터
  const sourceItems = includeAll
    ? ra.items
    : ra.items.filter(i => i.link_to_education)

  // 위험도 높은 순으로 정렬 (High → Medium → Low)
  const LEVEL_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const sorted = [...sourceItems].sort((a, b) => {
    const la = LEVEL_ORDER[a.current_level] ?? 2
    const lb = LEVEL_ORDER[b.current_level] ?? 2
    if (la !== lb) return la - lb
    return b.current_score - a.current_score   // 같은 레벨 내 점수 높은 순
  })

  // 교육 항목 생성
  const eduItems: EduItem[] = sorted.map((item, idx) => {
    const countermeasure = [
      item.engineering_measure,
      item.admin_measure,
      item.ppe_measure,
    ].filter(Boolean).join(' / ')

    return {
      seq:                 idx + 1,
      source_risk_item_id: item.id,
      work_content:        item.work_content,
      hazard_factor:       item.hazard_factor,
      hazard_type:         item.hazard_type,
      risk_level:          item.current_level,
      edu_point:           generateEduPoint(item.hazard_type, item.hazard_factor, countermeasure),
      legal_basis:         HAZARD_LEGAL_BASIS[item.hazard_type] ?? HAZARD_LEGAL_BASIS.other,
      countermeasure,
    }
  })

  // 교육 시간 자동 산정 (항목 수 기반 + 법정 기준 준수)
  const baseHours = Math.max(2, Math.ceil(eduItems.length * 0.5))
  const eduHours  = Math.min(baseHours, 8)  // 최대 8시간

  // 교육 내용 요약 자동 생성
  const workTypesStr  = ra.work_types.join(', ')
  const highItems     = eduItems.filter(i => i.risk_level === 'high')
  const eduContent    = [
    `【교육 목적】 ${ra.title} 결과를 바탕으로 작업 현장의 유해·위험요인을 근로자에게 주지시키고 재해 예방을 도모함.`,
    `【주요 공종】 ${workTypesStr}`,
    `【교육 항목 수】 전체 ${eduItems.length}개 항목 (高위험 ${highItems.length}건 포함)`,
    `【중점 교육 내용】 ${highItems.slice(0, 2).map(i => i.hazard_factor).join(', ')}${highItems.length > 2 ? ` 외 ${highItems.length - 2}건` : ''} 관련 안전 수칙 및 감소대책`,
    `【근거】 위험성평가 실시 결과 (${ra.eval_start_date} 기준)`,
  ].join('\n')

  // 제목 자동 생성
  const riskTypeLabel = ra.eval_type === 'periodic' ? '정기' : ra.eval_type === 'special' ? '수시' : '정기'
  const title = `${workTypesStr.split(',')[0].trim()} 위험성평가 ${riskTypeLabel}교육 (${eduDate.slice(0, 7)})`

  // 참석자 기본 템플릿 (5명 빈 행)
  const attendees = Array.from({ length: 5 }, (_, i) => ({
    seq:        i + 1,
    name:       '',
    position:   '',
    department: '',
    sign:       null,
  }))

  // 연계 요약
  const linkSummary: LinkSummary = {
    source_risk_id:    ra.id,
    source_risk_title: ra.title,
    total_risk_items:  ra.items.length,
    linked_items:      eduItems.length,
    high_count:        eduItems.filter(i => i.risk_level === 'high').length,
    medium_count:      eduItems.filter(i => i.risk_level === 'medium').length,
    low_count:         eduItems.filter(i => i.risk_level === 'low').length,
    work_types:        ra.work_types,
  }

  return {
    title,
    edu_type:            'special',   // 위험성평가 연계 → 특별교육 기본
    edu_date:            eduDate,
    edu_duration_hours:  eduHours,
    edu_location:        location,
    instructor_name:     instructor,
    instructor_position: '',
    edu_content:         eduContent,
    edu_items:           eduItems,
    attendees,
    link_summary:        linkSummary,
  }
}
