// types/workplan.ts — 작업계획서 타입 정의

// ─── 작업 종류 ────────────────────────────────────────────────
export type WorkPlanType =
  | 'height'        // 고소작업 (2m 이상)
  | 'excavation'    // 굴착작업
  | 'crane'         // 양중·크레인 작업
  | 'confined'      // 밀폐공간 작업
  | 'demolition'    // 해체 작업
  | 'electrical'    // 전기 작업
  | 'welding'       // 용접·절단 작업
  | 'chemical'      // 유해화학물질 취급
  | 'heavy_equip'   // 중장비 작업
  | 'other'         // 기타

export const WORK_PLAN_TYPE_LABELS: Record<WorkPlanType, string> = {
  height:      '고소작업 (2m 이상)',
  excavation:  '굴착작업',
  crane:       '양중·크레인 작업',
  confined:    '밀폐공간 작업',
  demolition:  '해체작업',
  electrical:  '전기작업',
  welding:     '용접·절단 작업',
  chemical:    '유해화학물질 취급',
  heavy_equip: '중장비 작업',
  other:       '기타 작업',
}

// ─── 산업안전보건기준에 관한 규칙 [별표 4] 대상작업 ─────────────
export type Annex4WorkKey =
  | 'tower_crane_install'
  | 'vehicle_material_handling'
  | 'vehicle_construction_machine'
  | 'chemical_facility'
  | 'concrete_pump_mixer_transport'
  | 'demolition'
  | 'heavy_object_handling'
  | 'rail_maintenance'
  | 'fishing_work'
  | 'lifting_work'
  | 'electrical_work'
  | 'deep_excavation'
  | 'construction_work'

export const ANNEX4_WORK_LABELS: Record<Annex4WorkKey, string> = {
  tower_crane_install:            '타워크레인을 설치·조립·해체하는 작업',
  vehicle_material_handling:      '차량계 하역운반기계등을 사용하는 작업',
  vehicle_construction_machine:   '차량계 건설기계를 사용하는 작업',
  chemical_facility:              '화학설비 및 그 부속설비를 사용하는 작업',
  concrete_pump_mixer_transport:  '콘크리트펌프 또는 콘크리트믹서트럭을 사용한 운반 작업',
  demolition:                     '건물등의 해체작업',
  heavy_object_handling:          '중량물 취급작업',
  rail_maintenance:               '궤도·관련 설비의 유지보수작업',
  fishing_work:                   '어로작업',
  lifting_work:                   '양중기를 사용하는 작업',
  electrical_work:                '전기작업',
  deep_excavation:                '굴착면 높이 2m 이상 굴착 및 토사 붕괴 우려 장소의 토석 채취작업',
  construction_work:              '건물등의 건설 작업',
}

// 별표 4 대상작업 선택 시 작업계획서 기본 분류 매핑
export const ANNEX4_WORK_TO_PLAN_TYPE: Record<Annex4WorkKey, WorkPlanType> = {
  tower_crane_install:           'crane',
  vehicle_material_handling:     'heavy_equip',
  vehicle_construction_machine:  'heavy_equip',
  chemical_facility:             'chemical',
  concrete_pump_mixer_transport: 'heavy_equip',
  demolition:                    'demolition',
  heavy_object_handling:         'crane',
  rail_maintenance:              'other',
  fishing_work:                  'other',
  lifting_work:                  'crane',
  electrical_work:               'electrical',
  deep_excavation:               'excavation',
  construction_work:             'height',
}

// 법적 근거 (산업안전보건법 시행규칙 별표 4 등)
export const WORK_PLAN_LEGAL_BASIS: Record<WorkPlanType, string> = {
  height:      '산업안전보건기준에 관한 규칙 제42조 (추락에 의한 위험 방지), 제44조 (안전대의 부착설비 등)',
  excavation:  '산업안전보건기준에 관한 규칙 제340조 (굴착작업 시 위험 방지), 제342조 (흙막이 지보공)',
  crane:       '산업안전보건기준에 관한 규칙 제132조 (양중기에 의한 위험 방지), 제134조 (이동식 크레인)',
  confined:    '산업안전보건기준에 관한 규칙 제619조 (밀폐공간 작업 프로그램 수립·시행)',
  demolition:  '산업안전보건기준에 관한 규칙 제522조 (해체작업 시 위험 방지)',
  electrical:  '산업안전보건기준에 관한 규칙 제301조 (전기 위험 방지 조치)',
  welding:     '산업안전보건기준에 관한 규칙 제225조 (화기 사용 장소 소화기 비치)',
  chemical:    '산업안전보건법 제114조 (물질안전보건자료의 비치), 제115조 (물질안전보건자료 게시)',
  heavy_equip: '산업안전보건기준에 관한 규칙 제98조 (차량계 하역운반기계 등 사용 시 위험 방지)',
  other:       '산업안전보건법 제38조 (안전조치), 제39조 (보건조치)',
}

// ─── 작업계획서 아이템 (위험요인별) ──────────────────────────
export interface WorkPlanRiskItem {
  seq:                  number
  source_risk_item_id:  string | null   // 위험성평가 항목 ID
  work_content:         string          // 작업 내용
  hazard_factor:        string          // 유해·위험요인
  hazard_type:          string
  risk_level:           string          // high | medium | low
  risk_score:           number
  // 감소대책 (위험성평가에서 자동 반영)
  engineering_measure:  string          // 공학적 대책
  admin_measure:        string          // 관리적 대책
  ppe_measure:          string          // 개인보호구
  measure_owner:        string          // 담당자
  measure_due_date:     string          // 완료기한
  // 작업계획 추가 항목
  work_method:          string          // 작업 방법·절차
  equipment_needed:     string          // 필요 장비·자재
  worker_count:         number          // 투입 인원
  check_items:          string          // 사전 점검 항목
}

// ─── 작업 인원 ───────────────────────────────────────────────
export interface WorkPlanWorker {
  seq:        number
  name:       string
  position:   string
  role:       string          // 작업반장 | 작업원 | 안전감시자 | 신호수 등
  license:    string          // 보유 자격증
}

// ─── 작업계획서 헤더 ─────────────────────────────────────────
export interface WorkPlan {
  id:                   string
  company_id:           string
  project_id:           string | null
  source_risk_id:       string | null   // 연계 위험성평가
  link_type:            'auto_from_risk' | 'manual'

  title:                string
  plan_type:            WorkPlanType
  work_location:        string          // 작업 장소
  work_start_date:      string
  work_end_date:        string
  work_start_time:      string | null
  work_end_time:        string | null
  work_scope:           string          // 작업 범위·내용 개요
  legal_basis:          string          // 관계 법령

  // 작업 책임자
  supervisor_name:      string
  supervisor_position:  string
  supervisor_phone:     string | null

  // 안전 조치 요약
  safety_summary:       string          // 종합 안전대책

  risk_items:           WorkPlanRiskItem[]
  workers:              WorkPlanWorker[]

  status:               'draft' | 'approved' | 'archived'
  author_id:            string
  approved_by:          string | null
  approved_at:          string | null
  created_at:           string
  updated_at:           string

  // joined
  author?:              { name: string; position: string }
  project?:             { name: string; site_name: string }
  source_risk?:         { title: string; eval_type: string }
  company?:             { name: string; address: string }
}

// ─── 위험 유형 → 작업계획 세부 매핑 ─────────────────────────

export interface WorkPlanTemplate {
  work_method:        string
  equipment_needed:   string
  check_items:        string
}

export const HAZARD_TO_WORK_TEMPLATE: Record<string, WorkPlanTemplate> = {
  fall: {
    work_method:
      '1. 작업 전 안전난간·안전방망 설치 상태 확인\n' +
      '2. 개인 안전대 착용 및 안전대 부착설비 확인\n' +
      '3. 고소작업대(작업발판) 수평·고정 상태 점검\n' +
      '4. 2인 1조 작업 원칙 준수 (1명 감시)\n' +
      '5. 작업 중 공구·자재 낙하 방지조치 확인',
    equipment_needed:
      '안전난간(H≥0.9m), 안전방망, 안전대(Y형), 안전대 부착설비(구명줄),\n' +
      '안전모, 안전화, 추락방지망, 작업발판(비계/고소작업대)',
    check_items:
      '□ 안전난간·안전방망 설치 완료\n' +
      '□ 안전대 착용 및 구명줄 체결 확인\n' +
      '□ 작업발판 고정·수평 상태 확인\n' +
      '□ 낙하물 방지망·발끝막이판 설치\n' +
      '□ 작업구역 출입통제(라인) 설치',
  },
  fire: {
    work_method:
      '1. 작업 전 화기작업 허가서 발급·확인\n' +
      '2. 주변 가연성 물질 제거 또는 방화포 덮음\n' +
      '3. 소화기(ABC 분말, 5kg 이상) 작업 반경 5m 이내 비치\n' +
      '4. 용접·절단 불티 비산 범위 내 감시자 배치\n' +
      '5. 작업 종료 후 30분간 화재 감시 실시',
    equipment_needed:
      '방화포(2×2m 이상), ABC 분말소화기(5kg), 용접면, 가죽장갑,\n' +
      '방진·방독마스크, 국소배기장치(환기팬), 불티받이 설비',
    check_items:
      '□ 화기작업 허가서 발급 확인\n' +
      '□ 주변 가연성 물질 제거 확인\n' +
      '□ 소화기 비치 및 작동 상태 확인\n' +
      '□ 용접 불꽃 감시자 배치 확인\n' +
      '□ 환기 설비(국소배기) 가동 확인',
  },
  entanglement: {
    work_method:
      '1. 작업 전 LOTO(잠금·표지) 절차 이행\n' +
      '2. 회전체·끼임 위험부위 방호덮개 설치 확인\n' +
      '3. 느슨한 복장(장갑 포함) 착용 금지\n' +
      '4. 장비 점검·청소 시 반드시 전원 차단 후 실시\n' +
      '5. 작업 중 2인 이상 상호 확인',
    equipment_needed:
      '잠금장치(LOTO 세트), 방호덮개, 안전모, 안전화,\n' +
      '절연장갑(전기 관련 시), 점검 공구',
    check_items:
      '□ LOTO 잠금 완료 및 태그 부착 확인\n' +
      '□ 방호덮개 설치 및 고정 확인\n' +
      '□ 전원 차단 상태 확인\n' +
      '□ 느슨한 복장 착용 여부 확인\n' +
      '□ 작업 전 공구 점검 완료',
  },
  collision: {
    work_method:
      '1. 양중·인양 작업 전 신호수 배치 및 신호 체계 확인\n' +
      '2. 인양물 하부 작업 반경 출입 통제\n' +
      '3. 아웃트리거 완전 확장 및 지반 지지력 확인\n' +
      '4. 달기구(와이어로프·슬링) 사전 점검 (마모·변형 확인)\n' +
      '5. 운전자-신호수 무전기 통신 확인',
    equipment_needed:
      '무전기(2대), 안전모, 반사조끼(신호수), 아웃트리거 패드,\n' +
      '와이어로프·슬링·샤클(정격 하중 이상), 출입통제 바리케이드',
    check_items:
      '□ 달기구 점검표 확인 (마모·변형)\n' +
      '□ 아웃트리거 완전 확장 확인\n' +
      '□ 신호수 배치 및 통신 확인\n' +
      '□ 작업 반경 출입통제 확인\n' +
      '□ 정격 하중 초과 여부 확인',
  },
  hazmat: {
    work_method:
      '1. 작업 전 MSDS 확인 및 근로자 교육 실시\n' +
      '2. 전체 환기 또는 국소배기장치 가동\n' +
      '3. 개인보호구 착용 후 작업 시작\n' +
      '4. 유해물질 용기 밀폐 및 누출 방지조치\n' +
      '5. 비상 샤워·세안 설비 가용 상태 확인',
    equipment_needed:
      '방독마스크(유기가스용), 화학보호장갑(니트릴), 보안경,\n' +
      '방호복(필요 시), 국소배기장치, 비상 샤워·세안기',
    check_items:
      '□ MSDS 비치 및 교육 완료 확인\n' +
      '□ 환기 설비 가동 확인\n' +
      '□ 개인보호구 착용 상태 확인\n' +
      '□ 비상 세안·샤워 설비 작동 확인\n' +
      '□ 유해물질 용기 밀폐 상태 확인',
  },
  electrical: {
    work_method:
      '1. 전원 차단 및 LOTO 이행 후 작업 시작\n' +
      '2. 검전기로 무전압 상태 확인\n' +
      '3. 절연장갑·절연화 착용 후 작업\n' +
      '4. 충전부 노출 시 절연커버 또는 절연테이프 처리\n' +
      '5. 작업 중 2인 이상 (1인 감시)',
    equipment_needed:
      '검전기(접촉·비접촉), 절연장갑(1000V 이상), 절연화,\n' +
      '절연커버, LOTO 잠금장치, 안전모(ABS), 안전화',
    check_items:
      '□ 전원 차단 및 LOTO 완료 확인\n' +
      '□ 검전기 무전압 확인\n' +
      '□ 절연보호구 착용 확인\n' +
      '□ 충전부 절연 처리 확인\n' +
      '□ 감시인 배치 확인',
  },
  ergonomic: {
    work_method:
      '1. 중량물(25kg 초과) 취급 시 2인 이상 작업\n' +
      '2. 보조 기구(대차, 핸드리프트 등) 최대한 활용\n' +
      '3. 올바른 작업 자세(허리 굽힘 최소화) 유지\n' +
      '4. 반복 작업 시 50분 작업 + 10분 휴식 원칙\n' +
      '5. 작업 전·후 스트레칭 실시',
    equipment_needed:
      '핸드리프트(또는 대차), 보호대(허리·무릎), 안전화,\n' +
      '방진장갑(진동 작업 시), 작업 높이 조절 발판',
    check_items:
      '□ 중량물 무게 확인 (25kg 초과 시 2인)\n' +
      '□ 보조 기구 사용 가능 여부 확인\n' +
      '□ 작업 자세 교육 실시 확인\n' +
      '□ 작업-휴식 교대 계획 확인\n' +
      '□ 스트레칭 실시 확인',
  },
  other: {
    work_method:
      '1. 작업 전 TBM(Tool Box Meeting) 실시 — 위험요인 공유\n' +
      '2. 작업 범위·순서 명확화 및 작업자 주지\n' +
      '3. 보호구 착용 확인 후 작업 시작\n' +
      '4. 작업 중 이상 발견 시 즉시 작업 중지 및 보고\n' +
      '5. 작업 종료 후 현장 정리정돈 및 점검',
    equipment_needed:
      '안전모, 안전화, 안전조끼(반사),\n' +
      '작업 특성에 맞는 보호구, 작업 공구',
    check_items:
      '□ TBM 실시 및 참석자 서명 확인\n' +
      '□ 개인보호구 착용 확인\n' +
      '□ 작업 구역 출입통제 설치 확인\n' +
      '□ 비상연락망 게시 확인\n' +
      '□ 작업 후 현장 정리정돈 확인',
  },
}

// 기본값 없는 유형은 other 템플릿 사용
export function getWorkTemplate(hazardType: string): WorkPlanTemplate {
  return HAZARD_TO_WORK_TEMPLATE[hazardType] ?? HAZARD_TO_WORK_TEMPLATE.other
}
