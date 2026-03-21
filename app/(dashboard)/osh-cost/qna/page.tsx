'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, MessageSquareQuote, Building2, CalendarDays } from 'lucide-react'

type QnaItem = {
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

type QnaResponse = {
  total: number
  page: number
  pageSize: number
  totalPages: number
  institutions: string[]
  items: QnaItem[]
}

const PAGE_SIZE = 20

export default function OshCostQnaPage() {
  const [keyword, setKeyword] = useState('')
  const [institution, setInstitution] = useState('')
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<QnaResponse | null>(null)

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          q: keyword,
          institution,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        })
        const res = await fetch(`/api/osh-cost/qna?${params.toString()}`)
        if (!res.ok) throw new Error('질의회시 데이터를 불러오지 못했습니다.')
        const json = (await res.json()) as QnaResponse
        setData(json)
      } catch (e: any) {
        setError(e?.message ?? '오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(t)
  }, [keyword, institution, page])

  useEffect(() => {
    setPage(1)
  }, [keyword, institution])

  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Link href="/osh-cost" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquareQuote className="w-5 h-5 text-violet-600" />
          산업안전보건관리비 질의회시 검색
        </h1>
      </div>

      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-500">키워드 검색</span>
            <div className="mt-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                className="w-full text-sm outline-none"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 요율, 계상, 정산, 교육비, 출장여비"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">기관 필터</span>
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            >
              <option value="">전체 기관</option>
              {(data?.institutions ?? []).map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          첨부 파일 기준 질의회시 데이터 <b>{total.toLocaleString()}건</b> 검색 결과
        </div>
      </div>

      {error && <div className="card p-4 mb-4 text-sm text-rose-600">{error}</div>}
      {loading && <div className="card p-4 mb-4 text-sm text-gray-500">검색 중입니다...</div>}

      <div className="space-y-3">
        {!loading && (data?.items ?? []).length === 0 && (
          <div className="card p-6 text-center text-sm text-gray-400">검색 결과가 없습니다.</div>
        )}

        {(data?.items ?? []).map((item) => (
          <article key={item.id} className="card p-5">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-semibold">
                No.{item.number || '-'}
              </span>
              {item.tags.map((tag) => (
                <span key={`${item.id}-${tag}`} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {tag}
                </span>
              ))}
            </div>

            <h2 className="text-sm font-semibold text-gray-900">{item.title}</h2>

            <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {item.institution || '기관 정보 없음'}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                질의 {item.questionDate || '-'} / 회신 {item.answerDate || '-'}
              </span>
            </div>

            <div className="mt-3 space-y-2 text-sm leading-relaxed">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">질의</p>
                <p className="text-gray-800 whitespace-pre-line">{item.question}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">회시</p>
                <p className="text-gray-700 whitespace-pre-line">{item.answer}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!loading && totalPages > 1 && (
        <div className="card p-4 mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40"
          >
            이전
          </button>
          <p className="text-xs text-gray-500">
            {page} / {totalPages} 페이지
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
