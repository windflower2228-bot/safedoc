import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getProfileForAuth } from '@/lib/supabase/auth-profile'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const BUCKET = 'company-assets'

type DocumentListItem = {
  id: string
  title: string
  category: string
  documentNo: string
  memo: string
  createdAt: string
  createdBy: string
}

function getIndexPath(companyId: string): string {
  return `company_${companyId}/document-list/index.json`
}

async function readItems(admin: ReturnType<typeof createAdminClient>, path: string): Promise<DocumentListItem[]> {
  const { data, error } = await admin.storage.from(BUCKET).download(path)
  if (error || !data) return []
  try {
    const raw = await data.text()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item === 'object' && item.id && item.title)
      .map((item) => ({
        id: String(item.id),
        title: String(item.title),
        category: String(item.category ?? '일반'),
        documentNo: String(item.documentNo ?? ''),
        memo: String(item.memo ?? ''),
        createdAt: String(item.createdAt ?? new Date().toISOString()),
        createdBy: String(item.createdBy ?? '사용자'),
      }))
  } catch {
    return []
  }
}

async function writeItems(admin: ReturnType<typeof createAdminClient>, path: string, items: DocumentListItem[]) {
  const payload = Buffer.from(JSON.stringify(items, null, 2), 'utf-8')
  const { error } = await admin.storage.from(BUCKET).upload(path, payload, {
    upsert: true,
    contentType: 'application/json',
  })
  if (error) throw new Error(`문서목록 저장 실패: ${error.message}`)
}

async function getAuth() {
  const supabase = createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: '인증 필요' }, { status: 401 }) }

  const { profile, errorMessage } = await getProfileForAuth<{ company_id: string; name: string }>(
    supabase,
    user.id,
    'company_id, name'
  )
  if (!profile?.company_id) {
    return {
      error: NextResponse.json(
        { error: errorMessage ? `프로필 없음 (${errorMessage})` : '프로필 없음' },
        { status: 403 }
      ),
    }
  }

  return { admin, user, profile }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth()
    if ('error' in auth) return auth.error

    const q = String(req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase()
    const indexPath = getIndexPath(auth.profile.company_id)
    const all = await readItems(auth.admin, indexPath)
    const sorted = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const items = q
      ? sorted.filter((item) => {
          const hay = [item.title, item.category, item.documentNo, item.memo].join(' ').toLowerCase()
          return hay.includes(q)
        })
      : sorted

    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '문서목록표를 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth()
    if ('error' in auth) return auth.error

    const body = await req.json()
    const title = String(body?.title ?? '').trim()
    const category = String(body?.category ?? '일반').trim() || '일반'
    const documentNo = String(body?.documentNo ?? '').trim()
    const memo = String(body?.memo ?? '').trim()
    if (!title) return NextResponse.json({ error: '문서명은 필수입니다.' }, { status: 400 })

    const indexPath = getIndexPath(auth.profile.company_id)
    const current = await readItems(auth.admin, indexPath)
    const item: DocumentListItem = {
      id: randomUUID(),
      title,
      category,
      documentNo,
      memo,
      createdAt: new Date().toISOString(),
      createdBy: auth.profile.name || auth.user.email || '사용자',
    }
    const next = [item, ...current]
    await writeItems(auth.admin, indexPath, next)

    return NextResponse.json({ item }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '문서목록 추가에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuth()
    if ('error' in auth) return auth.error

    const body = await req.json()
    const id = String(body?.id ?? '').trim()
    if (!id) return NextResponse.json({ error: '삭제할 id가 필요합니다.' }, { status: 400 })

    const indexPath = getIndexPath(auth.profile.company_id)
    const current = await readItems(auth.admin, indexPath)
    const next = current.filter((item) => item.id !== id)
    await writeItems(auth.admin, indexPath, next)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '문서목록 삭제에 실패했습니다.' }, { status: 500 })
  }
}
