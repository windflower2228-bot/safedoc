// types/inspection.ts

export type InspectionResult = 'pass' | 'fail' | 'na'
export const RESULT_LABEL: Record<InspectionResult, string> = { pass:'양호', fail:'불량', na:'해당없음' }
export const RESULT_COLOR: Record<InspectionResult,{bg:string;text:string}> = {
  pass:{bg:'bg-green-50',text:'text-green-700'},
  fail:{bg:'bg-red-50',text:'text-red-700'},
  na:{bg:'bg-gray-50',text:'text-gray-500'},
}

export type InspectionCategory = 'fall'|'electrical'|'fire'|'equipment'|'ppe'|'housekeeping'|'chemical'|'scaffolding'|'excavation'|'lifting'|'other'
export const CATEGORY_LABEL: Record<InspectionCategory,string> = {
  fall:'추락 예방', electrical:'전기 안전', fire:'화재 예방', equipment:'기계·장비',
  ppe:'보호구 착용', housekeeping:'정리정돈', chemical:'화학물질',
  scaffolding:'비계·가설물', excavation:'굴착·토공', lifting:'양중·인양', other:'기타',
}
export const HAZARD_TO_CATEGORY: Record<string,InspectionCategory> = {
  // legacy
  fall:'fall', entanglement:'equipment', collision:'lifting',
  fire:'fire', hazmat:'chemical', electrical:'electrical', ergonomic:'housekeeping', other:'other',
  // new
  falling:'fall',
  tripping:'fall',
  crushed_overturned:'equipment',
  struck_against:'lifting',
  struck_by_object:'lifting',
  collapse:'scaffolding',
  caught_in:'equipment',
  cut_stab:'ppe',
  fire_explosion_rupture:'fire',
  overexertion:'housekeeping',
  occupational_disease:'chemical',
}

export interface InspectionCheckItem {
  seq: number
  category: InspectionCategory
  check_content: string
  result: InspectionResult
  defect_detail: string
  action_required: string
  action_deadline: string
  action_owner: string
  is_resolved: boolean
  source_risk_item_id: string | null
}

export const DEFAULT_CHECK_ITEMS: Record<InspectionCategory,string[]> = {
  fall:        ['안전난간 설치 및 상태 확인 (90cm 이상)','개구부 덮개 설치·고정 상태','안전대 부착설비(구명줄) 설치','작업발판 설치·고정 상태','추락방호망 설치 여부'],
  electrical:  ['배전함 잠금·방수 상태','전선 피복 손상 및 접지 상태','임시 분전반 절연 상태','누전차단기 작동 여부','전기기계·기구 이상 유무'],
  fire:        ['소화기 비치 위치·상태','화기 작업 허가서 발급 여부','가연성 자재 관리 상태','비상구 확보·통로 상태','불티 비산 방호 여부'],
  equipment:   ['방호장치 설치·작동 상태','회전체 덮개 설치 여부','중장비 작업 반경 출입 통제','장비 점검 기록부 비치','운전원 자격증 보유 여부'],
  ppe:         ['안전모 착용 상태','안전화 착용 상태','안전대(고소) 착용 여부','작업 특성별 보호구 착용','보호구 지급·관리대장 유지'],
  housekeeping:['통로 확보·장애물 제거','자재 정리정돈 및 적재 상태','폐기물 분리수거 처리','작업 후 청소·안전 확인','조명 상태 (조도 기준)'],
  chemical:    ['MSDS 비치·게시 여부','화학물질 용기 라벨링 상태','보관 장소 환기 상태','누출 방지턱·흡착재 비치','취급 근로자 보호구 착용'],
  scaffolding: ['비계 기둥 수직도·고정 상태','발판 이격 간격·고정 여부','안전난간 설치 여부','연결재·버팀대 설치 상태','허용 적재하중 초과 여부'],
  excavation:  ['흙막이 가시설 설치·변형 상태','굴착 사면 기울기 준수','침수·용수 처리 상태','지반 계측 기록·이상 여부','출입 통제 상태'],
  lifting:     ['달기구(와이어로프·슬링) 이상','양중 반경 출입 통제','신호수 배치·무선통신 확인','크레인 아웃트리거 상태','인양물 결속·하중 초과 여부'],
  other:       ['TBM 실시 여부','위험요인 표지판 설치 여부','비상연락망 게시 여부','응급처치함 비치 상태','작업자 안전교육 이수 여부'],
}

// ─── 순회점검일지 ─────────────────────────────────────────────
export interface Inspection {
  id:string; company_id:string; project_id:string|null
  source_risk_id:string|null; link_type:'auto_from_risk'|'manual'; doc_number:string|null
  inspection_type:'routine'|'special'|'safety_day'
  inspection_date:string; inspection_start:string|null; inspection_end:string|null
  inspection_area:string; weather:string|null
  inspector_name:string; inspector_position:string; inspector_dept:string|null
  check_items:InspectionCheckItem[]; overall_opinion:string|null; follow_up_date:string|null
  status:'draft'|'completed'|'archived'
  author_id:string; created_at:string; updated_at:string
  author?:{name:string;position:string}
  project?:{name:string;site_name:string}
  source_risk?:{id:string;title:string;eval_type:string}
  company?:{name:string;address:string}
}
export const INSPECTION_TYPE_LABEL: Record<string,string> = {
  routine:'정기 순회점검', special:'특별 순회점검', safety_day:'안전점검의 날',
}

// ─── 합동안전보건점검 ─────────────────────────────────────────
export interface JointParticipant {
  seq:number; name:string; position:string; affiliation:string
  role:'leader'|'member'|'worker_rep'|'mgmt_rep'
}
export const PARTICIPANT_ROLE_LABEL: Record<string,string> = {
  leader:'점검단장', member:'점검위원', worker_rep:'근로자 대표', mgmt_rep:'사용자 대표',
}
export interface ImprovementItem {
  seq:number; item:string; deadline:string; owner:string; is_done:boolean
}
export interface JointInspection {
  id:string; company_id:string; project_id:string|null
  source_risk_id:string|null; link_type:'auto_from_risk'|'manual'; doc_number:string|null
  inspection_date:string; inspection_area:string
  participants:JointParticipant[]
  risk_summary:{eval_count:number;high_count:number;resolved_rate:number;period:string}|null
  check_items:InspectionCheckItem[]; improvement_items:ImprovementItem[]
  overall_opinion:string|null; follow_up_date:string|null
  status:'draft'|'completed'|'archived'
  author_id:string; created_at:string; updated_at:string
  author?:{name:string;position:string}
  project?:{name:string;site_name:string}
  source_risk?:{id:string;title:string;eval_type:string}
  company?:{name:string}
}

// ─── 안전보건협의체 회의록 ────────────────────────────────────
export interface CommitteeMember {
  seq:number; name:string; position:string; affiliation:string
  role:'chair'|'member'|'worker_rep'|'mgmt_rep'|'expert'; is_present:boolean
}
export const COMMITTEE_ROLE_LABEL: Record<string,string> = {
  chair:'의장', member:'위원', worker_rep:'근로자 위원', mgmt_rep:'사용자 위원', expert:'전문가',
}
export interface CommitteeAgendaItem {
  seq:number; title:string; content:string; decision:string; owner:string; deadline:string
}
export interface RiskPerformance {
  eval_count:number; high_count:number; mid_count:number; low_count:number
  resolved_count:number; resolved_rate:number; period:string; notable_items:string[]
}
export interface CommitteeMinutes {
  id:string; company_id:string; project_id:string|null
  source_risk_id:string|null; doc_number:string|null
  meeting_date:string; meeting_start:string|null; meeting_end:string|null
  meeting_place:string; meeting_type:'regular'|'extraordinary'
  members:CommitteeMember[]
  risk_performance:RiskPerformance|null
  agenda_items:CommitteeAgendaItem[]
  resolution:string|null; next_meeting_date:string|null
  status:'draft'|'completed'|'archived'
  author_id:string; created_at:string; updated_at:string
  author?:{name:string;position:string}
  company?:{name:string}
  source_risk?:{id:string;title:string}
}
export const COMMITTEE_MEETING_LABEL: Record<string,string> = {
  regular:'정기 회의', extraordinary:'임시 회의',
}
