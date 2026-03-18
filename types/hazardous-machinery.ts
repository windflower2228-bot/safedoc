// types/hazardous-machinery.ts
// 산업안전보건법 제84조(안전인증) · 제89조(자율안전확인) · 제93조(안전검사)
// 시행령 제74조·제77조·제78조

// ─── 안전인증 대상 (산안법 제84조 / 시행령 제74조) ────────────
export const SAFETY_CERT_MACHINES = [
  { code: 'press',           label: '프레스',          legalRef: '시행령 제74조 제1항 제1호 가목' },
  { code: 'shear',           label: '전단기 및 절곡기', legalRef: '시행령 제74조 제1항 제1호 나목' },
  { code: 'crane',           label: '크레인',           legalRef: '시행령 제74조 제1항 제1호 다목' },
  { code: 'lift',            label: '리프트',           legalRef: '시행령 제74조 제1항 제1호 라목' },
  { code: 'pressure_vessel', label: '압력용기',          legalRef: '시행령 제74조 제1항 제1호 마목' },
  { code: 'roller',          label: '롤러기',            legalRef: '시행령 제74조 제1항 제1호 바목' },
  { code: 'injection',       label: '사출성형기',         legalRef: '시행령 제74조 제1항 제1호 사목' },
  { code: 'aerial_work',     label: '고소작업대',         legalRef: '시행령 제74조 제1항 제1호 아목' },
  { code: 'gondola',         label: '곤돌라',             legalRef: '시행령 제74조 제1항 제1호 자목' },
  // 방호장치
  { code: 'guard_press',     label: '프레스·전단기 방호장치',       legalRef: '시행령 제74조 제1항 제2호 가목' },
  { code: 'guard_overload',  label: '양중기용 과부하방지장치',       legalRef: '시행령 제74조 제1항 제2호 나목' },
  { code: 'guard_boiler',    label: '보일러 압력방출용 안전밸브',    legalRef: '시행령 제74조 제1항 제2호 다목' },
  { code: 'guard_vessel',    label: '압력용기 압력방출용 안전밸브',  legalRef: '시행령 제74조 제1항 제2호 라목' },
  { code: 'guard_rupture',   label: '압력용기 압력방출용 파열판',    legalRef: '시행령 제74조 제1항 제2호 마목' },
  { code: 'guard_insulate',  label: '절연용 방호구 및 활선작업용 기구', legalRef: '시행령 제74조 제1항 제2호 바목' },
  { code: 'guard_explosion', label: '방폭구조 전기기계·기구 및 부품', legalRef: '시행령 제74조 제1항 제2호 사목' },
  { code: 'guard_scaffold',  label: '가설기자재 (추락·낙하·붕괴 방지)',legalRef: '시행령 제74조 제1항 제2호 아목' },
  // 보호구
  { code: 'prot_breathing',  label: '호흡용 보호구',       legalRef: '시행령 제74조 제1항 제3호 가목' },
  { code: 'prot_safety_belt',label: '안전대',              legalRef: '시행령 제74조 제1항 제3호 나목' },
  { code: 'prot_helmet',     label: '안전모',              legalRef: '시행령 제74조 제1항 제3호 다목' },
  { code: 'prot_protect',    label: '차광 및 비산물 방지 보안경', legalRef: '시행령 제74조 제1항 제3호 라목' },
  { code: 'prot_face',       label: '용접용 보안면',        legalRef: '시행령 제74조 제1항 제3호 마목' },
  { code: 'prot_ear',        label: '방음용 귀마개·귀덮개', legalRef: '시행령 제74조 제1항 제3호 바목' },
]

// ─── 자율안전확인 대상 (산안법 제89조 / 시행령 제77조) ──────────
export const VOLUNTARY_CERT_MACHINES = [
  { code: 'vc_drill',        label: '연삭기 또는 연마기 (휴대용 제외)', legalRef: '시행령 제77조 제1호 가목' },
  { code: 'vc_portable_drill',label: '산업용 로봇',                    legalRef: '시행령 제77조 제1호 나목' },
  { code: 'vc_mixer',        label: '혼합기',                           legalRef: '시행령 제77조 제1호 다목' },
  { code: 'vc_partor',       label: '파쇄기 또는 분쇄기',               legalRef: '시행령 제77조 제1호 라목' },
  { code: 'vc_food',         label: '식품가공용 기계(파쇄·절단·혼합·제면기만)',legalRef:'시행령 제77조 제1호 마목' },
  { code: 'vc_conveyor',     label: '컨베이어',                         legalRef: '시행령 제77조 제1호 바목' },
  { code: 'vc_auto',         label: '자동차정비용 리프트',              legalRef: '시행령 제77조 제1호 사목' },
  { code: 'vc_hoist',        label: '공작기계(선반·드릴·밀링·플레이너·형삭기)',legalRef:'시행령 제77조 제1호 아목' },
  { code: 'vc_highpressure', label: '고압세척기',                       legalRef: '시행령 제77조 제1호 자목' },
  { code: 'vc_drill2',       label: '비비비',                           legalRef: '시행령 제77조 제1호 차목' },
  { code: 'vc_guard1',       label: '연삭기 덮개',                      legalRef: '시행령 제77조 제2호 가목' },
  { code: 'vc_guard2',       label: '방호망',                           legalRef: '시행령 제77조 제2호 나목' },
  { code: 'vc_guard3',       label: '회전기계용 울 (덮개)',             legalRef: '시행령 제77조 제2호 다목' },
  { code: 'vc_prot1',        label: '안전화',                           legalRef: '시행령 제77조 제3호 가목' },
  { code: 'vc_prot2',        label: '안전장갑',                         legalRef: '시행령 제77조 제3호 나목' },
  { code: 'vc_prot3',        label: '방진마스크',                       legalRef: '시행령 제77조 제3호 다목' },
  { code: 'vc_prot4',        label: '방독마스크',                       legalRef: '시행령 제77조 제3호 라목' },
  { code: 'vc_prot5',        label: '송기마스크',                       legalRef: '시행령 제77조 제3호 마목' },
  { code: 'vc_prot6',        label: '전동식 호흡보호구',                legalRef: '시행령 제77조 제3호 바목' },
  { code: 'vc_prot7',        label: '보호복',                           legalRef: '시행령 제77조 제3호 사목' },
  { code: 'vc_prot8',        label: '안전대 (추락방지대 등)',            legalRef: '시행령 제77조 제3호 아목' },
  { code: 'vc_prot9',        label: '차광보안경',                       legalRef: '시행령 제77조 제3호 자목' },
  { code: 'vc_prot10',       label: '용접용 보안면',                    legalRef: '시행령 제77조 제3호 차목' },
  { code: 'vc_prot11',       label: '방음용 귀마개·귀덮개',             legalRef: '시행령 제77조 제3호 카목' },
]

// ─── 안전검사 대상 13종 + 검사주기 (산안법 제93조 / 시행령 제78조 / 시행규칙 제126조) ───
export interface SafetyInspectionType {
  code:              string
  label:             string
  legalRef:          string
  cycleMonths:       number        // 기본 검사주기 (개월)
  cycleLabel:        string        // 검사주기 표시
  firstInspection:   string        // 최초 검사 기준
  notes:             string        // 비고 (특수 조건)
  category:          'lifting' | 'press' | 'vessel' | 'other'
}

export const SAFETY_INSPECTION_TYPES: SafetyInspectionType[] = [
  {
    code: 'press', label: '프레스', legalRef: '시행령 제78조 제1호',
    cycleMonths: 24, cycleLabel: '2년', category: 'press',
    firstInspection: '설치 완료일부터 3년 이내',
    notes: '형 체결력 294kN 미만 제외',
  },
  {
    code: 'shear', label: '전단기', legalRef: '시행령 제78조 제2호',
    cycleMonths: 24, cycleLabel: '2년', category: 'press',
    firstInspection: '설치 완료일부터 3년 이내',
    notes: '',
  },
  {
    code: 'crane', label: '크레인 (이동식 제외)', legalRef: '시행령 제78조 제3호',
    cycleMonths: 24, cycleLabel: '2년 (건설현장 6개월)', category: 'lifting',
    firstInspection: '설치 완료일부터 3년 이내',
    notes: '정격하중 2톤 미만 제외 / 건설현장: 최초 설치일부터 6개월마다',
  },
  {
    code: 'mobile_crane', label: '이동식 크레인', legalRef: '시행령 제78조 제3호',
    cycleMonths: 24, cycleLabel: '2년', category: 'lifting',
    firstInspection: '신규등록 후 3년 이내',
    notes: '자동차관리법 신규등록 기준',
  },
  {
    code: 'lift', label: '리프트 (이삿짐운반용 제외)', legalRef: '시행령 제78조 제4호',
    cycleMonths: 24, cycleLabel: '2년 (건설현장 6개월)', category: 'lifting',
    firstInspection: '설치 완료일부터 3년 이내',
    notes: '건설현장: 최초 설치일부터 6개월마다 / 적재하중 0.49톤 이하 건설용 제외',
  },
  {
    code: 'moving_lift', label: '이삿짐운반용 리프트', legalRef: '시행령 제78조 제4호',
    cycleMonths: 24, cycleLabel: '2년', category: 'lifting',
    firstInspection: '신규등록 후 3년 이내',
    notes: '자동차관리법 신규등록 기준',
  },
  {
    code: 'pressure_vessel', label: '압력용기', legalRef: '시행령 제78조 제5호',
    cycleMonths: 24, cycleLabel: '2년 (PSM 적용 4년)', category: 'vessel',
    firstInspection: '설치 완료일부터 3년 이내',
    notes: '공정안전보고서(PSM) 확인을 받은 압력용기는 4년마다',
  },
  {
    code: 'gondola', label: '곤돌라', legalRef: '시행령 제78조 제6호',
    cycleMonths: 24, cycleLabel: '2년 (건설현장 6개월)', category: 'lifting',
    firstInspection: '설치 완료일부터 3년 이내',
    notes: '건설현장에서 사용하는 것은 최초 설치일부터 6개월마다',
  },
  {
    code: 'local_exhaust', label: '국소배기장치 (이동식 제외)', legalRef: '시행령 제78조 제7호',
    cycleMonths: 24, cycleLabel: '2년', category: 'other',
    firstInspection: '설치 완료일부터 3년 이내',
    notes: '유해물질(49종) 건강장해 예방 목적 설치분에 한정',
  },
  {
    code: 'centrifuge', label: '원심기 (산업용)', legalRef: '시행령 제78조 제8호',
    cycleMonths: 24, cycleLabel: '2년', category: 'other',
    firstInspection: '설치 완료일부터 3년 이내',
    notes: '산업용만 해당',
  },
  {
    code: 'roller', label: '롤러기 (밀폐형 제외)', legalRef: '시행령 제78조 제9호',
    cycleMonths: 24, cycleLabel: '2년', category: 'other',
    firstInspection: '설치 완료일부터 3년 이내',
    notes: '밀폐형 구조 제외',
  },
  {
    code: 'injection', label: '사출성형기', legalRef: '시행령 제78조 제10호',
    cycleMonths: 24, cycleLabel: '2년', category: 'other',
    firstInspection: '설치 완료일부터 3년 이내',
    notes: '형 체결력 294kN 미만 제외',
  },
  {
    code: 'aerial_work', label: '고소작업대 (차량탑재형)', legalRef: '시행령 제78조 제11호',
    cycleMonths: 24, cycleLabel: '2년', category: 'lifting',
    firstInspection: '신규등록 후 3년 이내',
    notes: '자동차관리법 화물·특수자동차에 탑재한 것만 해당',
  },
  {
    code: 'conveyor', label: '컨베이어', legalRef: '시행령 제78조 제12호',
    cycleMonths: 24, cycleLabel: '2년', category: 'other',
    firstInspection: '설치 완료일부터 3년 이내',
    notes: '',
  },
  {
    code: 'industrial_robot', label: '산업용 로봇', legalRef: '시행령 제78조 제13호',
    cycleMonths: 24, cycleLabel: '2년', category: 'other',
    firstInspection: '설치 완료일부터 3년 이내',
    notes: '',
  },
]

// 검사주기 계산 (기계 종류 + 설치장소 고려)
export function calcNextInspectionDate(
  machineCode:       string,
  lastDate:          string,    // YYYY-MM-DD
  isConstructionSite: boolean,
  isPsmVessel:       boolean,
): string {
  const craneTypes    = ['crane', 'lift', 'gondola']
  const vehicleTypes  = ['mobile_crane', 'moving_lift', 'aerial_work']
  const psmVesselCode = 'pressure_vessel'

  let months = 24

  if (isConstructionSite && craneTypes.includes(machineCode)) {
    months = 6
  } else if (isPsmVessel && machineCode === psmVesselCode) {
    months = 48
  }

  const base = new Date(lastDate)
  base.setMonth(base.getMonth() + months)
  return base.toISOString().slice(0, 10)
}

// 검사 상태 판정
export function calcInspectionStatus(
  nextDueDate: string | null,
  isApplicable: boolean,
): 'pending' | 'valid' | 'expiring_soon' | 'overdue' | 'inapplicable' {
  if (!isApplicable) return 'inapplicable'
  if (!nextDueDate)  return 'pending'
  const today = new Date()
  const due   = new Date(nextDueDate)
  const diff  = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0)   return 'overdue'
  if (diff <= 60) return 'expiring_soon'
  return 'valid'
}

export const STATUS_CFG = {
  pending:        { label: '검사 이력 없음', cls: 'bg-gray-50 text-gray-500',   dot: '#9ca3af' },
  valid:          { label: '유효',          cls: 'bg-green-50 text-green-700', dot: '#16a34a' },
  expiring_soon:  { label: '만료 임박',     cls: 'bg-amber-50 text-amber-700', dot: '#d97706' },
  overdue:        { label: '검사 초과',     cls: 'bg-red-50 text-red-700',     dot: '#dc2626' },
  inapplicable:   { label: '해당 없음',     cls: 'bg-gray-100 text-gray-400',  dot: '#d1d5db' },
}

export const CATEGORY_CFG = {
  lifting: { label: '양중기·운반기계', color: '#2563eb', bg: '#eff6ff' },
  press:   { label: '프레스·전단기',   color: '#dc2626', bg: '#fef2f2' },
  vessel:  { label: '압력용기',        color: '#7c3aed', bg: '#f5f3ff' },
  other:   { label: '기타 기계설비',   color: '#16a34a', bg: '#f0fdf4' },
}
