'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ScrollText, Loader2, Printer, ChevronDown, ChevronUp } from 'lucide-react'

export default function SafetyRegulationDetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(0)
  useEffect(() => {
    fetch(`/api/safety-regulation/${params.id}`).then(r=>r.json()).then(j=>{setDoc(j.data);setLoading(false)})
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const sections: any[] = doc.sections ?? []
  const STATUS_CLS: Record<string,string> = { draft:'bg-amber-50 text-amber-700', active:'bg-green-50 text-green-700', superseded:'bg-gray-100 text-gray-500', archived:'bg-gray-50 text-gray-400' }
  const STATUS_LBL: Record<string,string> = { draft:'초안', active:'시행 중', superseded:'구버전', archived:'보관' }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/safety-regulation" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ScrollText className="w-5 h-5 text-indigo-700"/>{doc.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 font-mono">{doc.doc_number}</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">v{doc.version}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[doc.status]??''}`}>{STATUS_LBL[doc.status]??doc.status}</span>
            </div>
          </div>
        </div>
        <button onClick={() => window.print()} className="btn-secondary gap-1.5"><Printer className="w-4 h-4"/>출력</button>
      </div>

      {/* 인쇄 헤더 */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-bold tracking-widest mb-1">{doc.title}</h1>
        <p className="text-sm text-gray-500">산안법 제25조 | v{doc.version} | 시행일: {doc.effective_date}</p>
      </div>

      {/* 기본정보 */}
      <div className="card p-5 mb-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          {[['시행일', doc.effective_date], ['개정사유', doc.revision_reason || '—'], ['승인자', doc.approver_name ? `${doc.approver_name} (${doc.approver_position})` : '—'], ['승인일', doc.approved_date || '—']].map(([k,v]) => (
            <div key={k}><div className="text-xs text-gray-400 mb-0.5">{k}</div><div className="font-medium text-xs">{v}</div></div>
          ))}
        </div>
      </div>

      {/* 규정 본문 - 아코디언 */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">규정 본문</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">총 {sections.length}장 | 각 장을 클릭해 펼치세요</p>
        </div>
        <div className="divide-y divide-gray-100">
          {sections.map((sec: any, idx: number) => (
            <div key={idx}>
              <button type="button"
                onClick={() => setExpanded(expanded === idx ? null : idx)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 text-left">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-indigo-600">{sec.chapter}</span>
                  <span className="font-medium text-sm text-gray-800">{sec.title}</span>
                </div>
                {expanded === idx ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
              </button>
              {expanded === idx && (
                <div className="px-5 pb-5 pt-1 bg-indigo-50/10">
                  <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">{sec.content}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
