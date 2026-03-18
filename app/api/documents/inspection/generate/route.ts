import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInspectionFromRisk } from '@/lib/linkage/riskToInspection'
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { risk_id, ...opts } = await req.json()
  if (!risk_id) return NextResponse.json({ error: 'risk_id 필수' }, { status: 400 })
  const { data: ra } = await supabase.from('risk_assessments').select('*,items:risk_items(*),project:projects(name,site_name),author:user_profiles!author_id(name,position)').eq('id',risk_id).single()
  if (!ra) return NextResponse.json({ error: '위험성평가 없음' }, { status: 404 })
  const draft = generateInspectionFromRisk(ra as any, opts)
  return NextResponse.json({ data: draft })
}
