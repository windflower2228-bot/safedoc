'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Printer, Heart } from 'lucide-react'
import { clsx } from 'clsx'
const STATUS_LBL: Record<string,string> = { planned:'계획', in_progress:'진행 중', completed:'완료', cancelled:'취소' }
export default function DetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(()=>{ fetch('/api/health-programs/wellness/'+params.id).then(r=>r.json()).then(j=>{setDoc(j.data);setLoading(false)}) },[params.id])
  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>
  const plans: any[] = doc.plan_items ?? []
  const totalBudget = plans.reduce((s,p)=>s+(Number(p.budget)||0),0)
  const completedCnt = plans.filter(p=>p.status==='completed').length
  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/health-programs/wellness" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div><h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Heart className="w-5 h-5 text-rose-500"/>{doc.title}</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{doc.doc_number}</p></div>
        </div>
        <button onClick={()=>window.print()} className="btn-secondary gap-1.5"><Printer className="w-4 h-4"/>출력</button>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[{v:plans.length,l:'전체 프로그램',c:'#374151'},{v:completedCnt,l:'완료',c:'#16a34a'},{v:totalBudget.toLocaleString(),l:'총 예산(원)',c:'#e11d48'},{v:doc.year+'년',l:'대상 연도',c:'#2563eb'}].map(s=>(
          <div key={s.l} className="card p-3 text-center"><div className="text-xl font-bold" style={{color:s.c}}>{s.v}</div><div className="text-[10px] text-gray-400 mt-0.5">{s.l}</div></div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">연간 건강증진 계획표</div>
        <table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-200">
          {['#','분류','프로그램명','대상','시작일','종료일','예산','담당자','상태'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {plans.map((p,i)=>(
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-xs text-center text-gray-400">{p.seq??i+1}</td>
              <td className="px-4 py-3"><span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">{p.category}</span></td>
              <td className="px-4 py-3 text-xs font-medium text-gray-900">{p.program_name}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{p.target||'—'}</td>
              <td className="px-4 py-3 text-xs text-gray-600">{p.start_date||'—'}</td>
              <td className="px-4 py-3 text-xs text-gray-600">{p.end_date||'—'}</td>
              <td className="px-4 py-3 text-xs text-right">{Number(p.budget||0).toLocaleString()}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{p.responsible||'—'}</td>
              <td className="px-4 py-3">
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                  p.status==='completed'?'bg-green-50 text-green-700':p.status==='in_progress'?'bg-blue-50 text-blue-700':p.status==='cancelled'?'bg-gray-100 text-gray-400':'bg-amber-50 text-amber-700')}>
                  {STATUS_LBL[p.status]??p.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  )
}
