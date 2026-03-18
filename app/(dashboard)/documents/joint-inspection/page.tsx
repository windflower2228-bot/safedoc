'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Shield, Loader2, Search, Link2, CheckCircle2, Clock } from 'lucide-react'
import { clsx } from 'clsx'

export default function JointInspectionListPage() {
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q,       setQ]       = useState('')

  useEffect(() => {
    fetch(`/api/documents/joint-inspection`)
      .then(r => r.json())
      .then(j => { setItems(j.data ?? []); setLoading(false) })
  }, [])

  const STATUS_CFG: Record<string, { cls: string; label: string }> = {
    draft:     { cls: 'bg-amber-50 text-amber-700',  label: '작성 중' },
    completed: { cls: 'bg-green-50 text-green-700',  label: '완료'    },
    archived:  { cls: 'bg-gray-50  text-gray-500',   label: '보관'    },
  }

  const filtered = q
    ? items.filter(i => i.inspection_area?.includes(q) || i.doc_number?.includes(q))
    : items

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-600" />
            합동안전보건점검
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            위험성평가 연계 + 위험성평가 운영 실적 자동 반영
          </p>
        </div>
        <Link href="/documents/joint-inspection/new"
          className="btn-primary text-sm gap-1.5" style={{ background: '#ea580c' }}>
          <Plus className="w-4 h-4" /> 합동점검 작성
        </Link>
      </div>

      <div className="card p-4 mb-4">
        <div className="relative max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="점검 구역, 문서번호 검색..."
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
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>합동안전보건점검 기록이 없습니다.</p>
            <Link href="/documents/joint-inspection/new"
              className="btn-primary mt-4 text-sm inline-flex" style={{ background: '#ea580c' }}>
              <Plus className="w-4 h-4" /> 첫 합동점검 작성
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['문서번호', '점검 일자', '점검 구역', '참여 인원', '연계', '개선사항', '상태', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => {
                const sc = STATUS_CFG[item.status] ?? STATUS_CFG.draft
                const participants = item.participants ?? []
                const improvements = item.improvement_items ?? []
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {item.doc_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.inspection_date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.inspection_area}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{participants.length}명</td>
                    <td className="px-4 py-3 text-center">
                      {item.link_type === 'auto_from_risk'
                        ? <span title={item.source_risk?.title}>
                            <Link2 className="w-3.5 h-3.5 text-blue-500 mx-auto" />
                          </span>
                        : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {improvements.filter((i: any) => !i.is_done).length > 0
                        ? <span className="text-amber-600 font-medium">
                            미완료 {improvements.filter((i: any) => !i.is_done).length}건
                          </span>
                        : improvements.length > 0
                        ? <span className="text-green-600">완료</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', sc.cls)}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/documents/joint-inspection/${item.id}`}
                        className="text-xs text-blue-600 hover:underline">
                        상세
                      </Link>
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
