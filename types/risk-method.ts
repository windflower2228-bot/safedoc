// types/risk-method.ts
// 사업장 위험성평가에 관한 지침 (고용노동부고시 제2024-76호) 4가지 방법

// ──────────────────────────────────────────────────────────────
// 방법 1: 빈도·강도법 (3×3 / 4×4 / 5×5 사용자 선택)
// ──────────────────────────────────────────────────────────────
export type MatrixSize = 3 | 4 | 5

export interface MatrixConfig {
  size: MatrixSize
  probLabels: string[]    // 행 레이블 (빈도/가능성)
  sevLabels:  string[]    // 열 레이블 (강도/중대성)
  thresholds: { high: number; medium: number }
}

export const MATRIX_CONFIGS: Record<MatrixSize, MatrixConfig> = {
  3: {
    size: 3,
    probLabels: ['1 — 낮음 (거의 발생 안함)', '2 — 중간 (가끔 발생)', '3 — 높음 (자주 발생)'],
    sevLabels:  ['1 — 경미 (응급처치 수준)', '2 — 보통 (3일 이상 요양)', '3 — 심각 (영구장애·사망)'],
    thresholds: { high: 6, medium: 3 },   // ≥6:高, 3~5:中, <3:低
  },
  4: {
    size: 4,
    probLabels: [
      '1 — 매우 낮음 (연 1회 미만)',
      '2 — 낮음 (연 1~3회)',
      '3 — 중간 (월 1회 이상)',
      '4 — 높음 (주 1회 이상)',
    ],
    sevLabels: [
      '1 — 경미 (응급처치, 업무 복귀 가능)',
      '2 — 보통 (3일 이상 휴업)',
      '3 — 심각 (1개월 이상 휴업)',
      '4 — 매우 심각 (영구장애·사망)',
    ],
    thresholds: { high: 9, medium: 4 },   // ≥9:高, 4~8:中, <4:低
  },
  5: {
    size: 5,
    probLabels: [
      '1 — 매우 낮음 (연 1회 미만)',
      '2 — 낮음 (연 1~6회)',
      '3 — 보통 (월 1회 이상)',
      '4 — 높음 (주 1회 이상)',
      '5 — 매우 높음 (매일)',
    ],
    sevLabels: [
      '1 — 극히 경미 (응급처치, 즉시 복귀)',
      '2 — 경미 (응급처치, 1~3일 휴업)',
      '3 — 보통 (3일~1개월 휴업)',
      '4 — 심각 (1개월 이상, 영구장애)',
      '5 — 매우 심각 (사망)',
    ],
    thresholds: { high: 15, medium: 8 },  // ≥15:高, 8~14:中, <8:低
  },
}

export function calcMatrixLevel(
  prob: number, sev: number, size: MatrixSize
): 'high' | 'medium' | 'low' {
  const score = prob * sev
  const { thresholds } = MATRIX_CONFIGS[size]
  if (score >= thresholds.high)   return 'high'
  if (score >= thresholds.medium) return 'medium'
  return 'low'
}

// ──────────────────────────────────────────────────────────────
// 방법 2: 체크리스트법
// ──────────────────────────────────────────────────────────────
export type CheckResult = 'ok' | 'improve' | 'na'  // 적정 / 개선필요 / 해당없음

export interface ChecklistItem {
  seq:            number
  category:       string          // 분류 (추락·끼임 등)
  hazard_factor:  string          // 유해위험요인
  legal_ref?:     string          // 관련 법령·기준
  check_result:   CheckResult     // 적정/개선필요/해당없음
  current_status: string          // 현재 조치 현황
  improve_action: string          // 개선 대책 (보완 시)
  improve_owner:  string
  improve_due:    string
  improve_done:   boolean
}

// 건설업 체크리스트 기본 항목 (고용노동부 예시 기반)
export const DEFAULT_CHECKLIST_CATEGORIES = [
  {
    category: '추락',
    items: [
      '2m 이상 고소작업 시 안전난간 또는 추락방호망 설치',
      '개구부(슬래브 구멍·피트 등)에 덮개 또는 안전난간 설치',
      '비계·작업발판 설치 및 상태 양호',
      '안전대 부착설비 및 안전대 착용',
      '사다리·계단의 미끄럼 방지 조치',
    ],
  },
  {
    category: '끼임·협착',
    items: [
      '회전체·구동부 방호덮개 설치',
      '컨베이어 비상정지장치 기능',
      '크레인·지게차 등 중장비 후방 경보장치',
      '작업 중 기계 정지 후 점검·청소',
    ],
  },
  {
    category: '충돌·낙하물',
    items: [
      '낙하물 방지망·낙하물 방지선반 설치',
      '안전모 착용 철저',
      '중장비 작업반경 내 근로자 출입 통제',
      '자재 적재 상태 안전성 확인',
    ],
  },
  {
    category: '화재·폭발',
    items: [
      '용접·용단 작업 전 인화성 물질 제거 확인',
      '소화기 비치 및 사용 가능 상태',
      '화재감시자 배치',
      'LPG·아세틸렌 가스용기 직립 보관 및 전도 방지',
    ],
  },
  {
    category: '전기',
    items: [
      '임시전기설비 과부하 방지 및 접지',
      '전선 피복 손상 여부 점검',
      '분전함 잠금·표지 부착',
      '습윤장소 방수형 기기 사용',
    ],
  },
  {
    category: '보호구',
    items: [
      '작업별 보호구 지급 및 착용 상태',
      '보호구 상태(파손·불량 여부) 점검',
      '안전화·안전모·안전대 적격품 사용(KCs 인증)',
    ],
  },
]

// ──────────────────────────────────────────────────────────────
// 방법 3: 위험성 수준 3단계 판단법
// ──────────────────────────────────────────────────────────────
export type ThreeLevelRisk = 'high' | 'medium' | 'low'

export const THREE_LEVEL_CRITERIA = {
  high:   { label: '상 (高)',  color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', desc: '근로자가 사망하거나 영구적 장애를 입을 수 있는 재해가 일어날 가능성' },
  medium: { label: '중 (中)', color: '#d97706', bg: '#fffbeb', border: '#fde68a', desc: '근로자가 연속하여 3일 이상의 휴업을 해야 하는 재해가 일어날 가능성' },
  low:    { label: '하 (低)',  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', desc: '근로자가 경미한 부상 또는 질병이 일어날 가능성 (허용 가능)' },
}

export interface ThreeLevelItem {
  seq:             number
  work_content:    string
  hazard_factor:   string
  hazard_type:     string
  current_measure: string   // 현재 안전조치
  risk_level:      ThreeLevelRisk
  is_acceptable:   boolean  // 허용 가능 여부
  reduce_measure:  string   // 위험성 감소대책
  measure_owner:   string
  measure_due:     string
  measure_done:    boolean
}

// ──────────────────────────────────────────────────────────────
// 방법 4: 핵심요인 기술법 (OPS — One Point Sheet)
// ──────────────────────────────────────────────────────────────
// 작업 1개당 1장 원칙, 핵심 위험요인과 조치만 간결하게 기술
// 작업기간 1개월 미만 임시·수시·비정형 작업에 주로 활용

export interface OpsItem {
  seq:              number
  work_name:        string   // 작업명
  work_step:        string   // 작업 단계·절차
  hazard_factor:    string   // 핵심 유해위험요인 (1~2개)
  injury_type:      string   // 예상 재해 유형
  current_measure:  string   // 현재 안전조치
  is_sufficient:    boolean  // 조치 충분 여부
  additional_measure: string // 추가 조치사항
  worker_pledge:    string   // 근로자 준수 사항 (TBM 공유)
  photo_url?:       string   // 사진 첨부 (선택)
}

// ──────────────────────────────────────────────────────────────
// 공통 — 평가 방법 메타
// ──────────────────────────────────────────────────────────────
export const EVAL_METHOD_CONFIG = {
  matrix: {
    id:    'matrix' as const,
    label: '빈도·강도법',
    desc:  '가능성(빈도) × 중대성(강도) 점수 계산 | 3×3 / 4×4 / 5×5 선택',
    tag:   '정량적',
    color: '#2563eb', bg: '#eff6ff',
    suitable: '제조업·건설업 전반, 복잡한 공정, 상시 근로자 50명 이상',
  },
  checklist: {
    id:    'checklist' as const,
    label: '체크리스트법',
    desc:  '사전 준비한 항목별 적정/보완/해당없음 체크 | 법령 기준 연계',
    tag:   '구조적',
    color: '#16a34a', bg: '#f0fdf4',
    suitable: '정기평가, 동일 작업 반복 사업장, 법령 준수 여부 확인',
  },
  three_level: {
    id:    'three_level' as const,
    label: '위험성 수준 3단계 판단법',
    desc:  '상·중·하 직관적 판단 | 허용 가능 수준 결정 | 소규모 현장 적합',
    tag:   '직관적',
    color: '#d97706', bg: '#fffbeb',
    suitable: '소규모 건설현장, 중소기업, 빈도강도 계산이 어려운 사업장',
  },
  ops: {
    id:    'ops' as const,
    label: '핵심요인 기술법 (OPS)',
    desc:  '핵심 위험요인 1~2개 간결 기술 | One Point Sheet | TBM 활용',
    tag:   '간편',
    color: '#7c3aed', bg: '#f5f3ff',
    suitable: '1개월 미만 임시·수시·비정형 작업, 소규모 사업장, 현장 TBM',
  },
} as const

export type EvalMethod = keyof typeof EVAL_METHOD_CONFIG

export const RISK_LEVEL_CFG = {
  high:   { label: '高위험', short: '高', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  medium: { label: '中위험', short: '中', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  low:    { label: '低위험', short: '低', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
}
