'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Stethoscope, Loader2, ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'

const RESULT_CFG: Record<string,{label:string;cls:string}> = {
  normal:     { label:'정상',     cls:'bg-green-50 text-green-700'  },
  observation:{ label:'요관찰',   cls:'bg-amber-50 text-amber-700'  },
  action:     { label:'요조치',   cls:'bg-red-50 text-red-700'      },
  change:     { label:'직업변경', cls:'bg-orange-50 text-orange-700'},
  suspend:    { label:'작업중지', cls:'bg-red-100 text-red-800'     },
}

export default function HealthCheckPage() {
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health/health-check?type=general')
      .then(r=>r.json()).then(j=>{ setItems(j.data??[]); setLoading(false) })
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/health" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5" style={{color:'#2563eb'}}/>일반건강진단
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">산안법 제129조 | 사무직 2년 1회 · 비사무직 1년 1회</p>
          </div>
        </div>
        <Link href="/health/health-check-general/new" className="btn-primary text-sm gap-1.5" style={{background:'#2563eb'}}>
          <Plus className="w-4 h-4"/> 진단결과 등록
        </Link>
      </div>
      <div className="card p-4 mb-4" style={{background:'#eff6ff',borderColor:'#2563eb20'}}>
        <p className="text-xs leading-relaxed" style={{color:'#2563eb'}}>상시 사용하는 근로자의 건강관리를 위해 실시 | 사무직 종사 근로자: 2년에 1회 이상 | 그 외 근로자: 1년에 1회 이상</p>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p>건강진단 결과가 없습니다.</p>
            <Link href="/health/health-check-general/new" className="btn-primary mt-4 text-sm inline-flex" style={{background:'#2563eb'}}>
              <Plus className="w-4 h-4"/> 진단결과 등록
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['문서번호','진단일','진단기관','대상인원','완료인원','결과','상태'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item=>(
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number??'—'}</td>
                  <td className="px-4 py-3 text-xs">{item.check_date}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.agency_name||'—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.target_count}명</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.completed_count}명</td>
                  <td className="px-4 py-3">
                    {(item.records??[]).some((r:any)=>r.result==='action'||r.result==='suspend')
                      ? <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">요조치 있음</span>
                      : <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">이상 없음</span>}
                  </td>
                  <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',item.status==='completed'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700')}>{item.status==='completed'?'완료':'작성 중'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
