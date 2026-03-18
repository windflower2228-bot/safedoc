// app/api/documents/msds/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const msdsSchema = z.object({
  product_name:     z.string().min(1, '제품명을 입력해주세요'),
  product_code:     z.string().optional(),
  cas_number:       z.string().optional(),
  un_number:        z.string().optional(),
  manufacturer:     z.string().optional(),
  ghs_hazards:      z.array(z.string()).default([]),
  signal_word:      z.enum(['danger','warning']).optional(),
  hazard_statements:       z.array(z.string()).default([]),
  precautionary_statements: z.array(z.string()).default([]),
  main_components:  z.string().optional(),
  first_aid_eye:    z.string().optional(),
  first_aid_skin:   z.string().optional(),
  first_aid_inhale: z.string().optional(),
  first_aid_ingest: z.string().optional(),
  fire_fighting:    z.string().optional(),
  spill_handling:   z.string().optional(),
  handling_storage: z.string().optional(),
  exposure_limit:   z.string().optional(),
  ppe_required:     z.string().optional(),
  revision_date:    z.string().optional(),
  is_public:        z.boolean().default(false),
  file_url:         z.string().optional(),
  file_name:        z.string().optional(),
})

// ─── GET /api/documents/msds ─────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page     = Number(searchParams.get('page')     ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 30)
  const q        = searchParams.get('q')
  const isPublic = searchParams.get('is_public')

  // RLS 정책상 같은 회사 + is_public=true 모두 조회
  let query = supabase
    .from('msds_records')
    .select(`
      id, product_name, product_code, cas_number,
      manufacturer, ghs_hazards, signal_word,
      is_public, status, revision_date,
      file_name, created_at, updated_at,
      author:user_profiles!author_id(name)
    `, { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (q)        query = query.ilike('product_name', `%${q}%`)
  if (isPublic === 'true') query = query.eq('is_public', true)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize })
}

// ─── POST /api/documents/msds ────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: '프로필 없음' }, { status: 403 })
  if (!['super_admin','company_admin','manager'].includes(profile.role)) {
    return NextResponse.json({ error: '등록 권한이 없습니다.' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = msdsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값 오류', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const { data: msds, error } = await supabase
    .from('msds_records')
    .insert({
      company_id:       profile.company_id,
      ...d,
      signal_word:      d.signal_word ?? null,
      revision_date:    d.revision_date ?? null,
      author_id:        user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: msds }, { status: 201 })
}
