import {
  EDU_TYPE_LABELS,
  WORKER_TYPE_LABELS,
  type EduItem,
  type EduType,
  type WorkerType,
} from '@/types/education'
import {
  ANNEX4_WORK_LABELS,
  WORK_PLAN_LEGAL_BASIS,
  type Annex4WorkKey,
  type WorkPlanType,
} from '@/types/workplan'

const EDU_LEGAL_BASIS_TEXT =
  '산업안전보건법 시행규칙 제26조제1항 (교육시간: [별표 4], 교육내용: [별표 5])'

const EDU_CONTENT_BY_TYPE: Record<EduType, string[]> = {
  onboarding: [
    '산업안전 및 사고 예방에 관한 사항',
    '산업보건 및 직업병 예방에 관한 사항',
    '산업안전보건 관계 법령 및 일반관리사항',
    '작업 개시 전 점검·정리정돈·비상조치에 관한 사항',
  ],
  regular: [
    '산업안전 및 사고 예방에 관한 사항',
    '산업보건 및 건강장해 예방에 관한 사항',
    '유해·위험 작업환경 관리에 관한 사항',
    '직무스트레스 및 고객응대 건강장해 예방에 관한 사항',
  ],
  special: [
    '유해·위험 작업별 작업방법·작업절차에 관한 사항',
    '유해·위험 작업별 위험요인 및 안전·보건조치에 관한 사항',
    '기계·기구·설비 점검 및 이상 시 조치에 관한 사항',
    '비상 시 대응 및 응급조치에 관한 사항',
    '해당 작업의 세부 항목은 시행규칙 [별표 5] 해당 호를 기준으로 반영',
  ],
  job_specific: [
    '변경된 작업의 작업방법·작업절차에 관한 사항',
    '변경된 작업의 위험요인 및 안전·보건조치에 관한 사항',
    '작업 개시 전 점검·비상조치에 관한 사항',
  ],
  accident: [
    '사고 재발방지를 위한 원인·대책 교육',
    '유사 작업 공정의 위험요인 재점검 사항',
    '비상대응 및 보고체계 재교육 사항',
  ],
  other: [
    '산업안전 및 보건에 관한 일반사항',
    '작업 전 점검 및 비상조치에 관한 사항',
  ],
}

export function buildEducationLegalContent(
  eduType: EduType,
  workerType: WorkerType | null | undefined,
  body?: string | null
): string {
  const lines = EDU_CONTENT_BY_TYPE[eduType] ?? EDU_CONTENT_BY_TYPE.other
  const worker = workerType ? WORKER_TYPE_LABELS[workerType] : '미지정'

  const header = [
    `[법정 근거] ${EDU_LEGAL_BASIS_TEXT}`,
    `[교육구분] ${EDU_TYPE_LABELS[eduType]} / [근무형태] ${worker}`,
    '[법정 필수 반영 항목]',
    ...lines.map((line, idx) => `${idx + 1}. ${line}`),
  ].join('\n')

  const requiredLineSet = new Set(lines)
  const cleanBody = (body ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false
      if (line.startsWith('[법정 근거]')) return false
      if (line.startsWith('[교육구분]')) return false
      if (line.startsWith('[법정 필수 반영 항목]')) return false
      if (line.startsWith('[추가 작성 내용]')) return false
      const normalized = line.replace(/^\d+\.\s*/, '')
      if (requiredLineSet.has(normalized)) return false
      return true
    })
    .join('\n')
    .trim()

  if (!cleanBody) return header
  return `${header}\n\n[추가 작성 내용]\n${cleanBody}`
}

export function ensureEducationItemsLegalBasis(items: EduItem[]): EduItem[] {
  return items.map((item) => {
    const base = '산업안전보건법 시행규칙 [별표 5] (교육내용) / [별표 4] (교육시간)'
    const lb = (item.legal_basis ?? '').trim()
    if (!lb) return { ...item, legal_basis: base }
    if (lb.includes('[별표 5]') && lb.includes('[별표 4]')) return item
    return { ...item, legal_basis: `${lb} / ${base}` }
  })
}

export const DEFAULT_ANNEX4_BY_PLAN_TYPE: Record<WorkPlanType, Annex4WorkKey> = {
  height: 'bridge_work',
  excavation: 'deep_excavation',
  crane: 'tower_crane_install',
  confined: 'chemical_facility',
  demolition: 'demolition',
  electrical: 'electrical_work',
  welding: 'chemical_facility',
  chemical: 'chemical_facility',
  heavy_equip: 'vehicle_construction_machine',
  other: 'heavy_object_handling',
}

const ANNEX4_REQUIRED_LINES: Record<Annex4WorkKey, string[]> = {
  tower_crane_install: [
    '타워크레인 조립·해체 순서와 신호방법',
    '부재 인양·체결·해체 시 추락·낙하 방지조치',
    '작업 반경 출입통제 및 기상조건 확인',
  ],
  vehicle_material_handling: [
    '장비 작업 반경과 동선 분리, 신호수 배치',
    '전도·협착 방지를 위한 지반 상태 및 아웃트리거 점검',
    '적재·하역 순서와 하중제한 준수',
  ],
  vehicle_construction_machine: [
    '굴삭기·불도저 등 작업 반경 출입통제',
    '장비 점검·후진경보·유도자 배치',
    '경사면·연약지반 전도 방지조치',
  ],
  chemical_facility: [
    '누출·폭발 위험물질 확인 및 격리 절차',
    '환기·가스농도 측정·점화원 통제',
    '비상대응(세안·샤워·대피) 계획',
  ],
  electrical_work: [
    '정전·검전·접지 및 잠금표지(LOTO) 절차',
    '절연보호구·절연공구 사용 기준',
    '활선접근 금지거리 및 감시자 배치',
  ],
  deep_excavation: [
    '지반·지층 상태 사전조사 결과 반영',
    '흙막이·버팀대·경사면 안정화 조치',
    '붕괴·매몰 대비 대피통로 및 감시체계',
  ],
  tunnel_excavation: [
    '막장면 붕락·낙반 방지 및 지보공 계획',
    '환기·가스농도·산소농도 측정 계획',
    '발파·장비 운용 동선 및 비상대피 계획',
  ],
  bridge_work: [
    '교량 고소작업 추락·낙하 방지조치',
    '거더 인양·가설 시 양중계획 및 신호체계',
    '하부 통행 통제 및 기상(강풍) 기준',
  ],
  quarry_work: [
    '비산석·붕락 위험구역 통제 계획',
    '발파·절단 장비 운용 안전거리 기준',
    '경사면 접근·운반차량 동선 관리',
  ],
  demolition: [
    '해체 순서(상부→하부) 및 구조안정 검토',
    '비산먼지·낙하물 방지 및 출입통제',
    '가스·전기·배관 차단 및 비상대응 계획',
  ],
  heavy_object_handling: [
    '중량물 중량·무게중심 확인 및 인양계획',
    '달기구(슬링·샤클) 점검 및 정격하중 준수',
    '하역·이동 경로 통제와 신호방법',
  ],
  rail_maintenance: [
    '열차 운행정보 공유 및 작업구간 통제',
    '선로 접근 안전거리·장비 배치 기준',
    '작업 시작·중지 신호체계 및 비상대응',
  ],
  rail_shunting: [
    '입환 신호수 배치 및 연락체계 확립',
    '차량 연결·분리 순서와 협착 방지조치',
    '작업구역 출입통제 및 비상정지 체계',
  ],
}

export function ensureWorkPlanScopeWithLegal(
  scope: string | null | undefined,
  workKey: Annex4WorkKey,
  round: number
): string {
  const allLegalChecklist = new Set(Object.values(ANNEX4_REQUIRED_LINES).flat())
  const body = (scope ?? '')
    .split('\n')
    .filter((line) =>
      !line.startsWith('[별표4 대상작업]') &&
      !line.startsWith('[계획서 회차]') &&
      !line.startsWith('[법정필수-산업안전보건기준에 관한 규칙 별표4]') &&
      !allLegalChecklist.has(line.trim().replace(/^\d+\.\s*/, ''))
    )
    .join('\n')
    .trim()

  const legalBlock = [
    '[법정필수-산업안전보건기준에 관한 규칙 별표4]',
    ...ANNEX4_REQUIRED_LINES[workKey].map((line, idx) => `${idx + 1}. ${line}`),
  ].join('\n')

  return [
    `[별표4 대상작업] ${ANNEX4_WORK_LABELS[workKey]}`,
    `[계획서 회차] ${round}차`,
    legalBlock,
    body,
  ].filter(Boolean).join('\n')
}

export function ensureWorkPlanLegalBasis(
  legalBasis: string | null | undefined,
  planType: WorkPlanType
): string {
  const base = '산업안전보건기준에 관한 규칙 제38조 및 [별표 4]'
  const typeBasis = WORK_PLAN_LEGAL_BASIS[planType]
  const text = (legalBasis ?? '').trim()
  if (!text) return `${base} / ${typeBasis}`
  if (text.includes('제38조') && text.includes('[별표 4]')) {
    return text.includes(typeBasis) ? text : `${text} / ${typeBasis}`
  }
  return `${base} / ${typeBasis} / ${text}`
}
