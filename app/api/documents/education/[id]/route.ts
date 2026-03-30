// app/api/documents/education/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  buildEducationLegalContent,
  ensureEducationItemsLegalBasis,
} from '@/lib/legal/mandatoryContent'
import type { EduItem, EduType, WorkerType } from '@/types/education'

type Params = { params: { id: string } }

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { data, error } = await admin
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

  if (error || !data || data.company_id !== profile.company_id) return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json({ data })
}

// ─── PATCH ───────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const { action: _action, ...updateBody } = body as Record<string, unknown>

  const { data: current, error: currentError } = await supabase
    .from('education_journals')
    .select('edu_type, worker_type, edu_content, edu_items')
    .eq('id', params.id)
    .single()
  if (currentError || !current) {
    return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  }

  const finalEduType = (updateBody.edu_type ?? current.edu_type) as EduType
  const finalWorkerType = (updateBody.worker_type ?? current.worker_type) as WorkerType | null | undefined
  const finalEduContent = buildEducationLegalContent(
    finalEduType,
    finalWorkerType,
    (updateBody.edu_content as string | null | undefined) ?? (current.edu_content as string | null | undefined)
  )
  const finalEduItems = ensureEducationItemsLegalBasis(
    ((updateBody.edu_items as EduItem[] | undefined) ?? (current.edu_items as EduItem[])) ?? []
  )
  updateBody.edu_content = finalEduContent
  updateBody.edu_items = finalEduItems

  // 참석자 수 재계산
  if (updateBody.attendees) {
    updateBody.attendee_count = (updateBody.attendees as any[]).filter((a: any) => a.name?.trim()).length
  }

  const { data, error } = await supabase
    .from('education_journals')
    .update({ ...updateBody, updated_at: new Date().toISOString() })
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
