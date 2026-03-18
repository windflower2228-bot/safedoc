// types/plan.ts — 안전보건활동계획표 타입 정의

export type ActivityType =
  | 'risk_assessment'    // 위험성평가
  | 'education'          // 안전보건교육
  | 'work_plan'          // 작업계획서
  | 'inspection'         // 순회점검
  | 'joint_inspection'   // 합동안전보건점검
  | 'committee'          // 안전보건협의체
  | 'msds'               // MSDS 관리
  | 'designation'        // 지정서·선임서
  | 'health_check'       // 건강검진
  | 'drill'              // 비상훈련·대피훈련
  | 'other'              // 기타

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  risk_assessment:  '위험성평가',
  education:        '안전보건교육',
  work_plan:        '작업계획서',
  inspection:       '순회점검',
  joint_inspection: '합동안전보건점검',
  committee:        '안전보건협의체',
  msds:             'MSDS 관리',
  designation:      '지정서·선임서',
  health_check:     '건강검진',
  drill:            '비상·대피훈련',
  other:            '기타',
}

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, { bg: string; text: string; border: string }> = {
  risk_assessment:  { bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200' },
  education:        { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
  work_plan:        { bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200' },
  inspection:       { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200' },
  joint_inspection: { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
  committee:        { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200' },
  msds:             { bg: 'bg-cyan-50',    text: 'text-cyan-700',   border: 'border-cyan-200' },
  designation:      { bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200' },
  health_check:     { bg: 'bg-teal-50',    text: 'text-teal-700',   border: 'border-teal-200' },
  drill:            { bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-200' },
  other:            { bg: 'bg-gray-50',    text: 'text-gray-600',   border: 'border-gray-200' },
}

// 알림 방식
export type NotifyChannel = 'email' | 'kakao' | 'both' | 'none'

export interface ActivityPlanItem {
  id:                 string
  plan_id:            string
  activity_type:      ActivityType
  title:              string
  description:        string | null
  scheduled_date:     string              // YYYY-MM-DD
  scheduled_time:     string | null       // HH:MM
  is_completed:       boolean
  completed_at:       string | null
  linked_doc_id:      string | null
  linked_doc_type:    string | null
  notify_days_before: number[]            // [1, 3, 7]
  notify_channel:     NotifyChannel
  notify_email:       string | null       // 수신 이메일 (null이면 계정 이메일)
  notify_phone:       string | null       // 카카오 수신 번호
  last_notified_at:   string | null
  created_at:         string
  updated_at:         string
}

export interface ActivityPlan {
  id:         string
  company_id: string
  project_id: string | null
  year:       number
  month:      number
  items:      ActivityPlanItem[]
  created_at: string
  project?:   { name: string; site_name: string }
}

// 카카오 알림 설정
export interface KakaoNotifyConfig {
  enabled:      boolean
  sender_key:   string   // 카카오 채널 발신프로필 키
  template_id:  string   // 알림톡 템플릿 ID
  phone_number: string   // 수신 번호
}

// 이행률 계산
export function calcCompletionRate(items: ActivityPlanItem[]): number {
  if (!items.length) return 0
  const done = items.filter(i => i.is_completed).length
  return Math.round((done / items.length) * 100)
}

// D-day 계산
export function calcDday(scheduledDate: string): number {
  const target = new Date(scheduledDate)
  const today  = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

// D-day 색상
export function getDdayStyle(dday: number, isCompleted: boolean) {
  if (isCompleted) return { text: '완료', cls: 'text-green-600 bg-green-50' }
  if (dday < 0)    return { text: `D+${Math.abs(dday)}`, cls: 'text-red-600 bg-red-50' }
  if (dday === 0)  return { text: 'D-day', cls: 'text-red-600 bg-red-50 font-bold' }
  if (dday <= 3)   return { text: `D-${dday}`, cls: 'text-orange-600 bg-orange-50' }
  if (dday <= 7)   return { text: `D-${dday}`, cls: 'text-amber-600 bg-amber-50' }
  return               { text: `D-${dday}`, cls: 'text-gray-500 bg-gray-50' }
}
