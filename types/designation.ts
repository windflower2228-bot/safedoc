// types/designation.ts — 지정서·선임서 타입 정의

// ─── 문서 종류 ────────────────────────────────────────────────
export type DesignationDocType =
  | 'designation'   // 지정서 (직위·역할 지정)
  | 'appointment'   // 선임서 (법정 선임)

export const DOC_TYPE_LABELS: Record<DesignationDocType, string> = {
  designation: '지정서',
  appointment: '선임서',
}

// ─── 직위·역할 목록 ───────────────────────────────────────────
export interface DesignationRole {
  id:          string
  label:       string          // 표시명
  doc_type:    DesignationDocType
  legal_basis: string          // 법적 근거
  duties:      string[]        // 주요 직무
  category:    'management' | 'safety' | 'health' | 'supervisor' | 'custom'
}

export const DESIGNATION_ROLES: DesignationRole[] = [
  // ── 경영자 계층 ────────────────────────────────────────────
  {
    id: 'total_manager',
    label: '안전보건총괄책임자',
    doc_type: 'designation',
    category: 'management',
    legal_basis: '산업안전보건법 제62조',
    duties: [
      '도급인 사업주로서 안전·보건에 관한 총괄 관리',
      '안전보건관리체제 구축 및 유지',
      '산업재해 예방을 위한 기준·지침 수립',
      '안전보건 목표 설정 및 이행 확인',
    ],
  },
  {
    id: 'safety_health_manager',
    label: '안전보건관리책임자',
    doc_type: 'designation',
    category: 'management',
    legal_basis: '산업안전보건법 제15조',
    duties: [
      '산업재해 예방계획의 수립에 관한 사항',
      '안전보건관리규정의 작성 및 변경에 관한 사항',
      '근로자의 안전·보건 교육에 관한 사항',
      '작업환경측정 등 작업환경의 점검 및 개선에 관한 사항',
      '근로자의 건강진단 등 건강관리에 관한 사항',
      '산업재해의 원인 조사 및 재발 방지대책 수립에 관한 사항',
      '산업재해에 관한 통계의 기록 및 유지에 관한 사항',
    ],
  },
  // ── 안전 관리 계층 ─────────────────────────────────────────
  {
    id: 'safety_manager',
    label: '안전관리자',
    doc_type: 'appointment',
    category: 'safety',
    legal_basis: '산업안전보건법 제17조',
    duties: [
      '산업안전보건위원회 또는 안전보건에 관한 노사협의체에서 심의·의결한 업무와 안전보건관리책임자에 대한 지원',
      '위험성평가에 관한 보좌 및 지도·조언',
      '안전인증대상기계 등과 자율안전확인대상기계 등 구입 시 적격품의 선정에 관한 보좌 및 지도·조언',
      '해당 사업장 안전교육계획의 수립 및 안전교육 실시에 관한 보좌 및 지도·조언',
      '사업장 순회점검, 지도 및 조치 건의',
      '산업재해 발생의 원인 조사·분석 및 재발 방지를 위한 기술적 보좌 및 지도·조언',
      '산업재해에 관한 통계의 유지·관리·분석을 위한 보좌 및 지도·조언',
      '법 또는 법에 따른 명령으로 정한 안전에 관한 사항의 이행에 관한 보좌 및 지도·조언',
      '업무 수행 내용의 기록·유지',
    ],
  },
  {
    id: 'health_manager',
    label: '보건관리자',
    doc_type: 'appointment',
    category: 'health',
    legal_basis: '산업안전보건법 제18조',
    duties: [
      '산업보건의의 지도·조언에 대한 보좌',
      '위험성평가에 관한 보좌 및 지도·조언',
      '물질안전보건자료의 게시 또는 비치에 관한 보좌 및 지도·조언',
      '산업보건의·보건관리전문기관과의 연계에 관한 보좌',
      '해당 사업장 보건교육계획의 수립 및 보건교육 실시에 관한 보좌 및 지도·조언',
      '해당 작업장에 관련된 직업성 질환의 예방·관리',
      '근로자의 건강관리, 건강검진 사후관리에 관한 보좌 및 지도·조언',
      '업무 수행 내용의 기록·유지',
    ],
  },
  {
    id: 'supervisor',
    label: '관리감독자',
    doc_type: 'designation',
    category: 'supervisor',
    legal_basis: '산업안전보건법 제16조',
    duties: [
      '기계·기구 또는 설비의 안전·보건 점검 및 이상 유무의 확인',
      '근로자의 작업복·보호구 및 방호장치의 점검과 그 착용·사용에 관한 교육·지도',
      '해당 작업에서 발생한 산업재해에 관한 보고 및 이에 대한 응급조치',
      '해당 작업의 작업장 정리·정돈 및 통로 확보에 대한 확인·감독',
      '산업보건의, 안전관리자 및 보건관리자의 지도·조언에 대한 협조',
      '위험성평가를 위한 업무에 기인하는 유해·위험요인의 파악 및 그 결과에 따른 개선조치의 시행',
    ],
  },
  {
    id: 'safety_health_rep',
    label: '안전보건담당자',
    doc_type: 'designation',
    category: 'safety',
    legal_basis: '산업안전보건법 제19조',
    duties: [
      '안전보건교육 실시에 관한 사항',
      '위험성평가의 실시에 관한 사항',
      '작업환경측정 및 건강진단에 관한 사항',
      '산업재해의 원인 조사 및 재발 방지 대책 수립에 관한 사항',
    ],
  },
  {
    id: 'safety_supervisor',
    label: '안전보건총괄책임자 (도급)',
    doc_type: 'designation',
    category: 'management',
    legal_basis: '산업안전보건법 제62조',
    duties: [
      '위험성평가의 실시에 관한 사항',
      '도급인과 수급인을 구성원으로 하는 안전보건협의체 구성·운영',
      '작업장의 안전보건 점검',
      '수급인이 근로자에게 하는 안전보건교육에 대한 지도·지원',
      '다음 각 목의 어느 하나의 경우에 대비한 수급인의 비상구 설치 등 대피 방법 및 응급처치 방법',
    ],
  },
  {
    id: 'custom',
    label: '직접 입력',
    doc_type: 'designation',
    category: 'custom',
    legal_basis: '',
    duties: [],
  },
]

// ─── 지정서·선임서 레코드 ─────────────────────────────────────
export interface Designation {
  id:              string
  company_id:      string
  project_id:      string | null
  doc_type:        DesignationDocType
  role_id:         string          // DESIGNATION_ROLES 의 id
  role_label:      string          // 직위명 (custom 시 직접 입력값)
  doc_number:      string          // 문서 번호 (자동 채번)

  // 피지정자 정보
  person_name:     string
  person_id_last4: string | null   // 주민번호 뒷자리 (선택)
  person_address:  string | null
  person_dept:     string | null
  person_position: string          // 현재 직위

  // 지정 내용
  legal_basis:     string
  duties:          string[]        // 직무 목록
  effective_date:  string          // 지정 효력 발생일
  expiry_date:     string | null   // 만료일 (없으면 재임 기간)
  work_scope:      string | null   // 담당 작업 범위 (관리감독자용)

  // 지정권자
  issuer_name:     string          // 지정권자 이름
  issuer_position: string          // 지정권자 직위
  issuer_company:  string          // 지정권자 소속

  status:          'active' | 'expired' | 'revoked'
  author_id:       string
  created_at:      string
  updated_at:      string

  // joined
  author?:         { name: string; position: string }
  project?:        { name: string; site_name: string }
  company?:        { name: string; address: string; logo_url: string | null }
}

// 문서 번호 자동 채번 유틸
export function generateDocNumber(
  docType: DesignationDocType,
  roleId: string,
  year: number,
  seq: number
): string {
  const prefix = docType === 'appointment' ? '선임' : '지정'
  const roleMap: Record<string, string> = {
    total_manager:          '총괄',
    safety_health_manager:  '안책',
    safety_manager:         '안관',
    health_manager:         '보관',
    supervisor:             '감독',
    safety_health_rep:      '안담',
    safety_supervisor:      '도급',
    custom:                 '기타',
  }
  const roleCode = roleMap[roleId] ?? '기타'
  return `${prefix}-${roleCode}-${year}-${String(seq).padStart(3, '0')}`
}
