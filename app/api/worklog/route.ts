// app/api/worklog/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const p = Number(new URL(req.url).searchParams.get('page')??1), ps=20
  const { data, count, error } = await supabase
    .from('worklog_analyses')
    .select('id,upload_date,file_name,detected_worktypes,summary,created_at,author:user_profiles!author_id(name)', { count:'exact' })
    .order('upload_date', { ascending:false })
    .range((p-1)*ps, p*ps-1)
  if (error) return NextResponse.json({ error: error.message }, { status:500 })
  return NextResponse.json({ data, count })
}
