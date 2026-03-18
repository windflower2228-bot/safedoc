'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, UsersRound, Loader2, Search, BarChart3 } from 'lucide-react'
import { clsx } from 'clsx'

export default function CommitteeListPage() {
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q,       setQ]       = useState('')

  useEffect(() => {
    fetch('/api/documents/committee')
      .then(r => r.json())
      .then(j => { setItems(j.data ?? []); setLoading(false) })
  }, [])

  const STATUS_CFG: Record<string, string> = {
    draft:     'bg-amber-50 text-amber-700',
    completed: 'bg-green-50 text-green-700',
    archived:  'bg-gray-50 text-gray-500',
  }
  const STATUS_LABEL: Record<string, string> = {
    draft:'작성 중', completed:'완료', archived:'보관',
  }
  const TYPE_LABEL: Record<string, string> = {
    regular:'정기 회의', extraordinary:'임시 회의',
  }

  const filtered = q
    ? items.filter(i => i.meeting_place?.includes(q) || i.doc_number?.includes(q))
    : items

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UsersRound className="w-5 h-5 text-purple-600" />
            안전보건협의체 회의록
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            위험성평가 운영 실적이 의안 1번에 자동 반영됩니다
          </p>
        </div>
        <Link href="/documents/committee/new"
          className="btn-primary text-sm gap-1.5" style={{ background: '#7c3aed' }}>
          <Plus className="w-4 h-4" /> 회의록 작성
        </Link>
      </div>

      <div className="card p-4 mb-4">
        <div className="relative max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="장소, 문서번호 검색..."
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
            <UsersRound className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>안전보건협의체 회의록이 없습니다.</p>
            <Link href="/documents/committee/new"
              className="btn-primary mt-4 text-sm inline-flex" style={{ background: '#7c3aed' }}>
              <Plus className="w-4 h-4" /> 첫 회의록 작성
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['문서번호', '회의 유형', '회의 일자', '장소', '참석인원', '위험성평가 연계', '상태', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                      {TYPE_LABEL[item.meeting_type] ?? item.meeting_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.meeting_date}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.meeting_place}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {(item.members ?? []).length}명
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.source_risk_id
                      ? <div className="flex items-center gap-1 text-xs text-purple-600">
                          <BarChart3 className="w-3 h-3" />
                          <span>{item.source_risk?.title?.slice(0, 12) ?? '연계됨'}</span>
                        </div>
                      : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      STATUS_CFG[item.status] ?? 'bg-gray-50 text-gray-500')}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/documents/committee/${item.id}`}
                      className="text-xs text-blue-600 hover:underline">상세</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
