'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, ClipboardCheck, Loader2, Search, Link2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { INSPECTION_TYPE_LABEL } from '@/types/inspection'

export default function InspectionListPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch(`/api/documents/inspection?q=${q}`).then(r=>r.json()).then(j=>{setItems(j.data??[]);setLoading(false)})
  }, [q])

  const STATUS_CFG: Record<string,{icon:any;cls:string;label:string}> = {
    draft:     { icon:Clock,          cls:'text-amber-600 bg-amber-50',  label:'작성 중' },
    completed: { icon:CheckCircle2,   cls:'text-green-600 bg-green-50',  label:'완료' },
    archived:  { icon:AlertCircle,    cls:'text-gray-400  bg-gray-50',   label:'보관' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-600"/>순회점검일지
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">위험성평가 연계 자동 생성 또는 직접 작성</p>
        </div>
        <Link href="/documents/inspection/new" className="btn-primary text-sm" style={{background:'#d97706'}}>
          <Plus className="w-4 h-4"/> 순회점검 작성
        </Link>
      </div>
      <div className="card p-4 mb-4">
        <div className="relative max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="점검 구역 검색..." className="input-base pl-9"/>
        </div>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p>순회점검일지가 없습니다.</p>
            <Link href="/documents/inspection/new" className="btn-primary mt-4 text-sm inline-flex" style={{background:'#d97706'}}>
              <Plus className="w-4 h-4"/> 첫 점검 작성하기
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['문서번호','점검 유형','점검 일자','점검 구역','점검자','연계','상태',''].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item=>{
                const sc = STATUS_CFG[item.status]
                const Icon = sc?.icon ?? Clock
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number ?? '—'}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{INSPECTION_TYPE_LABEL[item.inspection_type]??item.inspection_type}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.inspection_date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{item.inspection_area}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.inspector_name}</td>
                    <td className="px-4 py-3 text-center">
                      {item.link_type==='auto_from_risk'
                        ? <span title={item.source_risk?.title}><Link2 className="w-3.5 h-3.5 text-blue-500 mx-auto"/></span>
                        : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', sc?.cls)}>
                        <Icon className="w-3 h-3"/>{sc?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/documents/inspection/${item.id}`} className="text-xs text-blue-600 hover:underline">상세</Link>
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
