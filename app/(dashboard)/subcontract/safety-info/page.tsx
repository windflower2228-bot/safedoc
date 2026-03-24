'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FileText, Loader2, ArrowLeft, Printer } from 'lucide-react'
import { clsx } from 'clsx'
export default function SafetyInfoPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/subcontract/safety-info').then(r=>r.json()).then(j=>{setItems(j.data??[]);setLoading(false)}) }, [])
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/subcontract" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div><h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-green-600"/>안전 및 보건에 관한 정보제공</h1><p className="text-sm text-gray-400 mt-0.5">산안법 제65조 | 작업 시작 전 서면 제공 의무</p></div>
        </div>
        <Link href="/subcontract/safety-info/new" className="btn-primary text-sm gap-1.5" style={{background:'#16a34a'}}><Plus className="w-4 h-4"/>정보제공 작성</Link>
      </div>
      <div className="card p-4 mb-4 bg-green-50/40 border-green-100 text-xs text-green-700 leading-relaxed rounded-xl">산안법 제65조 및 시행규칙 제83조: 도급인은 관계수급인에게 작업 시작 전 유해·위험요인, 화학물질, 작업방법, 비상조치 등 안전·보건 정보를 문서로 제공해야 합니다.</div>
      <div className="card overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        : items.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400"><FileText className="w-10 h-10 mx-auto mb-3 opacity-20"/><p>정보제공 문서가 없습니다.</p><Link href="/subcontract/safety-info/new" className="btn-primary mt-4 text-sm inline-flex" style={{background:'#16a34a'}}><Plus className="w-4 h-4"/>작성하기</Link></div>
        ) : (
          <table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-200">{['문서번호','수급업체','공종','제공일','제공 항목 수','수령자','상태',''].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">{items.map(item=><tr key={item.id} className="hover:bg-gray-50"><td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number??'—'}</td><td className="px-4 py-3 font-medium">{item.vendor_name}</td><td className="px-4 py-3 text-xs text-gray-500">{item.work_type}</td><td className="px-4 py-3 text-xs text-gray-600">{item.provision_date}</td><td className="px-4 py-3 text-xs text-gray-500">{(item.info_items??[]).length}개</td><td className="px-4 py-3 text-xs text-gray-500">{item.receiver_name||'—'}</td><td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',item.status==='completed'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700')}>{item.status==='completed'?'완료':'작성 중'}</span></td><td className="px-4 py-3"><div className="flex items-center gap-3"><Link href={`/subcontract/safety-info/${item.id}`} className="text-xs text-blue-600 hover:underline">상세</Link><Link href={`/subcontract/safety-info/${item.id}?print=1`} target="_blank" className="text-xs text-green-700 hover:underline inline-flex items-center gap-1"><Printer className="w-3 h-3"/>인쇄</Link></div></td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  )
}
