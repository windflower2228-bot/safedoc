import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error:'인증 필요' }, { status:401 })
  const { data, error } = await supabase
    .from('near_miss_reports')
    .select('*, author:user_profiles!author_id(name)')
    .order('incident_date', { ascending: false })
  if (error) return NextResponse.json({ error:error.message }, { status:500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error:'인증 필요' }, { status:401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('company_id,role').eq('id', user.id).single()
  if (!['super_admin','company_admin','manager'].includes(profile?.role ?? ''))
    return NextResponse.json({ error:'권한 없음' }, { status:403 })

  const body = await req.json()
  const year  = new Date().getFullYear()
  const { count } = await supabase
    .from('near_miss_reports')
    .select('*', { count:'exact', head:true })
    .eq('company_id', profile!.company_id)
    .gte('created_at', `${year}-01-01`)

  const docNumber = `아차사고-${year}-${String((count??0)+1).padStart(3,'0')}`

  const { data, error } = await supabase
    .from('near_miss_reports')
    .insert({ ...body, company_id: profile!.company_id, doc_number: docNumber, author_id: user.id })
    .select().single()

  if (error) return NextResponse.json({ error:error.message }, { status:500 })

  // ── 아차사고 → 수시 위험성평가 자동 연계 (활동계획표에 등록) ──
  // 아차사고 발생 → 7일 이내 수시 위험성평가 실시 권고
  try {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)
    await supabase.from('plan_activities').insert({
      company_id:  profile!.company_id,
      title:       `[수시평가 필요] 아차사고 발생 — ${body.incident_location || '현장'} (${docNumber})`,
      category:    'risk',
      due_date:    dueDate.toISOString().slice(0,10),
      priority:    'high',
      link_type:   'near_miss',
      link_id:     data.id,
      status:      'pending',
      description: `아차사고(${docNumber}) 발생에 따른 수시 위험성평가 실시 필요\n` +
                   `사고 개요: ${body.incident_summary || ''}\n` +
                   `지침 제15조제2항: 아차사고가 발생한 경우 수시 위험성평가를 실시하여야 합니다.`,
      author_id:   user.id,
    }).then(() => {})
  } catch (_) { /* 연계 실패는 무시 */ }

  return NextResponse.json({ data }, { status:201 })
}
