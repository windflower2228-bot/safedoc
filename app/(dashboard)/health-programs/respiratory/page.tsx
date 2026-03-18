'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, ArrowLeft, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
export default function Page() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{ fetch('/api/health-programs/respiratory').then(r=>r.json()).then(j=>{setItems(j.data??[]);setLoading(false)}) },[])
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/health-programs" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Wind className="w-5 h-5" style={{color:'#16a34a'}}/>
              호흡기보호프로그램
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">KOSHA GUIDE H-82-2020 | 호흡기 유해인자 취급 사업장</p>
          </div>
        </div>
        <Link href="/health-programs/respiratory/new" className="btn-primary text-sm gap-1.5" style={{background:'#16a34a'}}>
          <Plus className="w-4 h-4"/> 프로그램 수립
        </Link>
      </div>
      <div className="card p-4 mb-4 bg-green-50/30 border-green-100 text-xs text-green-700 leading-relaxed rounded-xl">
        호흡기보호프로그램은 유해물질·분진 등 호흡기 유해인자 취급 근로자의 건강장해 예방을 위해 노출평가·호흡용 보호구 선정·밀착도 검사(Fit Test)·교육·유지관리를 포함한 종합적인 관리체계입니다.
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        ) : items.length===0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <Wind className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p>수립된 호흡기보호프로그램이 없습니다.</p>
            <Link href="/health-programs/respiratory/new" className="btn-primary mt-4 text-sm inline-flex" style={{background:'#16a34a'}}>
              <Plus className="w-4 h-4"/> 프로그램 수립
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-200">
            {['문서번호','제목','시행일','상태',''].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item=>(
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number??'—'}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{item.title}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{item.effective_date||'—'}</td>
                <td className="px-4 py-3">
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                    item.status==='active'||item.status==='completed'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700')}>
                    {item.status==='active'?'시행 중':item.status==='completed'?'시행 중':'작성 중'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/health-programs/respiratory/${item.id}`} className="text-xs text-blue-600 hover:underline">상세</Link>
                </td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
    </div>
  )
}
