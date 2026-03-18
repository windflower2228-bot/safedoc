// app/api/documents/construction-edu/[id]/route.ts
// id = upload_id
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

// 업로드 + 기록 전체 수정 (PUT — 기록 배열 전체 교체)
export async function PUT(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('company_id').eq('id', user.id).single()

  const body = await req.json()
  const { upload_date, note, records } = body

  // 헤더 업데이트
  await supabase.from('construction_edu_uploads')
    .update({ upload_date, note, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  // 기존 기록 전체 삭제 후 재삽입
  await supabase.from('construction_edu_records').delete().eq('upload_id', params.id)

  if (Array.isArray(records) && records.length > 0) {
    const rows = records.map((r: any) => ({
      upload_id:       params.id,
      company_id:      profile!.company_id,
      person_name:     r.person_name ?? '',
      birth_date:      r.birth_date ?? '',
      register_date:   r.register_date ?? '',
      completion_date: r.completion_date ?? '',
      course_name:     r.course_name ?? '건설업 기초안전보건교육',
      issuer:          r.issuer ?? '',
    }))
    await supabase.from('construction_edu_records').insert(rows)
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  await supabase.from('construction_edu_records').delete().eq('upload_id', params.id)
  await supabase.from('construction_edu_uploads').delete().eq('id', params.id)
  return NextResponse.json({ success: true })
}
