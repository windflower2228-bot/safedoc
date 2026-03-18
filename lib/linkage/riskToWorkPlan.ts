// lib/linkage/riskToWorkPlan.ts
// 위험성평가 → 작업계획서 자동 변환 핵심 로직

import type { WorkPlanRiskItem, WorkPlanWorker, WorkPlanType } from '@/types/workplan'
import {
  WORK_PLAN_LEGAL_BASIS,
  WORK_PLAN_TYPE_LABELS,
  getWorkTemplate,
} from '@/types/workplan'

// ─── 위험성평가 항목 타입 ─────────────────────────────────────
interface RiskItemRow {
  id:                   string
  seq:                  number
  work_content:         string
  hazard_factor:        string
  hazard_type:          string
  current_level:        string
  current_score:        number
  engineering_measure:  string | null
  admin_measure:        string | null
  ppe_measure:          string | null
  measure_owner:        string | null
  measure_due_date:     string | null
  link_to_work_plan:    boolean
}

interface RiskAssessmentRow {
  id:              string
  title:           string
  eval_type:       string
  work_types:      string[]
  eval_start_date: string
  items:           RiskItemRow[]
  company?:        { name: string } | null
  project?:        { name: string; site_name: string } | null
  author?:         { name: string; position: string } | null
}

// ─── 자동 생성 결과 ───────────────────────────────────────────
export interface GeneratedWorkPlanDraft {
  title:               string
  plan_type:           WorkPlanType
  work_location:       string
  work_start_date:     string
  work_end_date:       string
  work_scope:          string
  legal_basis:         string
  supervisor_name:     string
  supervisor_position: string
  safety_summary:      string
  risk_items:          WorkPlanRiskItem[]
  workers:             WorkPlanWorker[]
  link_summary:        WorkPlanLinkSummary
}

export interface WorkPlanLinkSummary {
  source_risk_id:    string
  source_risk_title: string
  total_risk_items:  number
  linked_items:      number
  high_count:        number
  medium_count:      number
  plan_types:        WorkPlanType[]
}

// 작업 유형 → WorkPlanType 매핑
function hazardTypeToWorkPlanType(hazardType: string): WorkPlanType {
  const MAP: Record<string, WorkPlanType> = {
    fall:         'height',
    entanglement: 'heavy_equip',
    collision:    'crane',
    fire:         'welding',
    hazmat:       'chemical',
    electrical:   'electrical',
    ergonomic:    'heavy_equip',
    other:        'other',
  }
  return MAP[hazardType] ?? 'other'
}

// 가장 많이 나오는 WorkPlanType 선택
function dominantPlanType(items: RiskItemRow[]): WorkPlanType {
  const counts: Partial<Record<WorkPlanType, number>> = {}
  for (const item of items) {
    const t = hazardTypeToWorkPlanType(item.hazard_type)
    counts[t] = (counts[t] ?? 0) + 1
  }
  // 高위험 항목 우선, 그 다음 빈도
  let best: WorkPlanType = 'other'
  let bestScore = -1
  for (const item of items) {
    const t     = hazardTypeToWorkPlanType(item.hazard_type)
    const score = (counts[t] ?? 0) + (item.current_level === 'high' ? 10 : item.current_level === 'medium' ? 5 : 0)
    if (score > bestScore) { bestScore = score; best = t }
  }
  return best
}

// ─── 메인 변환 함수 ───────────────────────────────────────────
export function generateWorkPlanDraftFromRisk(
  ra: RiskAssessmentRow,
  options: {
    includeAll?:    boolean
    workStartDate?: string
    workEndDate?:   string
    location?:      string
    supervisor?:    string
  } = {}
): GeneratedWorkPlanDraft {
  const {
    includeAll    = false,
    workStartDate = ra.eval_start_date,
    workEndDate   = '',
    location      = ra.project?.site_name ?? '',
    supervisor    = ra.author?.name ?? '',
  } = options

  // 연계 항목 필터 (link_to_work_plan=true 또는 전체)
  const sourceItems = includeAll
    ? ra.items
    : ra.items.filter(i => i.link_to_work_plan)

  // 위험도 높은 순 정렬
  const LEVEL_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const sorted = [...sourceItems].sort((a, b) => {
    const la = LEVEL_ORDER[a.current_level] ?? 2
    const lb = LEVEL_ORDER[b.current_level] ?? 2
    if (la !== lb) return la - lb
    return b.current_score - a.current_score
  })

  // 우세한 작업 유형 결정
  const planType = dominantPlanType(sorted)

  // 위험요인별 작업계획 항목 생성
  const riskItems: WorkPlanRiskItem[] = sorted.map((item, idx) => {
    const tpl = getWorkTemplate(item.hazard_type)
    return {
      seq:                 idx + 1,
      source_risk_item_id: item.id,
      work_content:        item.work_content,
      hazard_factor:       item.hazard_factor,
      hazard_type:         item.hazard_type,
      risk_level:          item.current_level,
      risk_score:          item.current_score,
      // 위험성평가 감소대책 자동 반영
      engineering_measure: item.engineering_measure ?? '',
      admin_measure:       item.admin_measure ?? '',
      ppe_measure:         item.ppe_measure ?? '',
      measure_owner:       item.measure_owner ?? '',
      measure_due_date:    item.measure_due_date ?? '',
      // 작업 방법 템플릿
      work_method:         tpl.work_method,
      equipment_needed:    tpl.equipment_needed,
      worker_count:        item.current_level === 'high' ? 2 : 1,
      check_items:         tpl.check_items,
    }
  })

  // 기본 작업인원 템플릿 (역할별)
  const workers: WorkPlanWorker[] = [
    { seq: 1, name: supervisor, position: ra.author?.position ?? '안전관리자', role: '작업 책임자', license: '' },
    { seq: 2, name: '',         position: '',                                   role: '작업반장',   license: '' },
    { seq: 3, name: '',         position: '',                                   role: '작업원',     license: '' },
    { seq: 4, name: '',         position: '',                                   role: '안전감시자', license: '' },
  ]

  // 작업 범위 자동 작성
  const workTypes = ra.work_types.join(', ')
  const highItems = riskItems.filter(i => i.risk_level === 'high')
  const workScope = [
    `【작업 개요】 ${ra.title} 결과 도출된 위험요인에 대한 세부 작업계획을 수립함.`,
    `【주요 공종】 ${workTypes}`,
    `【주요 위험요인】 ${highItems.slice(0, 3).map(i => i.hazard_factor.split('\n')[0]).join(', ')}${highItems.length > 3 ? ` 외 ${highItems.length - 3}건` : ''}`,
    `【전체 계획 항목】 ${riskItems.length}건 (高위험 ${highItems.length}건 포함)`,
  ].join('\n')

  // 종합 안전대책 자동 작성
  const allPPE = [...new Set(riskItems.map(i => i.ppe_measure).filter(Boolean))].join(', ')
  const safetySummary = [
    '【공통 안전 수칙】',
    '1. 작업 전 TBM(Tool Box Meeting) 반드시 실시 후 작업 착수',
    '2. 개인보호구 착용 상태 확인 후 작업 시작',
    `3. 필수 보호구: ${allPPE || '안전모, 안전화, 안전조끼'}`,
    '4. 이상 발견 즉시 작업 중지 후 책임자에게 보고',
    '5. 작업 종료 후 현장 정리정돈 및 안전 상태 확인',
    '',
    '【비상연락체계】',
    '화재/재해 발생 시: 119 → 현장소장 → 안전관리자 순 보고',
  ].join('\n')

  // 제목 자동 생성
  const planTypeLabel = WORK_PLAN_TYPE_LABELS[planType].split(' ')[0]
  const title = `${workTypes.split(',')[0].trim()} ${planTypeLabel} 작업계획서`

  // 고유 planType 목록
  const planTypes = [...new Set(sorted.map(i => hazardTypeToWorkPlanType(i.hazard_type)))]

  return {
    title,
    plan_type:           planType,
    work_location:       location,
    work_start_date:     workStartDate,
    work_end_date:       workEndDate,
    work_scope:          workScope,
    legal_basis:         WORK_PLAN_LEGAL_BASIS[planType],
    supervisor_name:     supervisor,
    supervisor_position: ra.author?.position ?? '안전관리자',
    safety_summary:      safetySummary,
    risk_items:          riskItems,
    workers,
    link_summary: {
      source_risk_id:    ra.id,
      source_risk_title: ra.title,
      total_risk_items:  ra.items.length,
      linked_items:      riskItems.length,
      high_count:        highItems.length,
      medium_count:      riskItems.filter(i => i.risk_level === 'medium').length,
      plan_types:        planTypes,
    },
  }
}
