'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, MessageSquareQuote } from 'lucide-react'
import { OSH_QNA_ITEMS } from '@/lib/oshCost'

export default function OshCostQnaPage() {
  const [keyword, setKeyword] = useState('')

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return OSH_QNA_ITEMS
    return OSH_QNA_ITEMS.filter((item) => {
      const target = `${item.question} ${item.answer} ${item.basis} ${item.tags.join(' ')}`.toLowerCase()
      return target.includes(q)
    })
  }, [keyword])

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
        <label className="block">
          <span className="text-xs text-gray-500">키워드 검색</span>
          <div className="mt-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              className="w-full text-sm outline-none"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="예: 도급자관급, 인건비, 증빙, 별지1"
            />
          </div>
        </label>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card p-6 text-center text-sm text-gray-400">검색 결과가 없습니다.</div>
        )}
        {filtered.map((item) => (
          <article key={item.id} className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900">{item.question}</h2>
            <p className="text-sm text-gray-700 leading-relaxed mt-2">{item.answer}</p>
            <p className="text-[11px] text-gray-500 mt-2">근거: {item.basis}</p>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {item.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
