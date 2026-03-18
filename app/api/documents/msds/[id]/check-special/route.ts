// app/api/documents/msds/[id]/check-special/route.ts
// MSDS가 별표12 특별관리물질 해당 여부 + CMR 유형 판단

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findSpecialSubstance } from '@/lib/special-management-substances'

type Params = { params: { id: string } }

const CHECK_PROMPT = `당신은 산업안전보건 전문가입니다.
다음 MSDS 정보를 보고 이 물질이 [산업안전보건기준에 관한 규칙 별표12]에서 "(특별관리물질)"로 표기된 물질에 해당하는지 판단하세요.

별표12에서 "(특별관리물질)"로 명시된 물질들:
유기화합물: 디니트로톨루엔, N,N-디메틸아세트아미드, 디메틸포름아미드, 1,2-디클로로에탄, 1,2-디클로로프로판, 2-메톡시에탄올, 2-메톡시에틸아세테이트, 벤젠, 1,3-부타디엔, 1-브로모프로판, 2-브로모프로판, 사염화탄소, 스토다드솔벤트(벤젠0.1%이상), 아크릴로니트릴, 아크릴아미드, 2-에톡시에탄올, 2-에톡시에틸아세테이트, 에틸렌이민, 2,3-에폭시-1-프로판올, 1,2-에폭시프로판, 에피클로로히드린, 트리클로로에틸렌, 1,2,3-트리클로로프로판, 퍼클로로에틸렌, 페놀, 포름알데히드, 프로필렌이민, 황산디메틸, 히드라진
금속류: 납및무기화합물, 니켈무기화합물(불용성), 수은및화합물(아릴·알킬제외), 안티몬(삼산화안티몬만), 카드뮴및화합물, 크롬화합물(6가크롬만)
산알칼리류: 황산(pH2.0이하강산)
가스상태: 산화에틸렌

반드시 JSON만 응답:
{
  "is_special": true|false,
  "matched_substance": "해당 별표12 특별관리물질명 또는 null",
  "cmr_types": ["C"|"M"|"R"],
  "cmr_reason": "발암성/변이원성/생식독성 해당 근거",
  "condition_note": "조건부 특별관리물질인 경우 조건 설명 또는 null"
}`

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: msds } = await supabase.from('msds_records').select('*').eq('id', params.id).single()
  if (!msds) return NextResponse.json({ error: 'MSDS 없음' }, { status: 404 })

  // 1) 로컬 DB로 먼저 빠르게 검색
  const localMatch = findSpecialSubstance(msds.product_name) || findSpecialSubstance(msds.cas_number ?? '')

  // 2) AI 분석 (로컬에 없거나 MSDS 15조 텍스트가 있는 경우)
  const body = await req.json().catch(() => ({}))
  const legalText = body.legal_text || msds.legal_regulation_raw || ''

  const prompt = `제품명: ${msds.product_name}
CAS번호: ${msds.cas_number || '없음'}
주성분: ${msds.main_components || '없음'}
GHS 유해성: ${(msds.ghs_hazards || []).join(', ')}
유해위험문구: ${(msds.hazard_statements || []).join('; ')}
15. 법적 규제현황: ${legalText || '(없음)'}`

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: CHECK_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const aiData = await aiRes.json()
  const rawText = aiData.content?.[0]?.text ?? '{}'
  let aiResult: any = {}
  try {
    const m = rawText.match(/\{[\s\S]*\}/)
    if (m) aiResult = JSON.parse(m[0])
  } catch { /* ignore */ }

  // 로컬 DB 결과와 AI 결과 병합 (로컬 우선)
  const isSpecial     = localMatch ? true : (aiResult.is_special ?? false)
  const cmrTypes: string[] = localMatch
    ? localMatch.cmr_type
    : (aiResult.cmr_types ?? [])

  // DB에 법적 분류 업데이트
  const lc = msds.legal_classification ?? {}
  const updated_lc = {
    ...lc,
    is_special: isSpecial,
    special_substance_name: localMatch?.name_ko || aiResult.matched_substance || null,
    special_cmr_types: cmrTypes,
    special_condition: localMatch?.condition || aiResult.condition_note || null,
    special_cmr_reason: aiResult.cmr_reason || null,
    special_checked_at: new Date().toISOString(),
    edu_required_35: lc.is_managed || lc.is_permitted || isSpecial || false,
  }

  await supabase.from('msds_records')
    .update({ legal_classification: updated_lc, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  return NextResponse.json({
    is_special: isSpecial,
    cmr_types: cmrTypes,
    matched_substance: localMatch?.name_ko || aiResult.matched_substance,
    condition_note: localMatch?.condition || aiResult.condition_note,
    cmr_reason: aiResult.cmr_reason,
    local_match: !!localMatch,
  })
}
