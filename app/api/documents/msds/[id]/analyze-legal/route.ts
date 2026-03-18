// app/api/documents/msds/[id]/analyze-legal/route.ts
// MSDS 업로드 시 또는 수동 호출 시 — 15. 법적 규제현황을 AI로 분석하여
// 관리대상/허가대상/특별관리/작업환경측정/특수건강진단 대상 여부 자동 분류

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

const ANALYSIS_SYSTEM = `당신은 대한민국 산업안전보건법 전문가입니다.
MSDS 16개 항목 중 "15. 법적 규제현황" 텍스트를 분석하여 해당 물질의 법적 분류를 결정합니다.

분류 기준:
1. **관리대상유해물질**: "관리대상유해물질" 문구 또는 "안전보건기준에 관한 규칙 별표12" 또는 "작업환경관리" 언급
2. **허가대상유해물질**: "허가대상" 문구 또는 "산업안전보건법 시행령 제88조" 또는 "고용노동부장관의 허가" 언급
3. **특별관리물질**: "특별관리물질" 문구가 명시된 경우. 또는 별표12에서 "(특별관리물질)"로 표기된 물질(디니트로톨루엔, N,N-디메틸아세트아미드, 디메틸포름아미드, 1,2-디클로로에탄, 1,2-디클로로프로판, 2-메톡시에탄올, 2-메톡시에틸아세테이트, 벤젠, 1,3-부타디엔, 1-브로모프로판, 2-브로모프로판, 사염화탄소, 아크릴로니트릴, 아크릴아미드, 2-에톡시에탄올, 2-에톡시에틸아세테이트, 에틸렌이민, 2,3-에폭시-1-프로판올, 1,2-에폭시프로판, 에피클로로히드린, 트리클로로에틸렌, 1,2,3-트리클로로프로판, 퍼클로로에틸렌, 페놀, 포름알데히드, 프로필렌이민, 황산디메틸, 히드라진, 납및무기화합물, 니켈불용성화합물, 수은및화합물, 삼산화안티몬, 카드뮴및화합물, 6가크롬화합물, 황산(pH2이하), 산화에틸렌)에 해당하는 경우
4. **작업환경측정 대상물질**: "작업환경측정" 문구 또는 "작업환경측정 대상 유해인자" 또는 "시행규칙 별표21" 언급
5. **특수건강진단 대상물질**: "특수건강진단" 문구 또는 "특수건강진단 대상 유해인자" 또는 "시행규칙 별표22" 언급

반드시 JSON만 응답하세요:
{
  "is_managed": true|false,
  "is_permitted": true|false,
  "is_special": true|false,
  "is_work_env_target": true|false,
  "is_special_health": true|false,
  "edu_required_35": true|false,
  "legal_refs": ["해당 법령 목록"],
  "classification_reason": "분류 근거 요약 (1~3문장)",
  "raw_analysis": "15조 내용 요약"
}

edu_required_35 결정 기준:
- is_managed, is_permitted, is_special 중 하나라도 true이면 edu_required_35 = true
- 산업안전보건법 시행규칙 [별표 5] 제35호: 허가 또는 관리대상 유해물질의 제조 또는 취급작업에 대한 특별교육 의무`

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // MSDS 조회
  const { data: msds, error: mErr } = await supabase
    .from('msds_records')
    .select('*')
    .eq('id', params.id)
    .single()
  if (mErr || !msds) return NextResponse.json({ error: 'MSDS를 찾을 수 없습니다.' }, { status: 404 })

  // 분석할 텍스트 준비 (15조 + 2조 + 구성성분)
  const body  = await req.json().catch(() => ({}))
  const text15 = body.legal_text || msds.legal_regulation_raw || ''
  const textAll = `
제품명: ${msds.product_name}
CAS번호: ${msds.cas_number || ''}
구성성분: ${msds.main_components || ''}
GHS 유해성: ${(msds.ghs_hazards || []).join(', ')}
유해·위험문구: ${(msds.hazard_statements || []).join('; ')}

=== 15. 법적 규제현황 ===
${text15 || '(미기재 — 위 정보를 토대로 추정하여 분류)'}
  `.trim()

  // Claude API 호출
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system:     ANALYSIS_SYSTEM,
      messages:   [{ role: 'user', content: textAll }],
    }),
  })

  const aiData = await response.json()
  const rawText = aiData.content?.[0]?.text ?? '{}'

  // JSON 파싱
  let classification: any = {}
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (jsonMatch) classification = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'AI 분석 결과 파싱 실패', raw: rawText }, { status: 500 })
  }

  classification.analyzed_at = new Date().toISOString()

  // is_special이면 check-special과 동일하게 special 관련 필드 초기 세팅
  if (classification.is_special && !classification.special_checked_at) {
    classification.special_checked_at = classification.analyzed_at
    // CMR 유형 추론: legal_refs 또는 classification_reason에서 유추
    const reason = (classification.classification_reason || '') + (classification.raw_analysis || '')
    const cmrTypes: string[] = []
    if (/발암|carcinogen/i.test(reason)) cmrTypes.push('C')
    if (/변이원|mutagen/i.test(reason))  cmrTypes.push('M')
    if (/생식독|reproduct/i.test(reason)) cmrTypes.push('R')
    if (cmrTypes.length === 0) cmrTypes.push('C') // 특별관리물질 기본값
    classification.special_cmr_types = cmrTypes
  }

  // DB 업데이트
  const { data: updated, error: uErr } = await supabase
    .from('msds_records')
    .update({
      legal_regulation_raw: text15 || msds.legal_regulation_raw,
      legal_classification:  classification,
      updated_at:            new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  return NextResponse.json({ data: updated, classification })
}
