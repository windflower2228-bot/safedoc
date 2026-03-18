import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
type P = { params: { id: string } }
export async function GET(_: NextRequest, { params }: P) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data, error } = await supabase.from('document_versions').select('*,author:user_profiles!author_id(name)').eq('id',params.id).single()
  if (error||!data) return NextResponse.json({ error: '버전 없음' }, { status: 404 })
  return NextResponse.json({ data })
}
