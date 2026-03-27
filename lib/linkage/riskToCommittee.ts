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

// 위험성평가 운영 실적을 "위험성평가 실시에 관한 사항" 안건 내용으로 자동 생성
export function buildRiskPerformanceAgenda(perf: RiskPerformance): CommitteeAgendaItem {
  return {
    seq: 4,
    title: '위험성평가 실시에 관한 사항',
    content: [
      `【평가 실적】 총 ${perf.eval_count}건 (${perf.period})`,
      `【위험도 현황】 高 ${perf.high_count}건 / 中 ${perf.mid_count}건 / 低 ${perf.low_count}건`,
      `【조치 이행률】 ${perf.resolved_rate}% (${perf.resolved_count}/${perf.high_count+perf.mid_count+perf.low_count}건)`,
      perf.notable_items.length > 0 ? `【고위험 항목】 ${perf.notable_items.join(', ')}` : '',
    ].filter(Boolean).join('\n'),
    decision: perf.high_count > 0
      ? `高위험 ${perf.high_count}건에 대한 개선 조치 이행 현황을 지속 모니터링하고 차기 회의에서 재확인`
      : '현행 위험성평가 수준 유지 및 정기 재검토',
    owner:    '안전관리자',
    deadline: '',
  }
}

// 협의체 기본 의안 템플릿 (산업안전보건법 시행규칙 제79조 + 기타)
export function getDefaultAgendaItems(includeRiskPerf: boolean, perf?: RiskPerformance): CommitteeAgendaItem[] {
  const riskAgendaContent = includeRiskPerf && perf
    ? buildRiskPerformanceAgenda(perf).content
    : '현장별 위험성평가 계획·실시 현황 및 개선 필요사항'
  const riskAgendaDecision = includeRiskPerf && perf
    ? buildRiskPerformanceAgenda(perf).decision
    : ''

  return [
    {
      seq: 1,
      title: '도급인과 수급인간의 작업의 연락 및 조정',
      content: '당일(당주) 공정 간 간섭, 동시작업, 작업순서 등 연락·조정이 필요한 사항',
      decision: '',
      owner: '사용자측 대표',
      deadline: '',
    },
    {
      seq: 2,
      title: '도급인과 수급인 전체가 참여하는 작업장 순회점검',
      content: '합동 순회점검 결과, 개선 필요사항 및 조치 우선순위',
      decision: '',
      owner: '안전관리자',
      deadline: '',
    },
    {
      seq: 3,
      title: '관계수급인 근로자에 대한 안전보건교육 지원',
      content: '관계수급인 교육 지원 현황, 추가 교육 필요사항, 교육 일정',
      decision: '',
      owner: '사용자측 대표',
      deadline: '',
    },
    {
      seq: 4,
      title: '위험성평가 실시에 관한 사항',
      content: riskAgendaContent,
      decision: riskAgendaDecision,
      owner: '안전관리자',
      deadline: '',
    },
    {
      seq: 5,
      title: '기타 산업재해 예방을 위하여 필요한 사항',
      content: '현장 특이사항, 근로자 건의사항, 기타 안전보건 개선 필요사항',
      decision: '',
      owner: '근로자측 대표',
      deadline: '',
    },
  ]
}
