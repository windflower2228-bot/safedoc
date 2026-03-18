// app/api/documents/construction-edu/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — 업로드 목록 (records 포함)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page     = Number(searchParams.get('page') ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 20)

  const { data, count, error } = await supabase
    .from('construction_edu_uploads')
    .select(`
      id, upload_date, image_url, image_name, note, created_at,
      author:user_profiles!author_id(name),
      records:construction_edu_records(*)
    `, { count: 'exact' })
    .order('upload_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

// POST — 업로드 저장 + 이수 기록 일괄 삽입
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('company_id, role').eq('id', user.id).single()
  if (!['super_admin','company_admin','manager'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const { upload_date, image_url, image_name, note, records } = body

  // 업로드 헤더 저장
  const { data: upload, error: upErr } = await supabase
    .from('construction_edu_uploads')
    .insert({
      company_id:  profile!.company_id,
      upload_date: upload_date ?? new Date().toISOString().slice(0, 10),
      image_url:   image_url ?? null,
      image_name:  image_name ?? null,
      note:        note ?? null,
      author_id:   user.id,
    })
    .select().single()

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // 이수 기록 일괄 삽입
  if (Array.isArray(records) && records.length > 0) {
    const rows = records.map((r: any) => ({
      upload_id:       upload.id,
      company_id:      profile!.company_id,
      person_name:     r.person_name ?? '',
      birth_date:      r.birth_date ?? '',
      register_date:   r.register_date ?? '',
      completion_date: r.completion_date ?? '',
      course_name:     r.course_name ?? '건설업 기초안전보건교육',
      issuer:          r.issuer ?? '',
      raw_ocr_text:    r.raw_ocr_text ?? null,
    }))
    await supabase.from('construction_edu_records').insert(rows)
  }

  return NextResponse.json({ data: upload }, { status: 201 })
}
