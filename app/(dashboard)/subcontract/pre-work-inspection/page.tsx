'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Wrench, Loader2, Search, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'
import { MACHINE_TYPES, MACHINE_TYPE_LIST } from '@/types/pre-work-inspection'

export default function PreWorkInspectionPage() {
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q,       setQ]       = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    fetch('/api/subcontract/pre-work-inspection')
      .then(r => r.json()).then(j => { setItems(j.data ?? []); setLoading(false) })
  }, [])

  const filtered = items.filter(i =>
    (typeFilter === 'all' || i.machine_type_code === typeFilter) &&
    (!q || i.machine_name?.includes(q) || i.work_location?.includes(q))
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-600" />
            작업 시작 전 합동안전점검
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            산안법 시행령 제66조 / 시행규칙 제94조 | 기계·기구 소유자와 도급인이 합동으로 실시
          </p>
        </div>
        <Link href="/subcontract/pre-work-inspection/new"
          className="btn-primary text-sm gap-1.5" style={{ background: '#ea580c' }}>
          <Plus className="w-4 h-4" /> 합동안전점검 작성
        </Link>
      </div>

      {/* 법적 근거 */}
      <div className="card p-4 mb-4 border-orange-100 bg-orange-50/40">
        <p className="text-[11px] text-orange-700 leading-relaxed">
          <span className="font-semibold">산안법 시행규칙 제94조 제1호</span> — 도급인은 기계·기구 등을
          소유 또는 대여하는 자와 합동으로 <span className="font-semibold">작업시작 전 안전점검</span>을
          실시하여야 한다. 시행령 제66조에서 정하는 기계·기구(타워크레인, 차량계 건설기계, 항타기·항발기,
          고소작업대, 건설작업용 리프트 등)에 대해 적용되며, 결함 발견 시 즉시 작업을 중지하여야 한다.
        </p>
      </div>

      {/* 기계 유형 필터 */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 flex-wrap">
          <button onClick={() => setTypeFilter('all')}
            className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              typeFilter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
            전체
          </button>
          {MACHINE_TYPE_LIST.filter(m => (m.code as string) !== 'other').map(m => (
            <button key={m.code} onClick={() => setTypeFilter(m.code)}
              className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                typeFilter === m.code ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="기계명, 작업 위치 검색..."
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
            <Wrench className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>합동안전점검 기록이 없습니다.</p>
            <Link href="/subcontract/pre-work-inspection/new"
              className="btn-primary mt-4 text-sm inline-flex" style={{ background: '#ea580c' }}>
              <Plus className="w-4 h-4" /> 첫 점검 작성
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['문서번호','기계 종류','기계명(모델)','작업 위치','점검일','불량','작업중지','상태',''].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => {
                const mt = MACHINE_TYPES[item.machine_type_code as keyof typeof MACHINE_TYPES]
                const failCount = (item.check_items ?? []).filter((c: any) => c.result === 'fail').length
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs font-mono text-gray-500">{item.doc_number ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: mt?.bg ?? '#f9fafb', color: mt?.color ?? '#6b7280' }}>
                        {mt?.label ?? item.machine_type}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900 text-xs">{item.machine_name}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{item.work_location}</td>
                    <td className="px-3 py-3 text-xs text-gray-600">{item.inspection_date}</td>
                    <td className="px-3 py-3">
                      {failCount > 0
                        ? <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertTriangle className="w-3 h-3" />{failCount}건
                          </span>
                        : <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="w-3 h-3" />이상없음
                          </span>}
                    </td>
                    <td className="px-3 py-3">
                      {item.work_stopped
                        ? <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">작업중지</span>
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                        item.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                        {item.status === 'completed' ? '완료' : '작성 중'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/subcontract/pre-work-inspection/${item.id}`}
                        className="text-xs text-blue-600 hover:underline">상세</Link>
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
