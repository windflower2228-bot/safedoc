'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, HardHat, Loader2, Search, ArrowLeft } from 'lucide-react'

export default function PpeLedgerPage() {
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q,       setQ]       = useState('')

  useEffect(() => {
    fetch('/api/safety-measures/ppe-ledger')
      .then(r => r.json()).then(j => { setItems(j.data ?? []); setLoading(false) })
  }, [])

  const filtered = items.filter(i =>
    !q || i.worker_name?.includes(q) || i.worker_dept?.includes(q)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/safety-measures" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <HardHat className="w-5 h-5 text-blue-600" />
              보호구 지급대장
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              산안법 제38조 / 안전보건규칙 제32조 | 적격 보호구 지급·관리 의무
            </p>
          </div>
        </div>
        <Link href="/safety-measures/ppe-ledger/new"
          className="btn-primary text-sm gap-1.5" style={{ background: '#2563eb' }}>
          <Plus className="w-4 h-4" /> 지급대장 작성
        </Link>
      </div>

      <div className="card p-4 mb-4 bg-blue-50/40 border-blue-100 text-xs text-blue-700 leading-relaxed rounded-xl">
        안전보건규칙 제32조: 사업주는 다음 각 호의 어느 하나에 해당하는 작업을 하는 근로자에 대해 안전인증·자율안전확인 보호구를 지급하고 착용하도록 해야 합니다. 보호구 지급대장은 3년간 보존해야 합니다.
      </div>

      <div className="relative max-w-xs mb-4">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="성명, 부서 검색..." className="input-base pl-9" />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <HardHat className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>보호구 지급대장이 없습니다.</p>
            <Link href="/safety-measures/ppe-ledger/new"
              className="btn-primary mt-4 text-sm inline-flex" style={{ background: '#2563eb' }}>
              <Plus className="w-4 h-4" /> 작성하기
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['문서번호','지급일','근로자','부서','직위','보호구 수','등록일',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.ledger_date}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.worker_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.worker_dept || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.worker_position || '—'}</td>
                  <td className="px-4 py-3 text-xs text-center">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {(item.ppe_items ?? []).length}종
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/safety-measures/ppe-ledger/${item.id}`}
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
