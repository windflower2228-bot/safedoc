'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  ClipboardCheck,
  Loader2,
  Search,
  Link2,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileSpreadsheet,
} from 'lucide-react'
import { clsx } from 'clsx'
import { WORK_PLAN_TYPE_LABELS } from '@/types/workplan'

type WorkPlanRow = {
  id: string
  title: string
  plan_type: keyof typeof WORK_PLAN_TYPE_LABELS
  work_location: string
  work_start_date: string
  work_end_date: string
  status: 'draft' | 'approved' | 'archived'
  link_type: 'auto_from_risk' | 'manual'
  supervisor_name?: string | null
  source_risk?: { title?: string | null } | null
}

export default function WorkPlanListPage() {
  const [items, setItems] = useState<WorkPlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/documents/workplan?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((j) => {
        setItems(j.data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [q])

  const STATUS_CFG: Record<WorkPlanRow['status'], { icon: any; cls: string; label: string }> = {
    draft: { icon: Clock, cls: 'text-amber-600 bg-amber-50', label: '작성 중' },
    approved: { icon: CheckCircle2, cls: 'text-green-600 bg-green-50', label: '승인' },
    archived: { icon: AlertCircle, cls: 'text-gray-400 bg-gray-50', label: '보관' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-green-600" />
            사전조사 및 작업계획서
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">위험성평가 연계 자동생성 또는 직접 작성</p>
        </div>
        <Link href="/documents/workplan/new" className="btn-primary text-sm" style={{ background: '#16a34a' }}>
          <Plus className="w-4 h-4" /> 작업계획서 작성
        </Link>
      </div>

      <div className="card p-4 mb-4">
        <div className="relative max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="작업계획서 제목 검색..."
            className="input-base pl-9"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>작성된 작업계획서가 없습니다.</p>
            <Link href="/documents/workplan/new" className="btn-primary mt-4 text-sm inline-flex" style={{ background: '#16a34a' }}>
              <Plus className="w-4 h-4" /> 첫 작업계획서 작성하기
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['문서명', '작업 종류', '작업 기간', '작업 장소', '연계', '상태', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const sc = STATUS_CFG[item.status] ?? STATUS_CFG.draft
                const Icon = sc.icon
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-400">{item.supervisor_name || '담당자 미입력'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {WORK_PLAN_TYPE_LABELS[item.plan_type] ?? item.plan_type}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {item.work_start_date} ~ {item.work_end_date}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.work_location}</td>
                    <td className="px-4 py-3 text-center">
                      {item.link_type === 'auto_from_risk' ? (
                        <span className="inline-flex items-center gap-1 text-blue-600 text-xs" title={item.source_risk?.title ?? ''}>
                          <Link2 className="w-3.5 h-3.5" /> 연계
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', sc.cls)}>
                        <Icon className="w-3 h-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/documents/workplan/${item.id}`} className="text-xs text-blue-600 hover:underline">
                          상세
                        </Link>
                        <Link
                          href={`/api/export/workplan/${item.id}`}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="엑셀 출력"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </Link>
                      </div>
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
