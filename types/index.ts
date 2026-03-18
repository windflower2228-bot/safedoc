// ─── 공통 ─────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'company_admin' | 'manager' | 'viewer'

export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'archived'

export type RiskLevel = 'high' | 'medium' | 'low'

// ─── 회사 ─────────────────────────────────────────────────────────────────────

export interface Company {
  id: string
  name: string
  biz_number: string           // 사업자등록번호
  ceo_name: string
  address: string
  industry: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

// ─── 사용자 ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  company_id: string
  email: string
  name: string
  position: string             // 직급
  department: string | null    // 부서
  phone: string | null
  role: UserRole
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
  company?: Company
}

// ─── 현장·프로젝트 ────────────────────────────────────────────────────────────

export interface Project {
  id: string
  company_id: string
  name: string
  site_name: string            // 현장명
  site_address: string | null
  start_date: string | null
  end_date: string | null
  status: 'active' | 'completed' | 'suspended'
  created_at: string
}

// ─── 위험성평가 ───────────────────────────────────────────────────────────────

export type RiskEvalType = 'initial' | 'periodic' | 'special' | 'always_on'
// 최초 | 정기 | 수시 | 상시

export interface RiskAssessment {
  id: string
  company_id: string
  project_id: string | null
  title: string
  eval_type: RiskEvalType
  eval_start_date: string
  eval_end_date: string
  work_types: string[]         // 공종 목록
  overview: string | null
  status: DocumentStatus
  version: number
  author_id: string
  reviewer_id: string | null
  approver_id: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  // joined
  author?: UserProfile
  project?: Project
  items?: RiskItem[]
}

export interface RiskItem {
  id: string
  assessment_id: string
  seq: number                  // 순번
  work_content: string         // 작업 내용
  hazard_factor: string        // 유해·위험요인
  hazard_type: HazardType      // 위험 유형
  // 현재 위험도
  current_probability: number  // 가능성 1~5
  current_severity: number     // 중대성 1~5
  current_score: number        // 위험도 점수 (자동계산)
  current_level: RiskLevel     // 판정
  // 감소대책
  engineering_measure: string | null   // 공학적 대책
  admin_measure: string | null         // 관리적 대책
  ppe_measure: string | null           // 보호구
  measure_owner: string | null         // 담당자
  measure_due_date: string | null      // 완료기한
  // 개선 후 위험도
  residual_probability: number | null
  residual_severity: number | null
  residual_score: number | null
  residual_level: RiskLevel | null
  // 연계
  link_to_education: boolean   // 교육일지 연계
  link_to_work_plan: boolean   // 작업계획서 연계
  created_at: string
}

export type HazardType =
  | 'fall'          // 추락·전도
  | 'entanglement'  // 끼임
  | 'collision'     // 충돌
  | 'fire'          // 화재·폭발
  | 'hazmat'        // 유해물질
  | 'electrical'    // 감전
  | 'ergonomic'     // 근골격계
  | 'other'         // 기타

// ─── 문서 연계 ────────────────────────────────────────────────────────────────

export interface DocumentLink {
  id: string
  source_doc_id: string
  source_doc_type: string
  target_doc_id: string
  target_doc_type: string
  link_type: 'auto' | 'manual'
  auto_fields: Record<string, unknown>
  created_at: string
}

// ─── 활동 계획 ────────────────────────────────────────────────────────────────

export interface ActivityPlan {
  id: string
  company_id: string
  project_id: string | null
  year: number
  month: number
  activities: ActivityItem[]
  created_at: string
}

export interface ActivityItem {
  id: string
  plan_id: string
  activity_type: string
  title: string
  scheduled_date: string
  is_completed: boolean
  completed_at: string | null
  linked_doc_id: string | null
  notify_days_before: number[]  // [1, 3, 7]
  notify_email: boolean
}

// ─── Form 타입 ────────────────────────────────────────────────────────────────

export interface RiskAssessmentFormData {
  title: string
  project_id: string
  eval_type: RiskEvalType
  eval_start_date: string
  eval_end_date: string
  work_types: string
  overview: string
  items: RiskItemFormData[]
}

export interface RiskItemFormData {
  seq: number
  work_content: string
  hazard_factor: string
  hazard_type: HazardType
  current_probability: number
  current_severity: number
  engineering_measure: string
  admin_measure: string
  ppe_measure: string
  measure_owner: string
  measure_due_date: string
  residual_probability: number
  residual_severity: number
  link_to_education: boolean
  link_to_work_plan: boolean
}

// ─── API 응답 ─────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}
