'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, BookOpen, Loader2, ArrowLeft, FileText } from 'lucide-react'
import { clsx } from 'clsx'

export default function EduPage() {
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/documents/education?edu_type=regular-worker&worker_type=regular_field')
      .then(r=>r.json()).then(j=>{ setItems(j.data??[]); setLoading(false) })
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/documents/education" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5" style={{color:'#2563eb'}} />
              근로자 정기안전보건교육
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">산안법 제29조 | 매 분기 1회 이상 실시</p>
          </div>
        </div>
        <Link href="/documents/education/new?edu_type=regular-worker"
          className="btn-primary text-sm gap-1.5" style={{background:'#2563eb'}}>
          <Plus className="w-4 h-4" /> 교육일지 작성
        </Link>
      </div>

      <div className="card p-4 mb-4" style={{background:'#eff6ff',borderColor:'#2563eb20'}}>
        <p className="text-xs leading-relaxed" style={{color:'#2563eb'}}>근무형태별 법정 교육시간이 다릅니다 | 위험성평가 연계 시 교육 항목 자동 생성</p>
      </div>


      <div className="grid grid-cols-4 gap-2 mb-4">
        {[['일용직', '1h/월', '#fef2f2', '#dc2626'],
          ['사무직', '3h/분기', '#eff6ff', '#2563eb'],
          ['현장직', '6h/분기', '#f0fdf4', '#16a34a'],
          ['관리감독자', '8h/반기', '#f5f3ff', '#7c3aed'],
        ].map(([label, hours, bg, color]) => (
          <div key={label} className="card p-3 text-center" style={{background:bg}}>
            <div className="font-bold text-xl" style={{color}}>{hours}</div>
            <div className="text-xs font-semibold text-gray-700 mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>아직 교육일지가 없습니다.</p>
            <Link href="/documents/education/new?edu_type=regular-worker"
              className="btn-primary mt-4 text-sm inline-flex" style={{background:'#2563eb'}}>
              <Plus className="w-4 h-4" /> 첫 교육일지 작성
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['문서번호','교육명','교육일자','교육시간','참석인원','강사','상태',''].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item=>(
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number??'—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.edu_date}</td>
                  <td className="px-4 py-3 text-xs">
                    {item.edu_duration_hours
                      ? <span className="font-semibold text-gray-700">{item.edu_duration_hours}h</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.attendee_count}명</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.instructor_name||'—'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      item.status==='completed'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700')}>
                      {item.status==='completed'?'완료':'작성 중'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={'/documents/education/'+item.id} className="text-xs text-blue-600 hover:underline">상세</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
