// lib/linkage/riskToCommittee.ts
// 위험성평가 운영 실적 → 안전보건협의체 회의록 자동 연계

import type { RiskPerformance, CommitteeAgendaItem } from '@/types/inspection'

interface RiskItem { current_level:string; work_content:string; hazard_factor:string; measure_owner:string|null }
interface RA { id:string; title:string; eval_start_date:string; eval_end_date?:string; items:RiskItem[] }

// 위험성평가 목록 → 운영 실적 요약 생성
export function buildRiskPerformance(raList: RA[]): RiskPerformance {
  if (!raList.length) return { eval_count:0, high_count:0, mid_count:0, low_count:0, resolved_count:0, resolved_rate:0, period:'', notable_items:[] }

  let high=0, mid=0, low=0
  const notable: string[] = []
  for (const ra of raList) {
    for (const item of ra.items) {
      if (item.current_level==='high')  { high++; notable.push(`${item.work_content}(${item.hazard_factor})`) }
      else if (item.current_level==='mid') mid++
      else low++
    }
  }

  const total = high+mid+low
  const resolved = mid+low  // 中·低는 관리 중으로 간주
  const period = raList.length > 0
    ? `${raList[raList.length-1].eval_start_date} ~ ${raList[0].eval_start_date}`
    : ''

  return {
    eval_count:    raList.length,
    high_count:    high,
    mid_count:     mid,
    low_count:     low,
    resolved_count:resolved,
    resolved_rate: total > 0 ? Math.round(resolved/total*100) : 0,
    period,
    notable_items: notable.slice(0, 5),
  }
}

// 위험성평가 운영 실적을 협의체 의안으로 자동 생성
export function buildRiskPerformanceAgenda(perf: RiskPerformance): CommitteeAgendaItem {
  return {
    seq: 1,
    title: '위험성평가 운영 실적 보고',
    content: [
      `【평가 실적】 총 ${perf.eval_count}건 (${perf.period})`,
      `【위험도 현황】 高 ${perf.high_count}건 / 中 ${perf.mid_count}건 / 低 ${perf.low_count}건`,
      `【조치 이행률】 ${perf.resolved_rate}% (${perf.resolved_count}/${perf.high_count+perf.mid_count+perf.low_count}건)`,
      perf.notable_items.length > 0 ? `【고위험 항목】 ${perf.notable_items.join(', ')}` : '',
    ].filter(Boolean).join('\n'),
    decision: perf.high_count > 0
      ? `高위험 ${perf.high_count}건에 대한 개선 조치 이행 현황 지속 모니터링 및 차기 회의 보고`
      : '현행 위험성평가 수준 유지 및 정기 재검토 지속',
    owner:    '안전관리자',
    deadline: '',
  }
}

// 협의체 기본 의안 템플릿
export function getDefaultAgendaItems(includeRiskPerf: boolean, perf?: RiskPerformance): CommitteeAgendaItem[] {
  const items: CommitteeAgendaItem[] = []
  let seq = 1

  if (includeRiskPerf && perf) {
    items.push({ ...buildRiskPerformanceAgenda(perf), seq: seq++ })
  }

  items.push(
    { seq:seq++, title:'안전보건 활동 추진 실적 보고', content:'전월 안전보건 활동 계획 대비 실적 보고\n(순회점검, 교육, 합동점검 등)', decision:'', owner:'안전관리자', deadline:'' },
    { seq:seq++, title:'재해 발생 현황 및 원인 분석', content:'기간 중 재해 발생 현황\n(무재해인 경우 무재해 지속 현황 보고)', decision:'', owner:'안전보건관리책임자', deadline:'' },
    { seq:seq++, title:'안전보건 활동 계획 수립', content:'차기 월 안전보건 활동 계획\n(교육, 점검, 측정, 평가 등)', decision:'', owner:'안전관리자', deadline:'' },
    { seq:seq++, title:'근로자 의견 청취', content:'근로자 대표의 안전보건 관련 건의사항\n및 개선 요구사항', decision:'', owner:'근로자 대표', deadline:'' },
  )

  return items
}
