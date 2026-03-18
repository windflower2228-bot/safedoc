import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SAFETY_INSPECTION_TYPES } from '@/types/hazardous-machinery'
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('company_id,role').eq('id',user.id).single()
  if (!['super_admin','company_admin','manager'].includes(profile?.role??'')) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  // 이미 있는 것 조회
  const { data: existing } = await supabase.from('safety_inspections').select('machine_type').eq('company_id',profile!.company_id)
  const existingTypes = new Set((existing??[]).map((e:any)=>e.machine_type))
  const toInsert = SAFETY_INSPECTION_TYPES.filter(t => !existingTypes.has(t.code)).map(t => ({
    company_id:        profile!.company_id,
    machine_type:      t.code,
    machine_name:      t.label,
    is_applicable:     true,
    inspection_cycle:  t.cycleLabel,
    inspection_status: 'pending',
    inspection_records:[],
    author_id:         user.id,
  }))
  if (toInsert.length > 0) {
    await supabase.from('safety_inspections').insert(toInsert)
  }
  return NextResponse.json({ created: toInsert.length })
}
