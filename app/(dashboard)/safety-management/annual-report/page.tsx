'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Activity, Loader2, ArrowLeft, FileText } from 'lucide-react'
import { clsx } from 'clsx'

export default function AnnualReportPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/board-reports').then(r=>r.json()).then(j=>{ setItems(j.data??[]); setLoading(false) })
  }, [])
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/safety-management" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-700"/>연간 이사회 보고 및 승인
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">산안법 제14조 | 상시 500명 이상 사업장 | 매년 의무</p>
          </div>
        </div>
        <Link href="/safety-management/annual-report/new" className="btn-primary text-sm gap-1.5" style={{background:'#1d4ed8'}}>
          <Plus className="w-4 h-4"/> 이사회 보고 작성
        </Link>
      </div>
      <div className="card p-4 mb-4 bg-blue-50/40 border-blue-100 text-xs text-blue-700 leading-relaxed rounded-xl">
        대통령령으로 정하는 규모의 사업을 대표하는 사업주는 매년 안전보건계획을 수립하여 이사회에 보고하고 승인을 받아야 합니다. (산업안전보건법 제14조)
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p>이사회 보고 문서가 없습니다.</p>
            <Link href="/safety-management/annual-report/new" className="btn-primary mt-4 text-sm inline-flex" style={{background:'#1d4ed8'}}>
              <Plus className="w-4 h-4"/> 작성하기
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['문서번호','보고연도','회의 종류','보고일','승인 여부','상태',''].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item=>(
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number??'—'}</td>
                  <td className="px-4 py-3 font-semibold">{item.report_year}년</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{{board:'이사회',audit:'감사위원회',general:'주주총회'}[item.meeting_type]??item.meeting_type}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.report_date}</td>
                  <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',item.approval_status==='approved'?'bg-green-50 text-green-700':item.approval_status==='rejected'?'bg-red-50 text-red-700':'bg-amber-50 text-amber-700')}>{{'approved':'승인','rejected':'반려','draft':'검토 중'}[item.approval_status]??item.approval_status}</span></td>
                  <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full',item.status==='completed'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700')}>{item.status==='completed'?'완료':'작성 중'}</span></td>
                  <td className="px-4 py-3"><Link href={'/safety-management/annual-report/'+item.id} className="text-xs text-blue-600 hover:underline">상세</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
