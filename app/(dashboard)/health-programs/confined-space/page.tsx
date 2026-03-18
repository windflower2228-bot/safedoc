'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Wind, ArrowLeft, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
export default function Page() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{ fetch('/api/health-programs/confined-space').then(r=>r.json()).then(j=>{setItems(j.data??[]);setLoading(false)}) },[])
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/health-programs" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Wind className="w-5 h-5" style={{color:'#7c3aed'}}/>
              밀폐공간작업프로그램
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">안전보건규칙 제619조 | 밀폐공간 보유 사업장 의무 수립</p>
          </div>
        </div>
        <Link href="/health-programs/confined-space/new" className="btn-primary text-sm gap-1.5" style={{background:'#7c3aed'}}>
          <Plus className="w-4 h-4"/> 프로그램 수립
        </Link>
      </div>
      <div className="card p-4 mb-4 bg-purple-50/30 border-purple-100 text-xs text-purple-700 leading-relaxed rounded-xl">
        산업안전보건기준에 관한 규칙 제619조: 사업주가 밀폐공간에서 근로자에게 작업을 하도록 하는 경우 ① 밀폐공간 위치 파악 및 관리 ② 유해위험요인 파악 및 관리 ③ 작업 전 확인 절차 ④ 교육훈련 ⑤ 긴급구조계획이 포함된 프로그램을 수립·시행해야 합니다.
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        ) : items.length===0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <Wind className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p>수립된 밀폐공간작업프로그램이 없습니다.</p>
            <Link href="/health-programs/confined-space/new" className="btn-primary mt-4 text-sm inline-flex" style={{background:'#7c3aed'}}>
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
                  <Link href={`/health-programs/confined-space/${item.id}`} className="text-xs text-blue-600 hover:underline">상세</Link>
                </td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
    </div>
  )
}
