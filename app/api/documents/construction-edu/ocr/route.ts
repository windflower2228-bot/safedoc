// app/api/documents/construction-edu/ocr/route.ts
// 이수증 사진 → Claude Vision API OCR → 구조화된 데이터 반환
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// OCR 결과 타입
interface CertRecord {
  person_name:      string
  birth_date:       string
  register_date:    string
  completion_date:  string
  course_name:      string
  issuer:           string
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const { image_base64, media_type = 'image/jpeg' } = body

  if (!image_base64) {
    return NextResponse.json({ error: '이미지 데이터가 필요합니다.' }, { status: 400 })
  }

  const prompt = `이 이미지는 건설업 기초안전보건교육 이수증 사진입니다.
사진에 이수증이 한 장이든 여러 장이든, 모든 이수증의 정보를 빠짐없이 추출해주세요.

각 이수증에서 다음 정보를 추출하세요:
- 이름 (person_name): 이수자 성명
- 생년월일 (birth_date): 예) 1990-01-15 또는 90.01.15 등 원문 그대로
- 등록일자 (register_date): 이수증 등록/발급일
- 이수일자 (completion_date): 교육 이수 완료일
- 교육명 (course_name): 교육 과정명 (기본값: 건설업 기초안전보건교육)
- 발급기관 (issuer): 발급 기관명

반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "records": [
    {
      "person_name": "홍길동",
      "birth_date": "1990-01-15",
      "register_date": "2025-03-10",
      "completion_date": "2025-03-08",
      "course_name": "건설업 기초안전보건교육",
      "issuer": "한국산업안전보건공단"
    }
  ],
  "total_count": 1,
  "raw_note": "인식 불가능한 부분이나 특이사항이 있으면 여기에 기재"
}

- 글자가 불분명한 경우 빈 문자열("")로 처리
- 날짜는 원문에 있는 형식 그대로 추출 (변환하지 말 것)
- 여러 이수증이 있으면 records 배열에 모두 포함`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type:       'base64',
              media_type: media_type as 'image/jpeg' | 'image/png' | 'image/webp',
              data:       image_base64,
            },
          },
          { type: 'text', text: prompt },
        ],
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''

    // JSON 파싱
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({
        error: 'OCR 결과를 파싱할 수 없습니다.',
        raw_response: raw,
      }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      records:     parsed.records ?? [],
      total_count: parsed.total_count ?? parsed.records?.length ?? 0,
      raw_note:    parsed.raw_note ?? '',
    })
  } catch (err: any) {
    console.error('[OCR Error]', err)
    return NextResponse.json({ error: err.message ?? 'OCR 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
