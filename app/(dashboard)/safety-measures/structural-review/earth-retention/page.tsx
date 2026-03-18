'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Layers, Plus, ArrowLeft, Loader2, Upload, Download } from 'lucide-react'
import { clsx } from 'clsx'
export default function Page() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{fetch('/api/safety-measures/structural-review?type=earth_retention').then(r=>r.json()).then(j=>{setItems(j.data??[]);setLoading(false)})}, [])
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/safety-measures/structural-review" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5" style={{color:'#d97706'}}/>흙막이지보공 구조검토 및 조립상세도
          </h1>
        </div>
        <Link href="/safety-measures/structural-review/earth-retention/new" className="btn-primary text-sm gap-1.5" style={{background:'#d97706'}}>
          <Plus className="w-4 h-4"/> 등록
        </Link>
      </div>
      <div className="card overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        : items.length===0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p>등록된 구조검토서가 없습니다.</p>
            <Link href="/safety-measures/structural-review/earth-retention/new" className="btn-primary mt-4 text-sm inline-flex" style={{background:'#d97706'}}>
              <Plus className="w-4 h-4"/> 등록하기
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-200">
            {['문서번호','제목','작업위치','검토일','검토자','결과','파일','상태'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item=>(
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number??'—'}</td>
                <td className="px-4 py-3 font-medium text-xs">{item.title}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.work_location||'—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{item.review_date}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.reviewer_name||'—'}</td>
                <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',item.review_result==='pass'?'bg-green-50 text-green-700':item.review_result==='fail'?'bg-red-50 text-red-700':'bg-amber-50 text-amber-700')}>{item.review_result==='pass'?'적합':item.review_result==='fail'?'부적합':'조건부'}</span></td>
                <td className="px-4 py-3 text-xs text-gray-500">{(item.files??[]).length}개</td>
                <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',item.status==='completed'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700')}>{item.status==='completed'?'완료':'작성중'}</span></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
    </div>
  )
}
