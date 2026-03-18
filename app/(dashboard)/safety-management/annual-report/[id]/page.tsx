'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Activity, Loader2, Printer } from 'lucide-react'
import { clsx } from 'clsx'

export default function AnnualReportDetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`/api/board-reports/${params.id}`).then(r=>r.json()).then(j=>{setDoc(j.data);setLoading(false)})
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const agendas: any[] = doc.agenda_items ?? []
  const APPROVAL_CLS: Record<string,string> = { approved:'bg-green-50 text-green-700', rejected:'bg-red-50 text-red-700', draft:'bg-amber-50 text-amber-700' }
  const APPROVAL_LBL: Record<string,string> = { approved:'승인', rejected:'반려', draft:'검토 중' }
  const MTG_LBL: Record<string,string> = { board:'이사회', audit:'감사위원회', general:'주주총회' }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/safety-management/annual-report" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Activity className="w-5 h-5 text-blue-700"/>{doc.report_year}년 이사회 안전보건 보고</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 font-mono">{doc.doc_number}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${APPROVAL_CLS[doc.approval_status]??''}`}>{APPROVAL_LBL[doc.approval_status]??'—'}</span>
            </div>
          </div>
        </div>
        <button onClick={() => window.print()} className="btn-secondary gap-1.5"><Printer className="w-4 h-4"/>출력</button>
      </div>

      {/* 기본정보 */}
      <div className="card p-5 mb-4">
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="border border-gray-200 bg-gray-50 px-3 py-2.5 font-semibold w-24 text-center">보고 연도</td>
              <td className="border border-gray-200 px-3 py-2.5">{doc.report_year}년</td>
              <td className="border border-gray-200 bg-gray-50 px-3 py-2.5 font-semibold w-24 text-center">회의 종류</td>
              <td className="border border-gray-200 px-3 py-2.5">{MTG_LBL[doc.meeting_type]??doc.meeting_type}</td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 px-3 py-2.5 font-semibold text-center">보고 일자</td>
              <td className="border border-gray-200 px-3 py-2.5">{doc.report_date}</td>
              <td className="border border-gray-200 bg-gray-50 px-3 py-2.5 font-semibold text-center">투자 예산</td>
              <td className="border border-gray-200 px-3 py-2.5">{doc.investment_budget ? doc.investment_budget.toLocaleString()+'원' : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {doc.safety_plan_summary && (
        <div className="card p-5 mb-4">
          <div className="font-semibold text-gray-800 mb-2 text-sm">안전보건 계획 요약</div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{doc.safety_plan_summary}</p>
        </div>
      )}

      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-gray-100 font-semibold text-gray-800 text-sm">보고 안건 ({agendas.length}건)</div>
        <div className="divide-y divide-gray-100">
          {agendas.map((a: any, i: number) => (
            <div key={i} className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{a.seq??i+1}</span>
                <span className="font-semibold text-sm">{a.title}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 ml-9">
                {a.content && <div><div className="text-[10px] text-gray-400 mb-1">내용</div><p className="text-xs text-gray-700 whitespace-pre-line">{a.content}</p></div>}
                {a.resolution && <div><div className="text-[10px] text-gray-400 mb-1">결의사항</div><p className="text-xs text-gray-700 whitespace-pre-line">{a.resolution}</p></div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
