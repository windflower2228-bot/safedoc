'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, ScrollText, Loader2, FileText } from 'lucide-react'
import { clsx } from 'clsx'

export default function SafetyRegulationPage() {
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/safety-regulation')
      .then(r => r.json()).then(j => { setItems(j.data ?? []); setLoading(false) })
  }, [])

  const STATUS_CFG: Record<string,{label:string;cls:string}> = {
    draft:      { label:'초안',    cls:'bg-amber-50  text-amber-700'  },
    active:     { label:'시행 중', cls:'bg-green-50  text-green-700'  },
    superseded: { label:'구버전',  cls:'bg-gray-100  text-gray-500'   },
    archived:   { label:'보관',    cls:'bg-gray-50   text-gray-400'   },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-indigo-700" />
            안전보건관리규정
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            산안법 제25조(안전보건관리규정의 작성) | 상시 100명 이상 사업장
          </p>
        </div>
        <Link href="/safety-regulation/new"
          className="btn-primary text-sm gap-1.5" style={{ background: '#4338ca' }}>
          <Plus className="w-4 h-4" /> 규정 작성
        </Link>
      </div>

      {/* 법적 안내 */}
      <div className="card p-4 mb-4 border-indigo-100 bg-indigo-50/40">
        <p className="text-[11px] text-indigo-700 leading-relaxed">
          <span className="font-semibold">산안법 제25조 · 제26조</span> | 상시 근로자 100명 이상 사업장은 산업안전보건관리규정을 작성하여 각 작업장에 게시하거나 갖춰 두어야 하며, 변경할 필요가 생긴 경우 산업안전보건위원회의 심의·의결을 거쳐야 합니다.
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] text-indigo-600">
          {['안전보건 목표·경영방침','안전보건 조직·직무','안전보건교육','위험기계·기구 관리','위험 작업환경 관리','산업재해 조사·예방','안전보건관련 문서 관리','비상시 조치 기준'].map(item => (
            <div key={item} className="flex items-start gap-1"><span>✓</span><span>{item}</span></div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>안전보건관리규정이 없습니다.</p>
            <Link href="/safety-regulation/new"
              className="btn-primary mt-4 text-sm inline-flex" style={{ background: '#4338ca' }}>
              <Plus className="w-4 h-4" /> 규정 작성하기
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['문서번호','제목','버전','시행일','개정 사유','승인자','상태',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => {
                const sc = STATUS_CFG[item.status] ?? STATUS_CFG.draft
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.title}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">v{item.version}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.effective_date}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">{item.revision_reason || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.approver_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', sc.cls)}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/safety-regulation/${item.id}`} className="text-xs text-blue-600 hover:underline">상세</Link>
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
