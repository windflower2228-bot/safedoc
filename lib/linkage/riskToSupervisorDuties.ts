// lib/linkage/riskToSupervisorDuties.ts
// 위험성평가 → 관리감독자의 유해위험방지업무 자동 추출
import { SUPERVISOR_DUTY_TABLE, type SupervisorDutyItem } from '@/types/supervisor-duties'

export function extractSupervisorDuties(riskItems: {
  work_type?: string
  hazard?: string
  risk_factor?: string
  reduction_measure?: string
}[]): SupervisorDutyItem[] {
  if (!riskItems?.length) return []
  const textBlob = riskItems.map(r =>
    [r.work_type, r.hazard, r.risk_factor, r.reduction_measure].filter(Boolean).join(' ')
  ).join(' ').toLowerCase()

  const matched = new Set<string>()
  const result: SupervisorDutyItem[] = []

  for (const dutyItem of SUPERVISOR_DUTY_TABLE) {
    if (matched.has(dutyItem.id)) continue
    const hit = dutyItem.keywords.some(kw => textBlob.includes(kw))
    if (hit) {
      matched.add(dutyItem.id)
      result.push(dutyItem)
    }
  }
  return result
}

// 위험성평가 엑셀 출력 시 별표2 섹션 추가용 데이터 반환
export function buildSupervisorDutiesSection(duties: SupervisorDutyItem[]) {
  if (!duties.length) return null
  return duties.map(d => ({
    workType:  d.workType,
    legalRef:  d.legalRef,
    duties:    d.duties,
    preChecks: d.preChecks,
    category:  d.category,
  }))
}
