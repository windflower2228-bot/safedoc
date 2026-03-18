// app/api/worklog/analyze/route.ts
// 작업일보 텍스트 → Claude API 공종 분석 → 안전 서류 자동 추천

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('company_id, role').eq('id', user.id).single()
  if (!['super_admin','company_admin','manager'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const { text, file_name, upload_date } = body

  if (!text?.trim()) return NextResponse.json({ error: '분석할 텍스트가 없습니다.' }, { status: 400 })

  const prompt = `다음은 건설 현장의 작업일보 내용입니다. 아래 내용을 분석하여 안전관리를 위해 필요한 정보를 JSON으로 반환하세요.

[작업일보 내용]
${text.slice(0, 3000)}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "detected_worktypes": ["철골공사", "용접작업"],
  "detected_keywords": ["고소작업", "화기취급", "중장비"],
  "risk_suggestions": [
    { "worktype": "철골공사", "hazards": ["추락", "낙하물"], "priority": "high", "reason": "고층 철골 조립 작업으로 추락 위험 높음" }
  ],
  "edu_suggestions": [
    { "topic": "고소작업 안전교육", "legal_basis": "산업안전보건법 제29조", "target": "철골공 전원", "priority": "high" }
  ],
  "workplan_suggestions": [
    { "title": "철골 고소작업 계획서", "hazard_type": "fall", "required": true }
  ],
  "hazard_suggestions": [
    { "doc_type": "inspection", "title": "추락 예방 순회점검", "check_items": ["안전난간 설치", "안전대 착용"] },
    { "doc_type": "msds", "title": "용접 용제 MSDS 등록 필요", "substances": ["용접봉", "플럭스"] }
  ],
  "summary": "철골공사 및 용접작업이 주요 공종으로 확인됨. 고소작업 추락 위험 및 화재·유해가스 위험 관리 필요.",
  "work_date": "2025-03-16",
  "worker_count": 15
}

규칙:
- detected_worktypes: 본문에서 감지된 주요 공종 목록 (최대 10개)
- detected_keywords: 위험 키워드 (최대 15개)
- risk_suggestions: 위험성평가 필요 항목 (priority: high/medium/low)
- edu_suggestions: 필요 안전교육 (priority: high/medium)
- workplan_suggestions: 필요 작업계획서 목록
- hazard_suggestions: 추가 필요 서류 (점검일지, MSDS 등)
- summary: 100자 이내 종합 의견
- work_date: 날짜가 명시된 경우 YYYY-MM-DD, 없으면 null
- worker_count: 근로자 수가 명시된 경우 숫자, 없으면 null`

  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 2000,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw       = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: '분석 결과를 파싱할 수 없습니다.', raw }, { status: 422 })

    const parsed = JSON.parse(jsonMatch[0])

    // DB 저장
    const { data: saved, error } = await supabase
      .from('worklog_analyses')
      .insert({
        company_id:           profile!.company_id,
        upload_date:          upload_date ?? new Date().toISOString().slice(0,10),
        file_name:            file_name ?? null,
        raw_text:             text.slice(0, 10000),
        detected_worktypes:   parsed.detected_worktypes ?? [],
        detected_keywords:    parsed.detected_keywords  ?? [],
        risk_suggestions:     parsed.risk_suggestions   ?? [],
        edu_suggestions:      parsed.edu_suggestions    ?? [],
        workplan_suggestions: parsed.workplan_suggestions ?? [],
        hazard_suggestions:   parsed.hazard_suggestions ?? [],
        summary:              parsed.summary ?? '',
        author_id:            user.id,
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { ...saved, ...parsed } })

  } catch (err: any) {
    console.error('[Worklog Analyze Error]', err)
    return NextResponse.json({ error: err.message ?? '분석 중 오류' }, { status: 500 })
  }
}
