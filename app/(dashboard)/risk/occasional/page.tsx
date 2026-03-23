'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, RefreshCw, Plus, Loader2, Search,
  AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react'
import { clsx } from 'clsx'

const OCCASION_TYPES: Record<string, { label: string; desc: string }> = {
  construction_change: { label: '건설물 설치·이전·변경·해체',          desc: '지침 제15조제2항 제1호' },
  equipment_new:       { label: '기계·기구·설비·원재료 신규 도입·변경',  desc: '지침 제15조제2항 제2호' },
  maintenance:         { label: '건설물·기계·기구·설비 정비·보수',       desc: '지침 제15조제2항 제3호' },
  method_change:       { label: '작업방법·절차 신규 도입·변경',          desc: '지침 제15조제2항 제4호' },
  accident:            { label: '중대산업사고·산업재해 발생',             desc: '지침 제15조제2항 제5호' },
  other:               { label: '그 밖에 사업주가 필요하다고 판단한 경우', desc: '지침 제15조제2항 제6호' },
}

const STATUS_CFG = {
  draft:     { label: '작성 중', cls: 'bg-amber-50 text-amber-700' },
  in_review: { label: '검토 중', cls: 'bg-blue-50 text-blue-700' },
  approved:  { label: '승인',    cls: 'bg-green-50 text-green-700' },
  archived:  { label: '보관',    cls: 'bg-gray-50 text-gray-400' },
}

export default function OccasionalRiskPage() {
  const router   = useRouter()
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q,       setQ]       = useState('')

  useEffect(() => {
    fetch('/api/risk/occasional')
      .then(r => r.json()).then(j => { setItems(j.data ?? []); setLoading(false) })
  }, [])

  const filtered = items.filter(i =>
    !q || i.title?.includes(q) || i.work_location?.includes(q)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/risk" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-red-600" />
              수시 위험성평가
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-medium">AI + 수동입력</span>
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              지침 제15조제2항 | 특정 사유 발생 시 작업 착수 전 실시 의무
            </p>
          </div>
        </div>
        <Link href="/risk/occasional/new"
          className="btn-primary text-sm gap-1.5" style={{ background: '#dc2626' }}>
          <Plus className="w-4 h-4" /> 수시평가 작성
        </Link>
      </div>

      {/* 수시평가 사유 안내 */}
      <div className="card p-4 mb-4 border-red-100 bg-red-50/30">
        <div className="text-xs font-semibold text-red-700 mb-2">수시평가 실시 사유 (지침 제15조제2항)</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(OCCASION_TYPES).map(([k, v]) => (
            <div key={k} className="text-[10px] text-red-600 flex items-start gap-1.5">
              <span className="text-red-400 flex-shrink-0 mt-0.5">•</span>
              <div><div>{v.label}</div><div className="text-red-300">{v.desc}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* 검색 */}
      <div className="relative max-w-xs mb-4">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="제목, 위치 검색..." className="input-base pl-9" />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>수시평가 기록이 없습니다.</p>
            <Link href="/risk/occasional/new"
              className="btn-primary mt-4 text-sm inline-flex" style={{ background: '#dc2626' }}>
              <Plus className="w-4 h-4" /> 사진으로 수시평가 작성
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['문서번호','제목','발생 사유','위치','평가일','위험요인','사진','상태',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => {
                const ot  = OCCASION_TYPES[item.occasion_type]
                const sc  = STATUS_CFG[item.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft
                const cnt = (item.risk_items ?? []).length
                const photoCnt = (item.photos ?? []).length
                const highRisk = (item.risk_items ?? []).filter((r: any) => r.risk_level === 'high').length
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{item.title}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{ot?.label ?? item.occasion_type}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.work_location || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.eval_date}</td>
                    <td className="px-4 py-3 text-xs">
                      {highRisk > 0
                        ? <span className="text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>高 {highRisk}건</span>
                        : <span className="text-gray-500">{cnt}건</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{photoCnt}장</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', sc.cls)}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/risk/occasional/${item.id}`} className="text-xs text-blue-600 hover:underline">상세</Link>
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
