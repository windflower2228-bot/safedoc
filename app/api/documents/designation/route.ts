// app/api/documents/designation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generateDocNumber } from '@/types/designation'

const createDesignationSchema = z.object({
  project_id:       z.string().uuid().optional(),
  doc_type:         z.enum(['designation', 'appointment']),
  role_id:          z.string().min(1),
  role_label:       z.string().min(1, '직위명을 입력해주세요'),
  person_name:      z.string().min(1, '피지정자 성명을 입력해주세요'),
  person_id_last4:  z.string().max(8).optional(),
  person_address:   z.string().optional(),
  person_dept:      z.string().optional(),
  person_position:  z.string().min(1, '현재 직위를 입력해주세요'),
  legal_basis:      z.string().min(1, '법적 근거를 입력해주세요'),
  duties:           z.array(z.string()).min(1, '직무를 1개 이상 입력해주세요'),
  effective_date:   z.string().min(1, '지정 효력 발생일을 입력해주세요'),
  expiry_date:      z.string().optional(),
  work_scope:       z.string().optional(),
  issuer_name:      z.string().min(1, '지정권자 성명을 입력해주세요'),
  issuer_position:  z.string().min(1, '지정권자 직위를 입력해주세요'),
  issuer_company:   z.string().min(1, '지정권자 소속을 입력해주세요'),
})

// ─── GET /api/documents/designation ──────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page     = Number(searchParams.get('page')     ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 20)
  const q        = searchParams.get('q')
  const docType  = searchParams.get('doc_type')
  const status   = searchParams.get('status')

  let query = supabase
    .from('designations')
    .select(`
      id, doc_type, role_label, doc_number,
      person_name, person_position, person_dept,
      effective_date, expiry_date, status,
      created_at, updated_at,
      author:user_profiles!author_id(name),
      project:projects(site_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (q)       query = query.or(`person_name.ilike.%${q}%,role_label.ilike.%${q}%`)
  if (docType) query = query.eq('doc_type', docType)
  if (status)  query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize })
}

// ─── POST /api/documents/designation ─────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, role, name, position')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: '프로필 없음' }, { status: 403 })
  if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: '작성 권한이 없습니다.' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = createDesignationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력값 오류', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // 이번 연도 같은 role_id 문서 수 조회 → 채번
  const year = new Date().getFullYear()
  const { count: seqCount } = await supabase
    .from('designations')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .eq('role_id', parsed.data.role_id)
    .gte('created_at', `${year}-01-01`)

  const docNumber = generateDocNumber(
    parsed.data.doc_type,
    parsed.data.role_id,
    year,
    (seqCount ?? 0) + 1
  )

  const d = parsed.data
  const { data: designation, error } = await supabase
    .from('designations')
    .insert({
      company_id:      profile.company_id,
      project_id:      d.project_id ?? null,
      doc_type:        d.doc_type,
      role_id:         d.role_id,
      role_label:      d.role_label,
      doc_number:      docNumber,
      person_name:     d.person_name,
      person_id_last4: d.person_id_last4 ?? null,
      person_address:  d.person_address ?? null,
      person_dept:     d.person_dept ?? null,
      person_position: d.person_position,
      legal_basis:     d.legal_basis,
      duties:          d.duties,
      effective_date:  d.effective_date,
      expiry_date:     d.expiry_date ?? null,
      work_scope:      d.work_scope ?? null,
      issuer_name:     d.issuer_name,
      issuer_position: d.issuer_position,
      issuer_company:  d.issuer_company,
      status:          'active',
      author_id:       user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: designation }, { status: 201 })
}
