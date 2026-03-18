// types/education.ts — 안전보건교육일지 타입 정의

export type EduType =
  | 'onboarding'    // 채용 시 교육
  | 'regular'       // 정기교육
  | 'special'       // 특별교육
  | 'job_specific'  // 작업내용 변경 교육
  | 'accident'      // 사고 후 교육
  | 'other'

export const EDU_TYPE_LABELS: Record<EduType, string> = {
  onboarding:   '채용 시 교육',
  regular:      '정기교육',
  special:      '특별교육',
  job_specific: '작업내용 변경 교육',
  accident:     '사고 후 교육',
  other:        '기타',
}

// ─── 근무형태 (산안법 시행규칙 별표4 기준) ────────────────────
export type WorkerType =
  | 'regular_office'    // 상용직 - 사무직
  | 'regular_field'     // 상용직 - 현장직 (비사무직)
  | 'daily'             // 일용직
  | 'short_term'        // 단기간 근로자 (1개월 미만)
  | 'supervisor'        // 관리감독자
  | 'atypical'          // 특수형태근로종사자

export const WORKER_TYPE_LABELS: Record<WorkerType, string> = {
  regular_office: '상용직 — 사무직',
  regular_field:  '상용직 — 현장직',
  daily:          '일용직',
  short_term:     '단기간 근로자',
  supervisor:     '관리감독자',
  atypical:       '특수형태근로종사자',
}

// ─── 교육시간 기준표 (산안법 시행규칙 별표4) ─────────────────
// [edu_type][worker_type] → { min: 법정최소시간, default: 기본입력값, note: 근거 }
export interface HoursRule {
  min:     number   // 법정 최소시간
  default: number   // UI 기본값 (법정 최소 준수)
  note:    string   // 법령 근거 및 설명
}

export const EDU_HOURS_RULES: Partial<Record<EduType, Partial<Record<WorkerType, HoursRule>>>> = {
  // ── 채용 시 교육 (별표4 제1호) ───────────────────────────────
  onboarding: {
    regular_office: { min:8,  default:8,  note:'상용·사무직: 8시간 이상 (별표4 제1호가목)' },
    regular_field:  { min:8,  default:8,  note:'상용·현장직: 8시간 이상 (별표4 제1호가목)' },
    daily:          { min:1,  default:1,  note:'일용직: 1시간 이상 (별표4 제1호나목)' },
    short_term:     { min:2,  default:2,  note:'단기간 근로자: 2시간 이상 (별표4 제1호나목)' },
    supervisor:     { min:8,  default:8,  note:'관리감독자: 8시간 이상' },
    atypical:       { min:2,  default:2,  note:'특수형태근로종사자: 2시간 이상 (별표4 제4호)' },
  },
  // ── 정기교육 (별표4 제2호) ───────────────────────────────────
  regular: {
    regular_office: { min:3,  default:3,  note:'사무직: 매분기 3시간 이상 (별표4 제2호가목)' },
    regular_field:  { min:6,  default:6,  note:'비사무직: 매분기 6시간 이상 (별표4 제2호나목)' },
    daily:          { min:1,  default:1,  note:'일용직: 매월 1시간 이상 (별표4 제2호다목)' },
    short_term:     { min:1,  default:1,  note:'단기간 근로자: 매월 1시간 이상' },
    supervisor:     { min:8,  default:8,  note:'관리감독자: 매반기 8시간 이상 (별표4 제2호라목)' },
    atypical:       { min:2,  default:2,  note:'특수형태근로종사자: 최초 2시간, 이후 반기 2시간 (별표4 제4호)' },
  },
  // ── 특별교육 (별표4 제3호, 별표5) ───────────────────────────
  special: {
    regular_office: { min:16, default:16, note:'상용직: 16시간 이상 (최초 작업 전 4시간 실시, 나머지 3개월 내) (별표4 제3호)' },
    regular_field:  { min:16, default:16, note:'상용직: 16시간 이상 (최초 작업 전 4시간 실시, 나머지 3개월 내) (별표4 제3호)' },
    daily:          { min:2,  default:2,  note:'일용직·단기간 작업: 2시간 이상 (별표4 제3호 단서)' },
    short_term:     { min:2,  default:2,  note:'단기간 근로자: 2시간 이상 (별표4 제3호 단서)' },
    supervisor:     { min:16, default:16, note:'관리감독자 특별교육: 16시간 이상' },
    atypical:       { min:2,  default:2,  note:'특수형태: 2시간 이상' },
  },
  // ── 작업내용 변경 교육 (별표4 제1호다목) ─────────────────────
  job_specific: {
    regular_office: { min:2, default:2, note:'작업내용 변경 시: 2시간 이상 (별표4 제1호다목)' },
    regular_field:  { min:2, default:2, note:'작업내용 변경 시: 2시간 이상 (별표4 제1호다목)' },
    daily:          { min:1, default:1, note:'일용직 작업내용 변경: 1시간 이상' },
    short_term:     { min:1, default:1, note:'단기간 작업내용 변경: 1시간 이상' },
    supervisor:     { min:2, default:2, note:'관리감독자: 2시간 이상' },
    atypical:       { min:1, default:1, note:'특수형태: 1시간 이상' },
  },
  // ── 사고 후 교육 ─────────────────────────────────────────────
  accident: {
    regular_office: { min:2, default:2, note:'사고 발생 후 추가 교육: 2시간 이상 권장' },
    regular_field:  { min:2, default:2, note:'사고 발생 후 추가 교육: 2시간 이상 권장' },
    daily:          { min:1, default:1, note:'일용직: 1시간 이상 권장' },
    short_term:     { min:1, default:1, note:'단기간: 1시간 이상 권장' },
    supervisor:     { min:2, default:2, note:'관리감독자: 2시간 이상 권장' },
    atypical:       { min:1, default:1, note:'특수형태: 1시간 이상 권장' },
  },
}

// 기본 기준 (worker_type 미선택 시)
export const EDU_LEGAL_HOURS: Record<EduType, string> = {
  onboarding:   '일용직 1h / 단기간 2h / 상용직 8h 이상',
  regular:      '일용직 1h/월 / 사무직 3h/분기 / 현장직 6h/분기 / 관리감독자 8h/반기',
  special:      '일용직·단기간 2h / 상용직 16h 이상 (별표5 작업)',
  job_specific: '일용직 1h / 그 외 2h 이상',
  accident:     '추가 교육 실시 (2시간 이상 권장)',
  other:        '—',
}

/** 근무형태 + 교육종류로 권장 기본시간 반환 */
export function getDefaultHours(eduType: EduType, workerType: WorkerType): number {
  return EDU_HOURS_RULES[eduType]?.[workerType]?.default ?? 2
}

/** 법정 최소시간 반환 */
export function getMinHours(eduType: EduType, workerType: WorkerType): number {
  return EDU_HOURS_RULES[eduType]?.[workerType]?.min ?? 1
}

/** 법정 기준 설명 반환 */
export function getHoursNote(eduType: EduType, workerType: WorkerType): string {
  return EDU_HOURS_RULES[eduType]?.[workerType]?.note ?? '—'
}

/** 입력 시간이 법정 최소 이상인지 검증 */
export function isHoursValid(hours: number, eduType: EduType, workerType: WorkerType): boolean {
  return hours >= getMinHours(eduType, workerType)
}

export interface EduItem {
  seq:                  number
  source_risk_item_id:  string | null
  work_content:         string
  hazard_factor:        string
  hazard_type:          string
  risk_level:           string
  edu_point:            string
  legal_basis:          string
  countermeasure:       string
}

export interface Attendee {
  seq:        number
  name:       string
  position:   string
  department: string
  sign:       string | null
}

export interface EducationJournal {
  id:                   string
  company_id:           string
  project_id:           string | null
  source_risk_id:       string | null
  link_type:            'auto_from_risk' | 'manual'
  title:                string
  edu_type:             EduType
  worker_type:          WorkerType | null   // ← 추가
  edu_date:             string
  edu_start_time:       string | null
  edu_end_time:         string | null
  edu_duration_hours:   number | null
  edu_location:         string | null
  instructor_name:      string | null
  instructor_position:  string | null
  instructor_affil:     string | null
  edu_content:          string | null
  edu_items:            EduItem[]
  attendees:            Attendee[]
  attendee_count:       number
  status:               'draft' | 'completed' | 'archived'
  author_id:            string
  created_at:           string
  updated_at:           string
  author?:              { name: string; position: string }
  project?:             { name: string; site_name: string }
  source_risk?:         { title: string; eval_type: string }
  company?:             { name: string }
}

export const HAZARD_LEGAL_BASIS: Record<string, string> = {
  fall:         '산업안전보건기준에 관한 규칙 제42조 (추락에 의한 위험 방지)',
  entanglement: '산업안전보건기준에 관한 규칙 제87조 (끼임 위험 방지)',
  collision:    '산업안전보건기준에 관한 규칙 제98조 (충돌 위험 방지)',
  fire:         '산업안전보건기준에 관한 규칙 제230조 (화재 위험)',
  hazmat:       '산업안전보건법 제114조 (물질안전보건자료의 비치 등)',
  electrical:   '산업안전보건기준에 관한 규칙 제301조 (감전 위험 방지)',
  ergonomic:    '산업안전보건기준에 관한 규칙 제657조 (근골격계 부담작업)',
  other:        '산업안전보건법 제29조 (근로자에 대한 안전보건교육)',
}

export function generateEduPoint(
  hazardType: string,
  hazardFactor: string,
  countermeasure: string
): string {
  const points: Record<string, string> = {
    fall:         `추락·낙하 위험 인지 및 안전대 착용 방법\n안전난간·안전방망 점검 요령\n${hazardFactor} 대응 행동 요령`,
    entanglement: `회전체·끼임 위험부위 식별 방법\n잠금장치(LOTO) 사용 절차\n${hazardFactor} 예방 조치`,
    collision:    `충돌·협착 위험구역 접근 금지\n신호수 배치 및 유도 절차\n${hazardFactor} 대응 방법`,
    fire:         `화재·폭발 위험물 취급 주의사항\n소화기 사용법 및 대피 경로\n${hazardFactor} 예방 및 초기 대응`,
    hazmat:       `MSDS 확인 방법 및 주요 유해성\n개인보호구(방독마스크 등) 착용법\n${hazardFactor} 노출 시 응급처치`,
    electrical:   `감전 위험부위 식별 및 접근 금지\n절연장갑·절연화 착용 방법\n${hazardFactor} 발생 시 응급처치`,
    ergonomic:    `올바른 작업 자세 및 중량물 취급법\n근골격계 스트레칭 방법\n${hazardFactor} 예방 요령`,
    other:        `작업 전 위험요인 확인(TBM)\n${hazardFactor} 관련 안전 수칙\n보호구 착용 및 점검 방법`,
  }
  const base = points[hazardType] ?? points.other
  return countermeasure ? base + `\n\n[감소대책] ${countermeasure.slice(0, 100)}` : base
}

export function generateMsdsEduPoints(msds: any): string {
  const parts: string[] = []
  if (msds.hazard_statements?.length) parts.push(`유해·위험문구: ${msds.hazard_statements.slice(0,3).join('; ')}`)
  if (msds.precautionary_statements?.length) parts.push(`예방조치: ${msds.precautionary_statements.slice(0,3).join('; ')}`)
  if (msds.first_aid_inhale) parts.push(`흡입 시: ${msds.first_aid_inhale.slice(0,60)}`)
  if (msds.ppe_required) parts.push(`보호구: ${msds.ppe_required}`)
  if (msds.handling_storage) parts.push(`취급·보관: ${msds.handling_storage.slice(0,60)}`)
  return parts.join('\n') || '취급 화학물질의 유해·위험성 및 안전 취급방법'
}

export function getMsdsLegalBasis(hazards: string[]): string {
  const bases = ['산업안전보건법 제116조 (물질안전보건자료에 관한 교육)']
  if (hazards.some(h => ['toxic','corrosive','health_hazard'].includes(h)))
    bases.push('산업안전보건기준에 관한 규칙 제12장 (관리대상 유해물질)')
  return bases.join(' / ')
}
