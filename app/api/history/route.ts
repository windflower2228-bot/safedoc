import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const doc_id = searchParams.get('doc_id'), doc_type = searchParams.get('doc_type')
  let query = supabase.from('document_versions')
    .select('id,doc_type,doc_id,doc_number,version,change_summary,created_at,author:user_profiles!author_id(name)')
    .order('version', { ascending: false })
  if (doc_id) query = query.eq('doc_id', doc_id)
  if (doc_type) query = query.eq('doc_type', doc_type)
  const { data, error } = await query.limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
