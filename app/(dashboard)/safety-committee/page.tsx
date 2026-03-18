'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Users2, Loader2, Search } from 'lucide-react'
import { clsx } from 'clsx'

const COMMITTEE_TYPE = {
  safety_committee:  { label:'산업안전보건위원회', color:'text-blue-700',   bg:'bg-blue-50'   },
  labor_management:  { label:'노사협의체',          color:'text-purple-700', bg:'bg-purple-50' },
}
const MEETING_TYPE = { regular:'정기', extraordinary:'임시' }

export default function SafetyCommitteePage() {
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q,       setQ]       = useState('')
  const [tab,     setTab]     = useState<'all'|'safety_committee'|'labor_management'>('all')

  useEffect(() => {
    fetch('/api/safety-committee')
      .then(r => r.json()).then(j => { setItems(j.data ?? []); setLoading(false) })
  }, [])

  const filtered = items.filter(i =>
    (tab === 'all' || i.committee_type === tab) &&
    (!q || i.meeting_place?.includes(q) || i.chairman_name?.includes(q))
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users2 className="w-5 h-5 text-blue-700" />
            산업안전보건위원회 · 노사협의체
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            산안법 제24조(산업안전보건위원회) | 제75조(노사협의체)
          </p>
        </div>
        <Link href="/safety-committee/new"
          className="btn-primary text-sm gap-1.5" style={{ background: '#1d4ed8' }}>
          <Plus className="w-4 h-4" /> 회의록 작성
        </Link>
      </div>

      {/* 법적 안내 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-4 border-blue-100 bg-blue-50/40">
          <div className="text-xs font-semibold text-blue-800 mb-1">산업안전보건위원회</div>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            산안법 제24조 | 상시 100명 이상 사업장<br/>
            분기 1회 이상 정기 개최 | 근로자·사용자 동수 구성
          </p>
        </div>
        <div className="card p-4 border-purple-100 bg-purple-50/40">
          <div className="text-xs font-semibold text-purple-800 mb-1">노사협의체 (도급사업)</div>
          <p className="text-[11px] text-purple-700 leading-relaxed">
            산안법 제75조 | 도급인·수급인 혼재 작업장<br/>
            매월 1회 이상 정기 개최 | 도급인+수급인 대표
          </p>
        </div>
      </div>

      {/* 탭 + 검색 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {[
            { key: 'all',              label: '전체'            },
            { key: 'safety_committee', label: '산업안전보건위원회' },
            { key: 'labor_management', label: '노사협의체'       },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="장소, 의장명 검색..."
            className="input-base pl-9" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            <Users2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>회의록이 없습니다.</p>
            <Link href="/safety-committee/new"
              className="btn-primary mt-4 text-sm inline-flex" style={{ background: '#1d4ed8' }}>
              <Plus className="w-4 h-4" /> 첫 회의록 작성
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['문서번호','구분','회의 유형','회의 일자','장소','의장','참석','상태',''].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => {
                const ct = COMMITTEE_TYPE[item.committee_type as keyof typeof COMMITTEE_TYPE]
                const presentCount = (item.members ?? []).filter((m: any) => m.is_present).length
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs font-mono text-gray-500">{item.doc_number ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', ct?.bg, ct?.color)}>
                        {ct?.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {MEETING_TYPE[item.meeting_type as keyof typeof MEETING_TYPE] ?? item.meeting_type}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">{item.meeting_date}</td>
                    <td className="px-3 py-3 text-xs text-gray-700 font-medium">{item.meeting_place}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{item.chairman_name || '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{presentCount}/{(item.members ?? []).length}명</td>
                    <td className="px-3 py-3">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                        item.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                        {item.status === 'completed' ? '완료' : '작성 중'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/safety-committee/${item.id}`} className="text-xs text-blue-600 hover:underline">상세</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
