// app/api/plan/[id]/route.ts — 개별 항목 수정 (완료 처리 포함)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()

  // 완료 처리
  if (body.action === 'complete') {
    const { data, error } = await supabase
      .from('activity_items')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        linked_doc_id:   body.linked_doc_id   ?? null,
        linked_doc_type: body.linked_doc_type ?? null,
      })
      .eq('id', params.id)
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // 완료 취소
  if (body.action === 'uncomplete') {
    const { data, error } = await supabase
      .from('activity_items')
      .update({ is_completed: false, completed_at: null, linked_doc_id: null })
      .eq('id', params.id)
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // 일반 수정
  const { data, error } = await supabase
    .from('activity_items')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { error } = await supabase.from('activity_items').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
