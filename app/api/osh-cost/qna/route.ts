import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getProfileForAuth } from '@/lib/supabase/auth-profile'
import {
  createUserQnaPost,
  listUserQnaPosts,
  loadStaticQnaData,
  toPositiveInt,
  type OshQnaRecord,
} from '@/lib/oshQnaBoard'

type OshQnaResponse = {
  total: number
  page: number
  pageSize: number
  totalPages: number
  institutions: string[]
  items: OshQnaRecord[]
}

function sortByDateDesc(items: OshQnaRecord[]): OshQnaRecord[] {
  return [...items].sort((a, b) => {
    const aDate = a.answerDate || a.questionDate || a.createdAt || ''
    const bDate = b.answerDate || b.questionDate || b.createdAt || ''
    return bDate.localeCompare(aDate)
  })
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10)
}

export async function GET(req: NextRequest) {
  try {
    const staticPosts = await loadStaticQnaData()
    let uploadPosts: OshQnaRecord[] = []

    const supabase = createClient()
    const admin = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { profile } = await getProfileForAuth<{ company_id: string }>(
        supabase,
        user.id,
        'company_id'
      )
      if (profile?.company_id) {
        uploadPosts = await listUserQnaPosts(admin as any, profile.company_id)
      }
    }

    const all = sortByDateDesc([...uploadPosts, ...staticPosts])
    const searchParams = req.nextUrl.searchParams

    const q = (searchParams.get('q') ?? '').trim().toLowerCase()
    const institution = (searchParams.get('institution') ?? '').trim().toLowerCase()
    const page = toPositiveInt(searchParams.get('page'), 1)
    const pageSize = Math.min(50, toPositiveInt(searchParams.get('pageSize'), 20))

    let filtered = all

    if (q) {
      filtered = filtered.filter((item) => {
        const haystack = [
          item.title,
          item.question,
          item.answer,
          item.institution,
          item.tags.join(' '),
          item.source,
        ].join(' ').toLowerCase()
        return haystack.includes(q)
      })
    }

    if (institution) {
      filtered = filtered.filter((item) => item.institution.toLowerCase().includes(institution))
    }

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    const institutions = Array.from(new Set(all.map((item) => item.institution).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ko'))

    const payload: OshQnaResponse = {
      total,
      page: safePage,
      pageSize,
      totalPages,
      institutions,
      items,
    }

    return NextResponse.json(payload)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '질의회시 데이터를 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const admin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { profile, errorMessage } = await getProfileForAuth<{ company_id: string; name: string }>(
      supabase,
      user.id,
      'company_id, name'
    )

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: errorMessage ? `프로필 없음 (${errorMessage})` : '프로필 없음' },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const title = String(formData.get('title') ?? '').trim()
    const question = String(formData.get('question') ?? '').trim()
    const answer = String(formData.get('answer') ?? '').trim()
    const tagsRaw = String(formData.get('tags') ?? '')
    const fileValue = formData.get('file')
    const file = fileValue instanceof File ? fileValue : null

    if (!title) {
      return NextResponse.json({ error: '제목은 필수입니다.' }, { status: 400 })
    }

    if (!question && !answer && !file) {
      return NextResponse.json({ error: '질의/회시 또는 첨부파일 중 1개 이상 입력해 주세요.' }, { status: 400 })
    }

    const post = await createUserQnaPost({
      admin: admin as any,
      companyId: profile.company_id,
      authorId: user.id,
      authorName: profile.name || user.email || '사용자',
      title,
      question,
      answer,
      tags: parseTags(tagsRaw),
      file,
    })

    return NextResponse.json({ data: post }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '업로드에 실패했습니다.' }, { status: 500 })
  }
}
