'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, BarChart3, Loader2, ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'
export default function QualifiedVendorPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/subcontract/qualified-vendor').then(r=>r.json()).then(j=>{setItems(j.data??[]);setLoading(false)}) }, [])
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/subcontract" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div><h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-700"/>적격 수급업체 선정 자료</h1><p className="text-sm text-gray-400 mt-0.5">산안법 제61조 | 산재예방 능력 평가 후 계약</p></div>
        </div>
        <Link href="/subcontract/qualified-vendor/new" className="btn-primary text-sm gap-1.5" style={{background:'#1d4ed8'}}><Plus className="w-4 h-4"/>선정 자료 작성</Link>
      </div>
      <div className="card p-4 mb-4 bg-blue-50/40 border-blue-100 text-xs text-blue-700 leading-relaxed rounded-xl">산안법 제61조: 사업주는 산업재해 예방을 위한 조치 능력 및 기술에 관한 평가기준을 정하고 이에 따라 도급하여야 한다. 수급인 선정 전 안전보건 평가를 실시하고 그 결과를 보존해야 한다.</div>
      <div className="card overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        : items.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400"><BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-20"/><p>선정 자료가 없습니다.</p><Link href="/subcontract/qualified-vendor/new" className="btn-primary mt-4 text-sm inline-flex" style={{background:'#1d4ed8'}}><Plus className="w-4 h-4"/>작성하기</Link></div>
        ) : (
          <table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-200">{['문서번호','수급업체명','공종','평가일','점수','적격여부','상태',''].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">{items.map(item=><tr key={item.id} className="hover:bg-gray-50"><td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number??'—'}</td><td className="px-4 py-3 font-medium">{item.vendor_name}</td><td className="px-4 py-3 text-xs text-gray-500">{item.work_type}</td><td className="px-4 py-3 text-xs text-gray-600">{item.evaluation_date}</td><td className="px-4 py-3 text-xs font-mono">{item.total_score??'—'}점</td><td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',item.is_qualified?'bg-green-50 text-green-700':'bg-red-50 text-red-700')}>{item.is_qualified?'적격':'부적격'}</span></td><td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',item.status==='completed'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700')}>{item.status==='completed'?'완료':'작성 중'}</span></td><td className="px-4 py-3"><Link href={`/subcontract/qualified-vendor/${item.id}`} className="text-xs text-blue-600 hover:underline">상세</Link></td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  )
}
