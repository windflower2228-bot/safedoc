// ============================================================
// 산업안전보건기준에 관한 규칙 [별표 12] (특별관리물질) 전체 목록
// 별표12에서 "(특별관리물질)" 또는 "(특별관리물질에서 제외한다)" 등
// "(특별관리물질)" 이라고 명시된 물질만 수록
// ============================================================

export interface SpecialSubstance {
  id:           string   // 고유 ID (카테고리-번호)
  no:           string   // 항목 번호 (예: "1-8")
  category:     '유기화합물' | '금속류' | '산·알칼리류' | '가스상태물질'
  name_ko:      string   // 한글명
  name_en:      string   // 영문명
  cas_no:       string   // CAS 번호
  cmr_type:     CMRType[]  // 발암성(C) / 생식세포변이원성(M) / 생식독성(R)
  condition?:   string   // 특별관리물질 적용 조건 (조건부인 경우)
  note?:        string   // 비고
}

export type CMRType = 'C' | 'M' | 'R'  // Carcinogenic / Mutagenic / Reprotoxic

export const SPECIAL_SUBSTANCES: SpecialSubstance[] = [
  // ── 1. 유기화합물 ─────────────────────────────────────────
  { id:'1-8',   no:'1-8',   category:'유기화합물', name_ko:'디니트로톨루엔',         name_en:'Dinitrotoluene',                   cas_no:'25321-14-6 등', cmr_type:['C','M'] },
  { id:'1-11',  no:'1-11',  category:'유기화합물', name_ko:'N,N-디메틸아세트아미드', name_en:'N,N-Dimethylacetamide',             cas_no:'127-19-5',     cmr_type:['R'],    note:'0.3% 이상 함유 혼합물 포함' },
  { id:'1-12',  no:'1-12',  category:'유기화합물', name_ko:'디메틸포름아미드',       name_en:'Dimethylformamide',                 cas_no:'68-12-2',      cmr_type:['R'],    note:'0.3% 이상 함유 혼합물 포함' },
  { id:'1-23',  no:'1-23',  category:'유기화합물', name_ko:'1,2-디클로로에탄',       name_en:'1,2-Dichloroethane',                cas_no:'107-06-2',     cmr_type:['C'] },
  { id:'1-25',  no:'1-25',  category:'유기화합물', name_ko:'1,2-디클로로프로판',     name_en:'1,2-Dichloropropane',               cas_no:'78-87-5',      cmr_type:['C'] },
  { id:'1-29',  no:'1-29',  category:'유기화합물', name_ko:'2-메톡시에탄올',         name_en:'2-Methoxyethanol',                  cas_no:'109-86-4',     cmr_type:['R'],    note:'0.3% 이상 함유 혼합물 포함' },
  { id:'1-30',  no:'1-30',  category:'유기화합물', name_ko:'2-메톡시에틸 아세테이트',name_en:'2-Methoxyethyl acetate',            cas_no:'110-49-6',     cmr_type:['R'],    note:'0.3% 이상 함유 혼합물 포함' },
  { id:'1-44',  no:'1-44',  category:'유기화합물', name_ko:'벤젠',                   name_en:'Benzene',                           cas_no:'71-43-2',      cmr_type:['C','M'],note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-45',  no:'1-45',  category:'유기화합물', name_ko:'1,3-부타디엔',           name_en:'1,3-Butadiene',                     cas_no:'106-99-0',     cmr_type:['C','M'],note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-51',  no:'1-51',  category:'유기화합물', name_ko:'1-브로모프로판',         name_en:'1-Bromopropane',                    cas_no:'106-94-5',     cmr_type:['R'],    note:'0.3% 이상 함유 혼합물 포함' },
  { id:'1-52',  no:'1-52',  category:'유기화합물', name_ko:'2-브로모프로판',         name_en:'2-Bromopropane',                    cas_no:'75-26-3',      cmr_type:['R'],    note:'0.3% 이상 함유 혼합물 포함' },
  { id:'1-56',  no:'1-56',  category:'유기화합물', name_ko:'사염화탄소',             name_en:'Carbon tetrachloride',              cas_no:'56-23-5',      cmr_type:['C'],    note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-57',  no:'1-57',  category:'유기화합물', name_ko:'스토다드 솔벤트',        name_en:'Stoddard solvent',                  cas_no:'8052-41-3',    cmr_type:['C'],    condition:'벤젠을 0.1% 이상 함유한 경우만 특별관리물질' },
  { id:'1-67',  no:'1-67',  category:'유기화합물', name_ko:'아크릴로니트릴',         name_en:'Acrylonitrile',                     cas_no:'107-13-1',     cmr_type:['C'],    note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-68',  no:'1-68',  category:'유기화합물', name_ko:'아크릴아미드',           name_en:'Acrylamide',                        cas_no:'79-06-1',      cmr_type:['C','M'],note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-71',  no:'1-71',  category:'유기화합물', name_ko:'2-에톡시에탄올',         name_en:'2-Ethoxyethanol',                   cas_no:'110-80-5',     cmr_type:['R'],    note:'0.3% 이상 함유 혼합물 포함' },
  { id:'1-72',  no:'1-72',  category:'유기화합물', name_ko:'2-에톡시에틸 아세테이트',name_en:'2-Ethoxyethyl acetate',             cas_no:'111-15-9',     cmr_type:['R'],    note:'0.3% 이상 함유 혼합물 포함' },
  { id:'1-79',  no:'1-79',  category:'유기화합물', name_ko:'에틸렌이민',             name_en:'Ethyleneimine',                     cas_no:'151-56-4',     cmr_type:['C','M'],note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-81',  no:'1-81',  category:'유기화합물', name_ko:'2,3-에폭시-1-프로판올',  name_en:'2,3-Epoxy-1-propanol',              cas_no:'556-52-5 등',  cmr_type:['C','M'],note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-82',  no:'1-82',  category:'유기화합물', name_ko:'1,2-에폭시프로판',       name_en:'1,2-Epoxypropane',                  cas_no:'75-56-9 등',   cmr_type:['C','M'],note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-83',  no:'1-83',  category:'유기화합물', name_ko:'에피클로로히드린',       name_en:'Epichlorohydrin',                   cas_no:'106-89-8 등',  cmr_type:['C'],    note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-104', no:'1-104', category:'유기화합물', name_ko:'트리클로로에틸렌',       name_en:'Trichloroethylene',                 cas_no:'79-01-6',      cmr_type:['C'],    note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-105', no:'1-105', category:'유기화합물', name_ko:'1,2,3-트리클로로프로판', name_en:'1,2,3-Trichloropropane',            cas_no:'96-18-4',      cmr_type:['C','M'],note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-106', no:'1-106', category:'유기화합물', name_ko:'퍼클로로에틸렌',         name_en:'Perchloroethylene',                 cas_no:'127-18-4',     cmr_type:['C'],    note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-107', no:'1-107', category:'유기화합물', name_ko:'페놀',                   name_en:'Phenol',                            cas_no:'108-95-2',     cmr_type:['R'],    note:'0.3% 이상 함유 혼합물 포함' },
  { id:'1-109', no:'1-109', category:'유기화합물', name_ko:'포름알데히드',           name_en:'Formaldehyde',                      cas_no:'50-00-0',      cmr_type:['C','M'],note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-110', no:'1-110', category:'유기화합물', name_ko:'프로필렌이민',           name_en:'Propyleneimine',                    cas_no:'75-55-8',      cmr_type:['C','M'],note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-116', no:'1-116', category:'유기화합물', name_ko:'황산 디메틸',            name_en:'Dimethyl sulfate',                  cas_no:'77-78-1',      cmr_type:['C'],    note:'0.1% 이상 함유 혼합물 포함' },
  { id:'1-117', no:'1-117', category:'유기화합물', name_ko:'히드라진 및 그 수화물',  name_en:'Hydrazine and its hydrates',        cas_no:'302-01-2',     cmr_type:['C'],    note:'0.1% 이상 함유 혼합물 포함' },

  // ── 2. 금속류 ─────────────────────────────────────────────
  { id:'2-2',  no:'2-2',  category:'금속류', name_ko:'납 및 그 무기화합물',          name_en:'Lead and its inorganic compounds',  cas_no:'7439-92-1',    cmr_type:['R'],    note:'0.3% 이상 함유 혼합물 포함' },
  { id:'2-3',  no:'2-3',  category:'금속류', name_ko:'니켈 및 그 무기화합물·니켈 카르보닐', name_en:'Nickel and its inorganic compounds, Nickel carbonyl', cas_no:'7440-02-0', cmr_type:['C'], condition:'불용성 화합물만 특별관리물질', note:'0.1% 이상 함유 혼합물 포함' },
  { id:'2-9',  no:'2-9',  category:'금속류', name_ko:'수은 및 그 화합물',            name_en:'Mercury and its compounds',         cas_no:'7439-97-6',    cmr_type:['R','M'],condition:'아릴화합물 및 알킬화합물은 제외', note:'0.3% 이상 함유 혼합물 포함' },
  { id:'2-11', no:'2-11', category:'금속류', name_ko:'안티몬 및 그 화합물',          name_en:'Antimony and its compounds',        cas_no:'7440-36-0',    cmr_type:['C'],    condition:'삼산화안티몬만 특별관리물질', note:'0.1% 이상 함유 혼합물 포함' },
  { id:'2-21', no:'2-21', category:'금속류', name_ko:'카드뮴 및 그 화합물',          name_en:'Cadmium and its compounds',         cas_no:'7440-43-9',    cmr_type:['C','R'],note:'0.1% 이상 함유 혼합물 포함' },
  { id:'2-23', no:'2-23', category:'금속류', name_ko:'크롬 및 그 화합물',            name_en:'Chromium and its compounds',        cas_no:'7440-47-3',    cmr_type:['C'],    condition:'6가크롬 화합물만 특별관리물질', note:'0.1% 이상 함유 혼합물 포함' },

  // ── 3. 산·알칼리류 ─────────────────────────────────────────
  { id:'3-17', no:'3-17', category:'산·알칼리류', name_ko:'황산',                   name_en:'Sulfuric acid',                     cas_no:'7664-93-9',    cmr_type:['C'],    condition:'pH 2.0 이하인 강산만 특별관리물질', note:'0.1% 이상 함유 혼합물 포함' },

  // ── 4. 가스상태물질 ─────────────────────────────────────────
  { id:'4-3',  no:'4-3',  category:'가스상태물질', name_ko:'산화에틸렌',             name_en:'Ethylene oxide',                    cas_no:'75-21-8',      cmr_type:['C','M'],note:'0.1% 이상 함유 혼합물 포함' },
]

// 총 특별관리물질 수 (조건부 포함): 36종

// CMR 유형 한글 표기
export const CMR_LABELS: Record<CMRType, { label: string; full: string; color: string; bg: string }> = {
  C: { label: '발암성(C)',         full: '발암성 물질 (Carcinogenic)',         color: '#dc2626', bg: '#fef2f2' },
  M: { label: '변이원성(M)',       full: '생식세포 변이원성 물질 (Mutagenic)', color: '#7c3aed', bg: '#f5f3ff' },
  R: { label: '생식독성(R)',       full: '생식독성 물질 (Reprotoxic)',          color: '#0891b2', bg: '#ecfeff' },
}

// 특별관리물질 목록 조회 유틸
export function findSpecialSubstance(nameOrCas: string): SpecialSubstance | undefined {
  const q = nameOrCas.toLowerCase().trim()
  return SPECIAL_SUBSTANCES.find(s =>
    s.name_ko.includes(nameOrCas) ||
    s.name_en.toLowerCase().includes(q) ||
    s.cas_no.replace(/\s/g,'').includes(q.replace(/\s/g,''))
  )
}

export function isSpecialSubstance(nameOrCas: string): boolean {
  return !!findSpecialSubstance(nameOrCas)
}
