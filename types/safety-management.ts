// types/safety-management.ts — 안전보건관리체제 타입

export type SafetyRoleId =
  | 'responsibility_manager'  // 안전보건(총괄)관리책임자
  | 'supervisor'              // 관리감독자
  | 'safety_manager'          // 안전관리자
  | 'health_manager'          // 보건관리자
  | 'safety_health_officer'   // 안전보건관리담당자
  | 'industrial_physician'    // 산업보건의
  | 'honorary_inspector'      // 명예산업안전감독관

export interface SafetyRole {
  id:          SafetyRoleId
  label:       string
  legalBasis:  string
  docType:     '지정서' | '선임서' | '위촉서'
  href:        string
  color:       string
  bg:          string
  duties:      string[]
  positions:   string[]   // 선택 가능한 직급 목록
  description: string     // 법적 설명
}

export const SAFETY_ROLES: Record<SafetyRoleId, SafetyRole> = {
  responsibility_manager: {
    id: 'responsibility_manager',
    label: '안전보건(총괄)관리책임자',
    legalBasis: '산업안전보건법 제15조(안전보건관리책임자), 제62조(도급인의 안전보건총괄책임자)',
    docType: '지정서',
    href: '/safety-management/responsibility-manager',
    color: '#1d4ed8', bg: '#eff6ff',
    description: '사업을 총괄 관리하는 사람(사업주·대표이사 등)을 안전보건관리책임자로 지정',
    positions: ['대표이사','사장','부사장','전무이사','상무이사','이사','공장장','현장소장','본부장','부장'],
    duties: [
      '산업재해 예방계획의 수립에 관한 사항',
      '안전보건관리규정의 작성 및 변경에 관한 사항',
      '근로자의 안전·보건 교육에 관한 사항',
      '작업환경측정 등 작업환경의 점검 및 개선에 관한 사항',
      '근로자의 건강진단 등 건강관리에 관한 사항',
      '산업재해의 원인 조사 및 재발 방지대책 수립에 관한 사항',
      '산업재해에 관한 통계의 기록 및 유지에 관한 사항',
      '안전장치 및 보호구 구입 시 적격품 여부 확인에 관한 사항',
    ],
  },
  supervisor: {
    id: 'supervisor',
    label: '관리감독자',
    legalBasis: '산업안전보건법 제16조(관리감독자)',
    docType: '지정서',
    href: '/safety-management/supervisor',
    color: '#b45309', bg: '#fffbeb',
    description: '경영조직에서 생산과 관련되는 업무와 소속 직원을 직접 지휘·감독하는 부서의 장 또는 그 직위를 담당하는 자',
    positions: ['팀장','과장','부장','반장','현장반장','공장장','작업반장','직장','소장','감독'],
    duties: [
      '기계·기구 또는 설비의 안전·보건 점검 및 이상 유무의 확인',
      '근로자의 작업복·보호구 및 방호장치의 점검과 그 착용·사용에 관한 교육·지도',
      '해당 작업에서 발생한 산업재해에 관한 보고 및 이에 대한 응급조치',
      '해당 작업의 작업장 정리·정돈 및 통로 확보에 대한 확인·감독',
      '산업보건의, 안전관리자 및 보건관리자의 지도·조언에 대한 협조',
      '위험성평가를 위한 업무에 기인하는 유해·위험요인의 파악 및 그 결과에 따른 개선조치의 시행',
    ],
  },
  safety_manager: {
    id: 'safety_manager',
    label: '안전관리자',
    legalBasis: '산업안전보건법 제17조(안전관리자)',
    docType: '선임서',
    href: '/safety-management/safety-manager',
    color: '#dc2626', bg: '#fef2f2',
    description: '사업장의 안전에 관한 기술적인 사항에 관하여 사업주 또는 안전보건관리책임자를 보좌하고 관리감독자에게 조언·지도하는 자',
    positions: ['안전관리자','안전담당자','안전팀장','안전부장','안전과장','안전기사','안전산업기사','산업안전지도사'],
    duties: [
      '안전보건관리체제에서 심의·의결한 업무와 안전보건관리책임자에 대한 지원',
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
  health_manager: {
    id: 'health_manager',
    label: '보건관리자',
    legalBasis: '산업안전보건법 제18조(보건관리자)',
    docType: '선임서',
    href: '/safety-management/health-manager',
    color: '#0891b2', bg: '#ecfeff',
    description: '사업장의 보건에 관한 기술적인 사항에 관하여 사업주 또는 안전보건관리책임자를 보좌하고 관리감독자에게 조언·지도하는 자',
    positions: ['보건관리자','보건담당자','보건팀장','보건부장','보건과장','간호사','산업위생관리기사','산업보건지도사'],
    duties: [
      '산업보건의의 지도·조언에 대한 보좌',
      '위험성평가에 관한 보좌 및 지도·조언',
      '물질안전보건자료의 게시 또는 비치에 관한 보좌 및 지도·조언',
      '해당 사업장 보건교육계획의 수립 및 보건교육 실시에 관한 보좌 및 지도·조언',
      '해당 작업장에 관련된 직업성 질환의 예방·관리',
      '근로자의 건강관리, 건강검진 사후관리에 관한 보좌 및 지도·조언',
      '법령에서 정하는 보건에 관한 사항의 이행에 관한 보좌 및 지도·조언',
      '업무 수행 내용의 기록·유지',
    ],
  },
  safety_health_officer: {
    id: 'safety_health_officer',
    label: '안전보건관리담당자',
    legalBasis: '산업안전보건법 제19조(안전보건관리담당자)',
    docType: '선임서',
    href: '/safety-management/safety-health-officer',
    color: '#16a34a', bg: '#f0fdf4',
    description: '상시 근로자 20명 이상 50명 미만 사업장에서 안전·보건에 관한 업무를 담당하는 자',
    positions: ['안전보건담당자','안전담당자','보건담당자','총무부장','인사팀장','관리과장','시설담당자'],
    duties: [
      '안전보건교육 실시에 관한 사항',
      '위험성평가의 실시에 관한 사항',
      '작업환경측정 및 건강진단에 관한 사항',
      '산업재해의 원인 조사 및 재발 방지 대책 수립에 관한 사항',
      '산업재해에 관한 통계의 기록 및 유지에 관한 사항',
      '안전장치 및 보호구 구입 시 적격품 여부 확인에 관한 사항',
      '그 밖에 안전보건관리에 관한 사항',
    ],
  },
  industrial_physician: {
    id: 'industrial_physician',
    label: '산업보건의',
    legalBasis: '산업안전보건법 제22조(산업보건의)',
    docType: '선임서',
    href: '/safety-management/industrial-physician',
    color: '#7c3aed', bg: '#f5f3ff',
    description: '근로자의 건강관리, 작업환경의 의학적 관리 등 직업성 질환 예방을 위하여 사업장에서 근로자를 진료하는 의사',
    positions: ['의사','내과전문의','직업환경의학과전문의','가정의학과전문의','일반의'],
    duties: [
      '건강진단 결과의 검토 및 그 결과에 따른 작업 배치, 작업 전환 또는 근로시간의 단축 등 근로자의 건강보호 조치',
      '근로자의 건강장해의 원인 조사와 재발 방지를 위한 의학적 조치',
      '그 밖에 근로자의 건강 유지 및 증진을 위하여 필요한 의학적 조치에 관하여 고용노동부장관이 정하는 사항',
    ],
  },
  honorary_inspector: {
    id: 'honorary_inspector',
    label: '명예산업안전감독관',
    legalBasis: '산업안전보건법 제23조(명예산업안전감독관)',
    docType: '위촉서',
    href: '/safety-management/honorary-inspector',
    color: '#ea580c', bg: '#fff7ed',
    description: '사업장 내 산업재해 예방활동에 참여하고 근로자의 안전의식을 높이기 위하여 근로자 중에서 위촉하는 자',
    positions: ['근로자대표','노조지부장','현장근로자','반장','팀원','조합원'],
    duties: [
      '사업장에서 하는 자체 안전보건점검 참여',
      '법령을 위반한 사실이 있는 경우 사업주에 대한 시정 요청 및 감독기관에 신고',
      '산업재해 발생 위험 시 필요한 사항을 고용노동부장관 등에 신고',
      '근로자에 대한 안전수칙 준수 지도',
      '법령 및 산업재해 예방정책 개선 건의',
      '안전·보건 의식을 북돋우기 위한 활동 등 산업재해 예방업무 지원',
    ],
  },
}

export type SafetyDocStatus = 'active' | 'expired' | 'revoked'

export interface SafetyDocument {
  id:              string
  company_id:      string
  project_id:      string | null
  role_id:         SafetyRoleId
  doc_type:        string   // 지정서 | 선임서 | 위촉서
  doc_number:      string
  // 대상자
  person_name:     string
  person_affiliation: string  // 소속
  person_position: string     // 직급 (선택 시 자동 입력)
  person_dept:     string     // 부서
  person_contact:  string | null
  // 지정 내용
  legal_basis:     string
  duties:          string[]
  work_scope:      string | null  // 관리감독자 담당 작업 범위
  effective_date:  string
  expiry_date:     string | null
  // 지정권자
  issuer_name:     string
  issuer_position: string
  issuer_company:  string
  // 메타
  status:          SafetyDocStatus
  notes:           string | null
  author_id:       string
  created_at:      string
  updated_at:      string
  // joined
  author?:  { name: string }
  company?: { name: string; address: string; logo_url: string | null }
}
