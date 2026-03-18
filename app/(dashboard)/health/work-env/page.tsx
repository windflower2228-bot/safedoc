'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Activity, Loader2, ArrowLeft, FileText, Search, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'

const RESULT_CFG: Record<string,{label:string;cls:string}> = {
  normal:  { label:'정상',    cls:'bg-green-50 text-green-700'  },
  warning: { label:'주의',    cls:'bg-amber-50 text-amber-700'  },
  exceed:  { label:'기준초과', cls:'bg-red-50 text-red-700'     },
  na:      { label:'해당없음', cls:'bg-gray-50 text-gray-500'   },
}

export default function WorkEnvPage() {
  const [items, setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health/work-env').then(r=>r.json())
      .then(j=>{ setItems(j.data??[]); setLoading(false) })
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/health" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600"/>작업환경측정
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">산안법 제125조 | 반기 1회 이상 | 측정결과 보고 및 조치</p>
          </div>
        </div>
        <Link href="/health/work-env/new" className="btn-primary text-sm gap-1.5" style={{background:'#16a34a'}}>
          <Plus className="w-4 h-4"/> 측정결과 등록
        </Link>
      </div>

      <div className="card p-4 mb-4" style={{background:'#f0fdf4',borderColor:'#bbf7d0'}}>
        <p className="text-xs text-green-700 leading-relaxed">
          상시 근로자 1명 이상 사업장 | 소음·분진·화학물질·금속류 등 유해인자 측정 | 측정 결과에 따라 작업환경 개선 조치 실시
        </p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p>작업환경측정 결과가 없습니다.</p>
            <Link href="/health/work-env/new" className="btn-primary mt-4 text-sm inline-flex" style={{background:'#16a34a'}}>
              <Plus className="w-4 h-4"/> 측정결과 등록
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['문서번호','측정일','작업공정','유해인자','측정기관','결과','상태'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => {
                const rc = RESULT_CFG[item.overall_result] ?? RESULT_CFG.na
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number??'—'}</td>
                    <td className="px-4 py-3 text-xs">{item.measurement_date}</td>
                    <td className="px-4 py-3 font-medium">{item.work_process}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{(item.harmful_factors??[]).length}종</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.agency_name||'—'}</td>
                    <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',rc.cls)}>{rc.label}</span></td>
                    <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',item.status==='completed'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700')}>{item.status==='completed'?'완료':'작성 중'}</span></td>
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
