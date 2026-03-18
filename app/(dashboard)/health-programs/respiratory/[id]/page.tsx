'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Printer, CheckCircle2, XCircle } from 'lucide-react'

export default function RespiratoryDetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`/api/health-programs/respiratory/${params.id}`)
      .then(r => r.json()).then(j => { setDoc(j.data); setLoading(false) })
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const exposures: any[]   = doc.exposure_survey ?? []
  const respirators: any[] = doc.respirator_records ?? []
  const fitTests: any[]    = doc.fit_test_records ?? []
  const items: any[]       = doc.items ?? []

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/health-programs/respiratory" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{doc.doc_number} · 시행일: {doc.effective_date || '—'}</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="btn-secondary gap-1.5"><Printer className="w-4 h-4"/>출력</button>
      </div>

      <div className="card p-4 mb-4 bg-green-50/30 border-green-100 text-xs text-green-700">
        KOSHA GUIDE H-82-2020 | 분진·유기용제·특별관리물질 등 호흡기 유해인자 취급 사업장 적용
      </div>

      {/* 유해물질 노출 현황 */}
      {exposures.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">유해물질·분진 노출 현황</div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['부서','작업명','유해물질','측정일','측정농도','TLV(TWA)','노출기준 초과'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {exposures.map((e: any, i: number) => (
                <tr key={i} className={e.is_over_limit ? 'bg-red-50/30' : ''}>
                  <td className="px-3 py-2.5 text-gray-700">{e.dept || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-900">{e.work_name || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-800 font-medium">{e.hazard_name || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-500">{e.measurement_date || '—'}</td>
                  <td className="px-3 py-2.5 font-bold" style={{color:e.is_over_limit?'#dc2626':'#374151'}}>{e.concentration || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{e.twa || '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    {e.is_over_limit ? <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">초과</span> : <span className="text-green-600 text-[9px]">미초과</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 보호구 선정·지급 */}
      {respirators.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">호흡용 보호구 선정·지급</div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['작업유형','보호구 유형','필터유형','지급 부서','수량','KCs 인증번호'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {respirators.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 text-gray-800">{r.work_type || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-700">{r.respirator_type || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{r.filter_type || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{r.issued_to_dept || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{r.qty ? `${r.qty}개` : '—'}</td>
                  <td className="px-3 py-2.5 text-gray-500 font-mono">{r.kcs_no || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fit Test */}
      {fitTests.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">밀착도 검사 (Fit Test)</div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['근로자','부서','검사일','보호구 유형','검사방법','결과','차기 검사일'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {fitTests.map((f: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{f.worker_name || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{f.dept || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{f.date || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-700">{f.respirator_type || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{f.test_method || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${f.result==='합격'||f.result==='pass'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>
                      {f.result || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{f.next_test_date || '—'}</td>
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
