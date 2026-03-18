'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Printer, Wind, CheckCircle2, XCircle } from 'lucide-react'

export default function ConfinedSpaceDetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`/api/health-programs/confined-space/${params.id}`)
      .then(r => r.json()).then(j => { setDoc(j.data); setLoading(false) })
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const spaces: any[]    = doc.space_inventory ?? []
  const procedures: any[] = doc.work_procedures ?? []
  const trainings: any[]  = doc.training_plan ?? []
  const equipment: any[]  = doc.equipment_list ?? []

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/health-programs/confined-space" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Wind className="w-5 h-5 text-purple-600"/>{doc.title}</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{doc.doc_number} · 시행일: {doc.effective_date || '—'}</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="btn-secondary gap-1.5"><Printer className="w-4 h-4"/>출력</button>
      </div>

      <div className="card p-4 mb-4 bg-purple-50/30 border-purple-100 text-xs text-purple-700">
        산업안전보건기준에 관한 규칙 제619조 | 밀폐공간 작업 프로그램 수립·시행 의무
      </div>

      {/* 밀폐공간 목록 */}
      {spaces.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">밀폐공간 현황 목록 (제619조 제1호)</div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['#','위치','공간 유형','유해가스','출입 방법','출입금지 여부'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {spaces.map((s: any, i: number) => (
                <tr key={i} className={s.is_prohibited ? 'bg-red-50/20' : ''}>
                  <td className="px-3 py-2.5 text-gray-400">{s.seq ?? i+1}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{s.location}</td>
                  <td className="px-3 py-2.5 text-gray-600">{s.space_type || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{s.hazard_gases || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{s.access_type || '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    {s.is_prohibited ? <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">출입금지</span> : <span className="text-gray-400 text-[9px]">출입가능</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 세부 실행계획 */}
      {doc.items?.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">세부 실행 계획</div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['#','내용','담당자','기한','완료'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {doc.items.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 text-gray-400">{item.seq ?? i+1}</td>
                  <td className="px-3 py-2.5 text-gray-800">{item.content}</td>
                  <td className="px-3 py-2.5 text-gray-600">{item.responsible || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{item.due_date || '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    {item.done ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto"/> : <XCircle className="w-4 h-4 text-gray-200 mx-auto"/>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 긴급구조계획 */}
      {doc.emergency_plan && (
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-2 text-sm">긴급구조계획</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{doc.emergency_plan}</p>
        </div>
      )}
    </div>
  )
}
