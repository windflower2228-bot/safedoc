// types/msds.ts — 물질안전보건자료(MSDS) 타입 정의

// GHS 위험성 분류
export type GhsHazardClass =
  | 'flammable'        // 인화성
  | 'explosive'        // 폭발성
  | 'oxidizing'        // 산화성
  | 'toxic'            // 급성독성
  | 'corrosive'        // 부식성
  | 'irritant'         // 자극성
  | 'health_hazard'    // 건강유해성
  | 'environmental'    // 환경유해성
  | 'compressed_gas'   // 압축가스

export const GHS_LABELS: Record<GhsHazardClass, string> = {
  flammable:       '인화성',
  explosive:       '폭발성',
  oxidizing:       '산화성',
  toxic:           '급성독성',
  corrosive:       '부식성',
  irritant:        '자극성',
  health_hazard:   '건강유해성',
  environmental:   '환경유해성',
  compressed_gas:  '압축가스',
}

export const GHS_COLORS: Record<GhsHazardClass, { bg: string; text: string }> = {
  flammable:      { bg: 'bg-red-100',    text: 'text-red-700' },
  explosive:      { bg: 'bg-orange-100', text: 'text-orange-700' },
  oxidizing:      { bg: 'bg-amber-100',  text: 'text-amber-700' },
  toxic:          { bg: 'bg-purple-100', text: 'text-purple-700' },
  corrosive:      { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  irritant:       { bg: 'bg-blue-100',   text: 'text-blue-700' },
  health_hazard:  { bg: 'bg-pink-100',   text: 'text-pink-700' },
  environmental:  { bg: 'bg-green-100',  text: 'text-green-700' },
  compressed_gas: { bg: 'bg-cyan-100',   text: 'text-cyan-700' },
}

// MSDS 16개 섹션 중 핵심 메타데이터
export interface MsdsRecord {
  id:               string
  company_id:       string
  // 섹션 1: 화학제품과 회사에 관한 정보
  product_name:     string          // 제품명
  product_code:     string | null   // 제품 코드
  cas_number:       string | null   // CAS 번호
  un_number:        string | null   // UN 번호
  manufacturer:     string | null   // 제조사
  // 섹션 2: 유해성·위험성
  ghs_hazards:      GhsHazardClass[]
  signal_word:      'danger' | 'warning' | null  // 위험 | 경고
  hazard_statements: string[]       // 유해·위험 문구 (H-코드)
  precautionary_statements: string[] // 예방조치 문구 (P-코드)
  // 섹션 3~4: 구성성분 / 응급조치
  main_components:  string | null   // 주요 구성성분
  first_aid_eye:    string | null
  first_aid_skin:   string | null
  first_aid_inhale: string | null
  first_aid_ingest: string | null
  // 섹션 5~6: 폭발·화재 / 누출사고
  fire_fighting:    string | null   // 소화방법
  spill_handling:   string | null   // 누출 시 조치
  // 섹션 7~8: 취급·저장 / 노출방지
  handling_storage: string | null   // 취급·저장 주의사항
  exposure_limit:   string | null   // 노출기준 (TWA, STEL)
  ppe_required:     string | null   // 필요 보호구
  // 섹션 16: 기타
  revision_date:    string | null
  is_public:        boolean         // 공용 자료 여부
  file_url:         string | null   // 원본 파일 URL
  file_name:        string | null

  status:           'active' | 'superseded' | 'archived'
  author_id:        string
  created_at:       string
  updated_at:       string

  // joined
  author?:          { name: string }
  company?:         { name: string }
}

// MSDS 교육일지 자동 생성 시 사용할 핵심 교육 포인트
export function generateMsdsEduPoints(msds: Partial<MsdsRecord>): string {
  const lines: string[] = []

  lines.push(`【제품명】 ${msds.product_name ?? ''}`)
  if (msds.cas_number) lines.push(`【CAS 번호】 ${msds.cas_number}`)

  if (msds.ghs_hazards?.length) {
    lines.push(`\n【GHS 유해·위험성】`)
    msds.ghs_hazards.forEach(h => lines.push(`  - ${GHS_LABELS[h]}`))
  }

  if (msds.signal_word) {
    lines.push(`\n【신호어】 ${msds.signal_word === 'danger' ? '위험 (Danger)' : '경고 (Warning)'}`)
  }

  lines.push(`\n【취급 시 주의사항】`)
  if (msds.handling_storage) lines.push(msds.handling_storage)
  else lines.push('  - 제조사 MSDS 참조')

  lines.push(`\n【응급처치 방법】`)
  if (msds.first_aid_eye)    lines.push(`  눈 접촉: ${msds.first_aid_eye}`)
  if (msds.first_aid_skin)   lines.push(`  피부 접촉: ${msds.first_aid_skin}`)
  if (msds.first_aid_inhale) lines.push(`  흡입: ${msds.first_aid_inhale}`)

  lines.push(`\n【필요 보호구】`)
  if (msds.ppe_required) lines.push(msds.ppe_required)
  else lines.push('  - 방독마스크, 보안경, 화학보호장갑')

  return lines.join('\n')
}

// MSDS → 교육 법적 근거 자동 생성
export function getMsdsLegalBasis(hazards: GhsHazardClass[]): string {
  if (hazards.includes('toxic') || hazards.includes('health_hazard')) {
    return '산업안전보건법 제114조 (물질안전보건자료의 비치 등), 제115조 (물질안전보건자료 게시), 제116조 (물질안전보건자료에 관한 교육)'
  }
  if (hazards.includes('flammable') || hazards.includes('explosive')) {
    return '산업안전보건기준에 관한 규칙 제230조 (화기 사용 장소의 화재 위험), 산업안전보건법 제114조'
  }
  return '산업안전보건법 제114조 (물질안전보건자료의 비치 등), 제116조 (물질안전보건자료에 관한 교육)'
}
