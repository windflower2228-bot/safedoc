// types/pre-work-inspection.ts
// 산업안전보건법 시행령 제66조 + 시행규칙 제94조
// 안전보건규칙(산업안전보건기준에 관한 규칙) 각 조항 반영

export type MachineTypeCode =
  | 'tower_crane'   // 제66조 제1호: 타워크레인
  | 'lift'          // 제66조 제3호: 건설작업용 리프트
  | 'pile_driver'   // 제66조 제1호: 항타기·항발기

export interface CheckItem {
  seq:              number
  category:         string
  item:             string
  legal_basis?:     string
  result:           'pass' | 'fail' | 'na'
  defect_detail:    string
  action_required:  string
  is_resolved:      boolean
}

export interface MachineType {
  code:         MachineTypeCode
  label:        string
  labelDetail:  string
  legalBasis:   string
  color:        string
  bg:           string
  defaultItems: Omit<CheckItem, 'result' | 'defect_detail' | 'action_required' | 'is_resolved'>[]
}

export const MACHINE_TYPES: Record<MachineTypeCode, MachineType> = {

  // ─────────────────────────────────────────────────────────────
  tower_crane: {
    code: 'tower_crane', label: '타워크레인', labelDetail: '시행령 제66조 제1호',
    legalBasis: '산안법 시행령 제66조 제1호 / 안전보건규칙 제132조~제165조',
    color: '#dc2626', bg: '#fef2f2',
    defaultItems: [
      { seq:1,  category:'설치·기초', item:'기초 앵커볼트 체결 상태 및 기초 균열·침하 여부', legal_basis:'안전보건규칙 제132조' },
      { seq:2,  category:'설치·기초', item:'마스트 수직도 확인 (허용오차 1/1000 이내)', legal_basis:'안전보건규칙 제132조' },
      { seq:3,  category:'설치·기초', item:'벽이음재(tie) 설치 간격 및 체결 상태', legal_basis:'안전보건규칙 제132조' },
      { seq:4,  category:'설치·기초', item:'클라이밍 케이지 및 안전장치 작동 여부', legal_basis:'안전보건규칙 제132조' },
      { seq:5,  category:'구조부', item:'마스트(mast) 핀·볼트 연결부 이상 유무', legal_basis:'안전보건규칙 제133조' },
      { seq:6,  category:'구조부', item:'지브(jib) 연결부 핀·볼트 체결 상태', legal_basis:'안전보건규칙 제133조' },
      { seq:7,  category:'구조부', item:'카운터 지브 및 카운터웨이트 설치 상태', legal_basis:'안전보건규칙 제133조' },
      { seq:8,  category:'구조부', item:'운전실 유리·문·잠금장치 상태', legal_basis:'안전보건규칙 제134조' },
      { seq:9,  category:'와이어로프·훅', item:'양중 와이어로프 마모·킹크·단선 여부 (7%이상 단선 불가)', legal_basis:'안전보건규칙 제163조' },
      { seq:10, category:'와이어로프·훅', item:'와이어로프 드럼 감김 상태 및 안전권수(2권 이상) 확인', legal_basis:'안전보건규칙 제163조' },
      { seq:11, category:'와이어로프·훅', item:'훅(hook) 해지장치 작동 상태 및 변형·균열 여부', legal_basis:'안전보건규칙 제165조' },
      { seq:12, category:'와이어로프·훅', item:'훅블록 볼베어링 회전 상태', legal_basis:'안전보건규칙 제165조' },
      { seq:13, category:'안전장치', item:'과부하방지장치(OLL) 작동 시험', legal_basis:'안전보건규칙 제135조' },
      { seq:14, category:'안전장치', item:'권과방지장치 작동 시험 (최고점 도달 전 정지)', legal_basis:'안전보건규칙 제135조' },
      { seq:15, category:'안전장치', item:'비상정지장치 작동 시험', legal_basis:'안전보건규칙 제135조' },
      { seq:16, category:'안전장치', item:'모멘트 제한장치(MLI) 설정값 확인', legal_basis:'안전보건규칙 제135조' },
      { seq:17, category:'안전장치', item:'트롤리 이탈방지장치 상태', legal_basis:'안전보건규칙 제135조' },
      { seq:18, category:'안전장치', item:'선회 리밋스위치 작동 상태', legal_basis:'안전보건규칙 제135조' },
      { seq:19, category:'전기·제어', item:'주전원 차단기 및 접지 상태', legal_basis:'안전보건규칙 제306조' },
      { seq:20, category:'전기·제어', item:'운전실 제어판넬 계기류 정상 작동', legal_basis:'안전보건규칙 제306조' },
      { seq:21, category:'전기·제어', item:'풍속계(anemometer) 설치 및 작동 상태 (순간풍속 15m/s 초과 시 운전중지)', legal_basis:'안전보건규칙 제140조' },
      { seq:22, category:'전기·제어', item:'경보장치(경고음·경고등) 작동 상태', legal_basis:'안전보건규칙 제306조' },
      { seq:23, category:'작업환경', item:'작업반경 내 장애물 제거 및 출입금지 구역 설정', legal_basis:'안전보건규칙 제145조' },
      { seq:24, category:'작업환경', item:'신호수 배치 여부 및 신호방법 협의', legal_basis:'안전보건규칙 제40조' },
      { seq:25, category:'작업환경', item:'야간 조명 설비 상태 (야간작업 시)', legal_basis:'안전보건규칙 제8조' },
      { seq:26, category:'서류확인', item:'안전검사 합격증 유효기간 확인 (2년)', legal_basis:'산안법 제93조' },
      { seq:27, category:'서류확인', item:'타워크레인 설치·해체 신고 확인', legal_basis:'산안법 시행규칙 제78조' },
      { seq:28, category:'서류확인', item:'운전자 타워크레인 운전 자격 확인', legal_basis:'산안법 제140조' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  lift: {
    code: 'lift', label: '건설작업용 리프트', labelDetail: '시행령 제66조 제3호',
    legalBasis: '산안법 시행령 제66조 제3호 / 안전보건규칙 제132조~제159조',
    color: '#16a34a', bg: '#f0fdf4',
    defaultItems: [
      { seq:1,  category:'마스트·가이드레일', item:'마스트 수직도 및 연결부 상태', legal_basis:'안전보건규칙 제132조' },
      { seq:2,  category:'마스트·가이드레일', item:'가이드레일 볼트 체결 상태 및 윤활 상태', legal_basis:'안전보건규칙 제132조' },
      { seq:3,  category:'마스트·가이드레일', item:'마스트 벽이음재 설치 간격 확인 (9m 이내)', legal_basis:'안전보건규칙 제132조' },
      { seq:4,  category:'운반구', item:'운반구 바닥·벽·지붕 상태', legal_basis:'안전보건규칙 제134조' },
      { seq:5,  category:'운반구', item:'운반구 문 개폐 및 잠금장치 상태', legal_basis:'안전보건규칙 제134조' },
      { seq:6,  category:'운반구', item:'최대 적재하중 표시 및 초과 여부', legal_basis:'안전보건규칙 제134조' },
      { seq:7,  category:'와이어로프·권상', item:'와이어로프 마모·단선 여부', legal_basis:'안전보건규칙 제163조' },
      { seq:8,  category:'와이어로프·권상', item:'권상기 브레이크 작동 상태', legal_basis:'안전보건규칙 제136조' },
      { seq:9,  category:'안전장치', item:'과부하방지장치 작동 확인', legal_basis:'안전보건규칙 제135조' },
      { seq:10, category:'안전장치', item:'권과방지장치 작동 확인', legal_basis:'안전보건규칙 제135조' },
      { seq:11, category:'안전장치', item:'비상정지장치 작동 확인', legal_basis:'안전보건규칙 제135조' },
      { seq:12, category:'안전장치', item:'각 층 출입문 인터록(interlock) 작동 상태', legal_basis:'안전보건규칙 제136조' },
      { seq:13, category:'안전장치', item:'낙하방지장치(governor, 調速機) 작동 상태', legal_basis:'안전보건규칙 제135조' },
      { seq:14, category:'전기', item:'전기 배선·단자함 상태 및 접지 확인', legal_basis:'안전보건규칙 제306조' },
      { seq:15, category:'서류확인', item:'안전검사 합격증 유효기간 확인 (2년/매월)', legal_basis:'산안법 제93조' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  pile_driver: {
    code: 'pile_driver', label: '항타기·항발기', labelDetail: '시행령 제66조 제1호',
    legalBasis: '산안법 시행령 제66조 제1호 / 안전보건규칙 제218조~제240조',
    color: '#7c3aed', bg: '#f5f3ff',
    defaultItems: [
      { seq:1,  category:'본체·리더', item:'리더(leader) 수직도 확인 및 고정 상태', legal_basis:'안전보건규칙 제218조' },
      { seq:2,  category:'본체·리더', item:'리더 브레이싱(bracing) 체결 상태', legal_basis:'안전보건규칙 제218조' },
      { seq:3,  category:'본체·리더', item:'기계 본체 수평 유지 및 전도방지 조치', legal_basis:'안전보건규칙 제218조' },
      { seq:4,  category:'본체·리더', item:'아웃리거 설치 및 지반지지력 확인', legal_basis:'안전보건규칙 제218조' },
      { seq:5,  category:'해머·바이브로', item:'해머 무게 및 파일 허용중량 초과 여부', legal_basis:'안전보건규칙 제220조' },
      { seq:6,  category:'해머·바이브로', item:'해머 케이블·체인 연결 상태', legal_basis:'안전보건규칙 제220조' },
      { seq:7,  category:'해머·바이브로', item:'바이브로해머 클램프 체결 상태 (해당 시)', legal_basis:'안전보건규칙 제220조' },
      { seq:8,  category:'와이어로프·권상', item:'권상용 와이어로프 마모·단선·킹크 여부', legal_basis:'안전보건규칙 제163조' },
      { seq:9,  category:'와이어로프·권상', item:'와이어로프 드럼 고정 볼트 체결 상태', legal_basis:'안전보건규칙 제163조' },
      { seq:10, category:'와이어로프·권상', item:'시브(sheave) 마모 및 회전 상태', legal_basis:'안전보건규칙 제163조' },
      { seq:11, category:'안전장치', item:'권과방지장치 작동 확인', legal_basis:'안전보건규칙 제135조' },
      { seq:12, category:'안전장치', item:'비상정지장치 작동 확인', legal_basis:'안전보건규칙 제135조' },
      { seq:13, category:'안전장치', item:'파일 안내장치(pile guide) 상태', legal_basis:'안전보건규칙 제222조' },
      { seq:14, category:'작업환경', item:'항타 반경 내 근로자 접근 금지 조치', legal_basis:'안전보건규칙 제38조' },
      { seq:15, category:'작업환경', item:'지하매설물 위치 및 파일 간섭 여부 확인', legal_basis:'안전보건규칙 제48조' },
      { seq:16, category:'작업환경', item:'진동·소음 영향권 내 인근 구조물 확인', legal_basis:'안전보건규칙 제218조' },
      { seq:17, category:'서류확인', item:'운전자 항타기·항발기 운전 자격 확인', legal_basis:'산안법 제140조' },
      { seq:18, category:'서류확인', item:'안전검사 합격증 유효기간 확인 (해당 시)', legal_basis:'산안법 제93조' },
    ],
  },
}

export const MACHINE_TYPE_LIST = Object.values(MACHINE_TYPES)

export const PARTICIPANT_ROLES = {
  owner:      '소유자',
  lessee:     '임차인·대여자',
  contractor: '도급인',
  worker:     '작업자',
  inspector:  '안전관리자',
}
