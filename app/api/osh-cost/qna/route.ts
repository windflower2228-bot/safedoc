import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

type OshQnaRecord = {
  id: string
  number: string
  title: string
  institution: string
  questionDate: string
  answerDate: string
  question: string
  answer: string
  tags: string[]
  source: string
}

type OshQnaResponse = {
  total: number
  page: number
  pageSize: number
  totalPages: number
  institutions: string[]
  items: OshQnaRecord[]
}

let cache: OshQnaRecord[] | null = null

async function loadQnaData(): Promise<OshQnaRecord[]> {
  if (cache) return cache
  const filePath = path.join(process.cwd(), 'data', 'osh-qna.json')
  const raw = await readFile(filePath, 'utf-8')
  cache = JSON.parse(raw) as OshQnaRecord[]
  return cache
}

function toPositiveInt(value: string | null, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.floor(n)
}

export async function GET(req: NextRequest) {
  try {
    const all = await loadQnaData()
    const searchParams = req.nextUrl.searchParams

    const q = (searchParams.get('q') ?? '').trim().toLowerCase()
    const institution = (searchParams.get('institution') ?? '').trim().toLowerCase()
    const page = toPositiveInt(searchParams.get('page'), 1)
    const pageSize = Math.min(50, toPositiveInt(searchParams.get('pageSize'), 20))

    let filtered = all

    if (q) {
      filtered = filtered.filter((item) => {
        const haystack = [item.title, item.question, item.answer, item.institution, item.tags.join(' ')].join(' ').toLowerCase()
        return haystack.includes(q)
      })
    }

    if (institution) {
      filtered = filtered.filter((item) => item.institution.toLowerCase().includes(institution))
    }

    filtered = [...filtered].sort((a, b) => (b.answerDate || '').localeCompare(a.answerDate || ''))

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
