// app/api/documents/msds/[id]/special-log/route.ts
// 특별관리물질 취급일지 (안전보건규칙 제439조) CRUD

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('special_substance_logs')
    .select('*, author:user_profiles!author_id(name)')
    .eq('msds_id', params.id)
    .order('work_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('company_id,role').eq('id', user.id).single()
  if (!['super_admin','company_admin','manager'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('special_substance_logs')
    .insert({ ...body, msds_id: params.id, company_id: profile!.company_id, author_id: user.id })
    .select('*, author:user_profiles!author_id(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
