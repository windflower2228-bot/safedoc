// app/api/documents/education/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('education_journals')
    .select(`
      *,
      author:user_profiles!author_id(name, position, phone),
      project:projects(name, site_name, site_address),
      source_risk:risk_assessments!source_risk_id(id, title, eval_type, eval_start_date),
      company:companies(name, address, logo_url)
    `)
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json({ data })
}

// ─── PATCH ───────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()

  // 참석자 수 재계산
  if (body.attendees) {
    body.attendee_count = (body.attendees as any[]).filter((a: any) => a.name?.trim()).length
  }

  const { data, error } = await supabase
    .from('education_journals')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (!['super_admin','company_admin'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: '삭제 권한 없음' }, { status: 403 })
  }

  const { error } = await supabase.from('education_journals').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
