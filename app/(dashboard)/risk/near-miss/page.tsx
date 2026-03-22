'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Lightbulb, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

export default function NearMissPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/risk/near-miss').then(r=>r.json()).then(j=>{setItems(j.data??[]);setLoading(false)}) }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/risk" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-600"/>아차사고 보고</h1>
            <p className="text-sm text-gray-400 mt-0.5">지침 제5조의2제2항 | 부상으로 이어질 뻔한 상황 → 수시 위험성평가 연계</p>
          </div>
        </div>
        <Link href="/risk/near-miss/new" className="btn-primary text-sm gap-1.5" style={{background:'#d97706'}}><Plus className="w-4 h-4"/>아차사고 보고</Link>
      </div>
      <div className="card p-4 mb-4 bg-amber-50/30 border-amber-100 text-xs text-amber-700">
        지침 제5조의2제2항: 사업주는 사업장 내 부상 또는 질병으로 이어질 가능성이 있었던 상황(아차사고)을 확인한 경우, 해당 사고를 일으킨 유해·위험요인을 <strong>위험성평가의 대상에 포함</strong>시켜야 합니다.
      </div>
      <div className="card overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        : items.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p>아차사고 보고가 없습니다.</p>
            <Link href="/risk/near-miss/new" className="btn-primary mt-4 text-sm inline-flex" style={{background:'#d97706'}}><Plus className="w-4 h-4"/>보고하기</Link>
          </div>
        ) : (
          <table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-200">
            {['문서번호','발생일','장소','내용','위험성평가 연계','상태',''].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item=>(
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number??'—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{item.incident_date}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.location||'—'}</td>
                <td className="px-4 py-3 text-xs text-gray-800 max-w-[200px] truncate">{item.description}</td>
                <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',item.linked_to_risk?'bg-green-50 text-green-700':'bg-gray-50 text-gray-400')}>{item.linked_to_risk?'연계됨':'미연계'}</span></td>
                <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',item.status==='closed'?'bg-green-50 text-green-700':item.status==='in_review'?'bg-blue-50 text-blue-700':'bg-red-50 text-red-700')}>{item.status==='closed'?'완료':item.status==='in_review'?'검토 중':'미결'}</span></td>
                <td className="px-4 py-3"><Link href={`/risk/near-miss/${item.id}`} className="text-xs text-blue-600 hover:underline">상세</Link></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
    </div>
  )
}
