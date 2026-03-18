// app/api/documents/msds/[id]/generate-edu/route.ts
// MSDS 한 건 → 교육일지 초안 생성
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEduDraftFromMsds } from '@/lib/linkage/msdsToEducation'
import type { MsdsRecord } from '@/types/msds'

type Params = { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const { edu_date, location, instructor, save = false } = body

  // MSDS 조회
  const { data: msds, error } = await supabase
    .from('msds_records')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !msds) return NextResponse.json({ error: 'MSDS를 찾을 수 없습니다.' }, { status: 404 })

  const draft = generateEduDraftFromMsds(msds as MsdsRecord, { eduDate: edu_date, location, instructor })

  // save=true이면 바로 교육일지로 저장
  if (save) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: '프로필 없음' }, { status: 403 })

    const { data: journal, error: saveErr } = await supabase
      .from('education_journals')
      .insert({
        company_id:          profile.company_id,
        source_risk_id:      null,
        link_type:           'manual',
        title:               draft.title,
        edu_type:            draft.edu_type,
        edu_date:            draft.edu_date,
        edu_duration_hours:  draft.edu_duration_hours,
        edu_location:        draft.edu_location,
        instructor_name:     draft.instructor_name,
        instructor_position: draft.instructor_position,
        edu_content:         draft.edu_content,
        edu_items:           draft.edu_items,
        attendees:           draft.attendees,
        attendee_count:      0,
        status:              'draft',
        author_id:           user.id,
      })
      .select()
      .single()

    if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 })
    return NextResponse.json({ data: journal, draft }, { status: 201 })
  }

  return NextResponse.json({ data: draft })
}
