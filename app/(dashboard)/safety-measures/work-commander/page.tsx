'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Users, ArrowLeft, Loader2, CheckCircle2, Clock } from 'lucide-react'
import { clsx } from 'clsx'

const TYPE_CFG: Record<string,{label:string;color:string;bg:string;legalRef:string}> = {
  work_director: { label:'작업지휘자', color:'#2563eb', bg:'#eff6ff', legalRef:'안전보건규칙 제35조' },
  signal_person:  { label:'신호수',    color:'#7c3aed', bg:'#f5f3ff', legalRef:'안전보건규칙 제40조' },
  fire_watcher:   { label:'화재감시자', color:'#dc2626', bg:'#fef2f2', legalRef:'안전보건규칙 제241조' },
}
export default function WorkCommanderPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/safety-measures/work-commander').then(r=>r.json()).then(j=>{setItems(j.data??[]);setLoading(false)}) }, [])
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/safety-measures" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div><h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-5 h-5 text-purple-600"/>작업지휘자·신호수·화재감시자 지정서</h1>
            <p className="text-sm text-gray-400 mt-0.5">안전보건규칙 제35조·제40조·제241조 | 지정서 3종</p></div>
        </div>
        <Link href="/safety-measures/work-commander/new" className="btn-primary text-sm gap-1.5" style={{background:'#7c3aed'}}>
          <Plus className="w-4 h-4"/> 지정서 작성
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {Object.entries(TYPE_CFG).map(([k,v]) => (
          <div key={k} className="card p-3 flex items-center gap-3" style={{background:v.bg,borderColor:v.color+'20'}}>
            <div><div className="text-lg font-bold" style={{color:v.color}}>{items.filter(i=>i.commander_type===k).length}</div>
              <div className="text-[10px] text-gray-400">{v.label}</div></div>
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        : items.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p>지정서가 없습니다.</p>
            <Link href="/safety-measures/work-commander/new" className="btn-primary mt-4 text-sm inline-flex" style={{background:'#7c3aed'}}>
              <Plus className="w-4 h-4"/> 작성하기
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-200">
            {['종류','작업 종류','성명','소속','작업위치','지정일','상태'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item=>{
              const tc=TYPE_CFG[item.commander_type]
              return <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:tc?.bg,color:tc?.color}}>{tc?.label}</span></td>
                <td className="px-4 py-3 text-xs text-gray-700">{item.work_type}</td>
                <td className="px-4 py-3 font-medium">{item.person_name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.person_affiliation||'—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.work_location||'—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{item.effective_date}</td>
                <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',item.status==='active'?'bg-green-50 text-green-700':'bg-gray-50 text-gray-500')}>{item.status==='active'?'유효':'만료'}</span></td>
              </tr>
            })}
          </tbody></table>
        )}
      </div>
    </div>
  )
}
