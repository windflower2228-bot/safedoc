import { z } from 'zod'

// ─── 인증 ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
})

export const registerSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  confirmPassword: z.string(),
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  position: z.string().min(1, '직급을 입력해주세요'),
  companyName: z.string().min(2, '회사명을 입력해주세요').optional(),
  companyCode: z.string().optional(),  // 기존 회사 합류 코드
}).refine(d => d.password === d.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

export const companyJoinRequestCreateSchema = z.object({
  companyId: z.string().uuid('회사 ID 형식이 올바르지 않습니다'),
  userId: z.string().uuid('사용자 ID 형식이 올바르지 않습니다'),
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  position: z.string().min(1, '직급을 입력해주세요'),
  department: z.string().optional(),
  phone: z.string().optional(),
  requestedRole: z.enum(['company_admin', 'manager', 'viewer']).default('viewer'),
})

export const companyJoinRequestReviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewerMemo: z.string().optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

// ─── 회사 ─────────────────────────────────────────────────────────────────────

export const companySchema = z.object({
  name: z.string().min(2, '회사명을 입력해주세요'),
  biz_number: z.string()
    .regex(/^\d{3}-\d{2}-\d{5}$/, '사업자등록번호 형식: 000-00-00000'),
  ceo_name: z.string().min(1, '대표자명을 입력해주세요'),
  address: z.string().min(1, '주소를 입력해주세요'),
  industry: z.string().min(1, '업종을 입력해주세요'),
})

// ─── 사용자 ───────────────────────────────────────────────────────────────────

export const userInviteSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
  name: z.string().min(2, '이름을 입력해주세요'),
  position: z.string().min(1, '직급을 입력해주세요'),
  department: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['company_admin', 'manager', 'viewer']),
})

export const userUpdateSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  position: z.string().min(1, '직급을 입력해주세요'),
  department: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['company_admin', 'manager', 'viewer']).optional(),
})

// ─── 위험성평가 ───────────────────────────────────────────────────────────────

export const riskItemSchema = z.object({
  seq: z.number().int().positive(),
  work_content: z.string().min(1, '작업 내용을 입력해주세요'),
  hazard_factor: z.string().min(1, '유해·위험요인을 입력해주세요'),
  hazard_type: z.enum([
    // legacy values
    'fall', 'entanglement', 'collision', 'fire',
    'hazmat', 'electrical', 'ergonomic',
    // new values
    'falling', 'tripping', 'crushed_overturned', 'struck_against',
    'struck_by_object', 'collapse', 'caught_in', 'cut_stab',
    'fire_explosion_rupture', 'overexertion', 'occupational_disease',
    'other'
  ]),
  current_probability: z.number().int().min(1).max(5),
  current_severity: z.number().int().min(1).max(5),
  engineering_measure: z.string().optional().default(''),
  admin_measure: z.string().optional().default(''),
  ppe_measure: z.string().optional().default(''),
  measure_owner: z.string().optional().default(''),
  measure_due_date: z.string().optional().default(''),
  residual_probability: z.number().int().min(1).max(5).optional(),
  residual_severity: z.number().int().min(1).max(5).optional(),
  link_to_education: z.boolean().default(false),
  link_to_work_plan: z.boolean().default(false),
})

export const riskAssessmentSchema = z.object({
  title: z.string().min(2, '평가 제목을 입력해주세요'),
  project_id: z.string().uuid('현장을 선택해주세요').optional().or(z.literal('')),
  eval_type: z.enum(['initial', 'periodic', 'special', 'always_on']),
  eval_start_date: z.string().min(1, '평가 시작일을 입력해주세요'),
  eval_end_date: z.string().min(1, '평가 종료일을 입력해주세요'),
  work_types: z.string().min(1, '공종을 입력해주세요'),
  overview: z.string().optional().default(''),
  items: z.array(riskItemSchema).min(1, '위험요인 항목을 1개 이상 입력해주세요'),
})
.refine(d => d.eval_start_date <= d.eval_end_date, {
  message: '종료일은 시작일 이후여야 합니다',
  path: ['eval_end_date'],
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type RiskAssessmentFormData = z.infer<typeof riskAssessmentSchema>
export type RiskItemFormData = z.infer<typeof riskItemSchema>
export type UserInviteFormData = z.infer<typeof userInviteSchema>
export type CompanyFormData = z.infer<typeof companySchema>
export type CompanyJoinRequestCreateFormData = z.infer<typeof companyJoinRequestCreateSchema>
export type CompanyJoinRequestReviewFormData = z.infer<typeof companyJoinRequestReviewSchema>
