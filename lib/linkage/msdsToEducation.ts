// lib/linkage/msdsToEducation.ts
// MSDS → 안전보건교육일지(MSDS용) 자동 변환 로직

import type { MsdsRecord } from '@/types/msds'
import {
  GHS_LABELS,
  generateMsdsEduPoints,
  getMsdsLegalBasis,
} from '@/types/msds'

export interface MsdsEduDraft {
  // 교육일지 필드에 바로 매핑되는 구조
  title:               string
  edu_type:            'special'
  edu_date:            string
  edu_duration_hours:  number
  edu_location:        string
  instructor_name:     string
  instructor_position: string
  edu_content:         string
  edu_items:           MsdsEduItem[]
  attendees:           { seq: number; name: string; position: string; department: string; sign: null }[]
  source_msds_id:      string
  source_msds_name:    string
}

export interface MsdsEduItem {
  seq:                 number
  source_risk_item_id: null
  source_msds_id:      string       // MSDS ID
  work_content:        string       // "OO 물질 취급 작업"
  hazard_factor:       string       // GHS 유해성 목록
  hazard_type:         'hazmat'
  risk_level:          'high' | 'medium' | 'low'
  edu_point:           string       // MSDS 기반 교육 포인트
  legal_basis:         string
  countermeasure:      string       // 취급 주의사항 + 보호구
}

export function generateEduDraftFromMsds(
  msds: MsdsRecord,
  options: {
    eduDate?:    string
    location?:   string
    instructor?: string
  } = {}
): MsdsEduDraft {
  const {
    eduDate    = new Date().toISOString().slice(0, 10),
    location   = '',
    instructor = '',
  } = options

  // 위험도 판정 (GHS 분류 기반)
  function inferRiskLevel(): 'high' | 'medium' | 'low' {
    const h = msds.ghs_hazards ?? []
    if (h.includes('explosive') || h.includes('toxic') || msds.signal_word === 'danger') return 'high'
    if (h.includes('flammable') || h.includes('corrosive') || msds.signal_word === 'warning') return 'medium'
    return 'low'
  }

  const riskLevel = inferRiskLevel()

  // 유해위험요인 문자열
  const hazardStr = (msds.ghs_hazards ?? [])
    .map(h => GHS_LABELS[h])
    .join(', ')

  // 감소대책 문자열
  const countermeasure = [
    msds.ppe_required    ? `[보호구] ${msds.ppe_required}` : null,
    msds.handling_storage ? `[취급] ${msds.handling_storage.slice(0, 80)}` : null,
    msds.spill_handling   ? `[누출] ${msds.spill_handling.slice(0, 60)}` : null,
  ].filter(Boolean).join('\n')

  // 교육 핵심 포인트
  const eduPoint = generateMsdsEduPoints(msds)

  // 법적 근거
  const legalBasis = getMsdsLegalBasis(msds.ghs_hazards ?? [])

  // 교육 항목 (1개 — MSDS 1종에 대한 교육)
  const eduItems: MsdsEduItem[] = [
    {
      seq:                 1,
      source_risk_item_id: null,
      source_msds_id:      msds.id,
      work_content:        `${msds.product_name} 취급 작업`,
      hazard_factor:       hazardStr || '유해화학물질',
      hazard_type:         'hazmat',
      risk_level:          riskLevel,
      edu_point:           eduPoint,
      legal_basis:         legalBasis,
      countermeasure,
    },
  ]

  // 특별관리물질 여부에 따른 특별교육(별표5 제35호) 자동 연계
  const lc = (msds as any).legal_classification ?? {}
  const isSpecialSubstance = !!lc.is_special
  const isManaged          = !!lc.is_managed
  const isPermitted        = !!lc.is_permitted
  const needsSpecialEdu    = isSpecialSubstance || isManaged || isPermitted

  // 교육 내용 요약
  const specialEduNote = needsSpecialEdu
    ? `\n【⚠ 특별교육 의무】 시행규칙 [별표 5] 제35호 — 허가·관리대상 유해물질 취급작업 특별교육 16시간 이상 필요\n` +
      (isSpecialSubstance ? `【특별관리물질】 별표12 특별관리물질 해당 — CMR 유형: ${(lc.special_cmr_types||[]).join(', ')||'확인필요'}\n` : '') +
      (lc.special_substance_name ? `【별표12 해당물질】 ${lc.special_substance_name}\n` : '')
    : ''

  const eduContent = [
    `【교육 목적】 ${msds.product_name} MSDS에 따른 유해·위험성과 안전 취급 방법을 근로자에게 주지시킴.`,
    msds.cas_number ? `【CAS 번호】 ${msds.cas_number}` : '',
    msds.manufacturer ? `【제조사】 ${msds.manufacturer}` : '',
    `【GHS 유해성】 ${hazardStr || '—'}`,
    `【신호어】 ${msds.signal_word === 'danger' ? '위험(Danger)' : msds.signal_word === 'warning' ? '경고(Warning)' : '—'}`,
    specialEduNote,
    `【근거】 산업안전보건법 제116조 (물질안전보건자료에 관한 교육)` +
      (needsSpecialEdu ? ' / 시행규칙 [별표 5] 제35호 특별교육' : ''),
  ].filter(Boolean).join('\n')

  return {
    title:               needsSpecialEdu
      ? `${msds.product_name} 특별교육 일지 (별표5 제35호)`
      : `${msds.product_name} MSDS 교육일지`,
    edu_type:            'special',
    edu_date:            eduDate,
    edu_duration_hours:  needsSpecialEdu ? 16 : 1,  // 상용직 기준 기본값; 사용자가 근무형태에 따라 수정 가능 (일용직 2h)
    edu_location:        location,
    instructor_name:     instructor,
    instructor_position: '',
    edu_content:         eduContent,
    edu_items:           eduItems,
    attendees: Array.from({ length: 5 }, (_, i) => ({
      seq: i + 1, name: '', position: '', department: '', sign: null,
    })),
    source_msds_id:   msds.id,
    source_msds_name: msds.product_name,
  }
}

// 여러 MSDS를 하나의 교육일지로 통합
export function generateCombinedEduDraftFromMsds(
  msdsList: MsdsRecord[],
  options: { eduDate?: string; location?: string; instructor?: string } = {}
): MsdsEduDraft {
  const first = msdsList[0]
  if (!first) throw new Error('MSDS 목록이 비어 있습니다.')

  const {
    eduDate    = new Date().toISOString().slice(0, 10),
    location   = '',
    instructor = '',
  } = options

  const eduItems: MsdsEduItem[] = msdsList.map((msds, idx) => {
    function inferRiskLevel(): 'high' | 'medium' | 'low' {
      const h = msds.ghs_hazards ?? []
      if (h.includes('explosive') || h.includes('toxic') || msds.signal_word === 'danger') return 'high'
      if (h.includes('flammable') || h.includes('corrosive') || msds.signal_word === 'warning') return 'medium'
      return 'low'
    }
    return {
      seq:                 idx + 1,
      source_risk_item_id: null,
      source_msds_id:      msds.id,
      work_content:        `${msds.product_name} 취급 작업`,
      hazard_factor:       (msds.ghs_hazards ?? []).map(h => GHS_LABELS[h]).join(', ') || '유해화학물질',
      hazard_type:         'hazmat',
      risk_level:          inferRiskLevel(),
      edu_point:           generateMsdsEduPoints(msds),
      legal_basis:         getMsdsLegalBasis(msds.ghs_hazards ?? []),
      countermeasure:      [msds.ppe_required, msds.handling_storage].filter(Boolean).join('\n'),
    }
  })

  const names = msdsList.map(m => m.product_name).join(', ')

  return {
    title:               `유해화학물질 MSDS 통합 교육일지 (${msdsList.length}종)`,
    edu_type:            'special',
    edu_date:            eduDate,
    edu_duration_hours:  Math.max(1, msdsList.length),
    edu_location:        location,
    instructor_name:     instructor,
    instructor_position: '',
    edu_content:         `【교육 목적】 사업장에서 사용하는 유해화학물질(${names})의 MSDS에 따른 유해·위험성과 안전 취급 방법 교육.\n【근거】 산업안전보건법 제116조`,
    edu_items:           eduItems,
    attendees: Array.from({ length: 5 }, (_, i) => ({
      seq: i + 1, name: '', position: '', department: '', sign: null,
    })),
    source_msds_id:   first.id,
    source_msds_name: names,
  }
}
