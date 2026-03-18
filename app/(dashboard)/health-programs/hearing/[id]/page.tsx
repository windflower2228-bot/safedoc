'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Printer, Ear, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

export default function HearingDetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`/api/health-programs/hearing/${params.id}`)
      .then(r => r.json()).then(j => { setDoc(j.data); setLoading(false) })
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const surveys:  any[]  = doc.noise_surveys ?? []
  const measures: any[]  = doc.engineering_measures ?? []
  const ppe:      any[]  = doc.ppe_records ?? []
  const tests:    any[]  = doc.hearing_tests ?? []
  const edu:      any[]  = doc.education_records ?? []
  const items:    any[]  = doc.items ?? []

  const over90Cnt = surveys.filter((s: any) => s.is_over_90).length
  const over85Cnt = surveys.filter((s: any) => s.is_over_85).length

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/health-programs/hearing" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Ear className="w-5 h-5 text-amber-600"/>{doc.title}</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{doc.doc_number} · 시행일: {doc.effective_date || '—'} · 연간검토: {doc.annual_review_date || '—'}</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="btn-secondary gap-1.5"><Printer className="w-4 h-4"/>출력</button>
      </div>

      <div className="card p-4 mb-4 bg-amber-50/30 border-amber-100 text-xs text-amber-700">
        산업안전보건기준에 관한 규칙 제512조·제515조 | 소음작업(85dB 이상) 또는 충격소음작업 사업장 의무 수립
      </div>

      {/* 소음 노출 현황 요약 */}
      {surveys.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card p-3 text-center"><div className="text-2xl font-bold text-gray-800">{surveys.length}</div><div className="text-xs text-gray-400 mt-0.5">측정 작업수</div></div>
          <div className="card p-3 text-center" style={{background:over90Cnt>0?'#fef2f2':'#f9fafb'}}>
            <div className="text-2xl font-bold" style={{color:over90Cnt>0?'#dc2626':'#374151'}}>{over90Cnt}</div>
            <div className="text-xs text-gray-400 mt-0.5">90dB 초과 (노출기준 초과)</div>
          </div>
          <div className="card p-3 text-center" style={{background:over85Cnt>0?'#fffbeb':'#f9fafb'}}>
            <div className="text-2xl font-bold" style={{color:over85Cnt>0?'#d97706':'#374151'}}>{over85Cnt}</div>
            <div className="text-xs text-gray-400 mt-0.5">85dB 이상 (소음작업)</div>
          </div>
        </div>
      )}

      {/* 소음 측정 결과 */}
      {surveys.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">소음 노출 현황</div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['부서','작업명','측정일','TWA(dB)','85dB↑','90dB↑','조치필요'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {surveys.map((s: any, i: number) => (
                <tr key={i} className={s.is_over_90 ? 'bg-red-50/30' : s.is_over_85 ? 'bg-amber-50/20' : ''}>
                  <td className="px-3 py-2.5 text-gray-700">{s.dept || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-900 font-medium">{s.work_name || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-500">{s.measurement_date || '—'}</td>
                  <td className="px-3 py-2.5 font-bold" style={{color:s.is_over_90?'#dc2626':s.is_over_85?'#d97706':'#374151'}}>{s.twae_db ? `${s.twae_db} dB` : '—'}</td>
                  <td className="px-3 py-2.5 text-center">{s.is_over_85 ? <span className="text-amber-600">●</span> : '—'}</td>
                  <td className="px-3 py-2.5 text-center">{s.is_over_90 ? <span className="text-red-600 font-bold">●</span> : '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">{s.action_required || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 청력보호구 지급현황 */}
      {ppe.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">청력보호구 지급 현황</div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['부서','근로자수','보호구 유형','지급일','비고'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {ppe.map((p: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 text-gray-700">{p.dept || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-900">{p.worker_count ? `${p.worker_count}명` : '—'}</td>
                  <td className="px-3 py-2.5 text-gray-700">{p.ppe_type || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-500">{p.issued_date || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-500">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 청력검사 결과 */}
      {tests.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">정기 청력검사 결과 (특수건강진단)</div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['검사일','검사기관','수검자수','D1(유소견)','D2(유소견)','C1(요관찰)','C2(요관찰)','조치내용'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {tests.map((t: any, i: number) => (
                <tr key={i} className={(t.d1_count > 0 || t.d2_count > 0) ? 'bg-red-50/20' : ''}>
                  <td className="px-3 py-2.5 text-gray-600">{t.test_date || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{t.test_agency || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-900">{t.worker_count ? `${t.worker_count}명` : '—'}</td>
                  <td className="px-3 py-2.5 font-bold" style={{color:t.d1_count>0?'#dc2626':'#374151'}}>{t.d1_count ?? '—'}</td>
                  <td className="px-3 py-2.5 font-bold" style={{color:t.d2_count>0?'#dc2626':'#374151'}}>{t.d2_count ?? '—'}</td>
                  <td className="px-3 py-2.5 text-amber-600">{t.c1_count ?? '—'}</td>
                  <td className="px-3 py-2.5 text-amber-600">{t.c2_count ?? '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600 max-w-[150px] truncate">{t.action_taken || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 세부계획 */}
      {items.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">세부 실행 계획</div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['#','내용','담당자','기한','완료'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 text-gray-400">{item.seq ?? i+1}</td>
                  <td className="px-3 py-2.5 text-gray-800">{item.content}</td>
                  <td className="px-3 py-2.5 text-gray-600">{item.responsible || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{item.due_date || '—'}</td>
                  <td className="px-3 py-2.5 text-center">{item.done ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto"/> : <XCircle className="w-4 h-4 text-gray-200 mx-auto"/>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
