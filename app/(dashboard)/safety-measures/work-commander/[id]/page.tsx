'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Loader2, Printer } from 'lucide-react'
import { clsx } from 'clsx'

const TYPE_CFG: Record<string,{label:string;color:string;bg:string}> = {
  work_director: { label:'작업지휘자', color:'#2563eb', bg:'#eff6ff' },
  signal_person: { label:'신호수',    color:'#7c3aed', bg:'#f5f3ff' },
  fire_watcher:  { label:'화재감시자', color:'#dc2626', bg:'#fef2f2' },
}

export default function WorkCommanderDetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`/api/safety-measures/work-commander/${params.id}`)
      .then(r=>r.json()).then(j=>{setDoc(j.data);setLoading(false)})
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const tc = TYPE_CFG[doc.commander_type] ?? TYPE_CFG.work_director
  const duties: string[] = doc.duties ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/safety-measures/work-commander" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-5 h-5 text-purple-600"/>{tc.label} 지정서</h1>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{doc.doc_number}</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="btn-secondary gap-1.5"><Printer className="w-4 h-4"/>출력</button>
      </div>

      {/* 인쇄 헤더 */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-bold tracking-widest mb-1">{tc.label} 지정서</h1>
        <p className="text-sm text-gray-500">{doc.legal_basis}</p>
      </div>

      <div className="card p-5 mb-4" style={{borderColor: tc.color+'30'}}>
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="border border-gray-200 bg-gray-50 px-4 py-2.5 font-semibold w-24 text-center">성명</td>
              <td className="border border-gray-200 px-4 py-2.5">{doc.person_name}</td>
              <td className="border border-gray-200 bg-gray-50 px-4 py-2.5 font-semibold w-24 text-center">직위</td>
              <td className="border border-gray-200 px-4 py-2.5">{doc.person_position || '—'}</td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 px-4 py-2.5 font-semibold text-center">소속</td>
              <td className="border border-gray-200 px-4 py-2.5">{doc.person_affiliation || '—'}</td>
              <td className="border border-gray-200 bg-gray-50 px-4 py-2.5 font-semibold text-center">작업위치</td>
              <td className="border border-gray-200 px-4 py-2.5">{doc.work_location || '—'}</td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 px-4 py-2.5 font-semibold text-center">작업 종류</td>
              <td className="border border-gray-200 px-4 py-2.5 font-medium" colSpan={3}>{doc.work_type}</td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 px-4 py-2.5 font-semibold text-center">지정 기간</td>
              <td className="border border-gray-200 px-4 py-2.5" colSpan={3}>
                {doc.effective_date} ~ {doc.expiry_date || '작업 완료 시까지'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">법적 근거 및 주요 직무</h2>
        <p className="text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">{doc.legal_basis}</p>
        <ol className="space-y-1.5">
          {duties.map((d: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-xs text-gray-400 font-mono w-5 flex-shrink-0 pt-0.5">{i+1}.</span>
              <span className="text-gray-700 leading-relaxed">{d}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="card p-5 text-center">
        <p className="text-sm leading-loose mb-4">
          위 자를 {doc.effective_date}부로<br/>
          <strong className="text-lg" style={{color: tc.color}}>{tc.label}</strong>으(로) 지정합니다.
        </p>
        <div className="text-sm">{doc.effective_date}</div>
        <div className="mt-4 text-sm">
          {doc.issuer_position} &nbsp; {doc.issuer_name} &nbsp;
          <span className="border border-gray-400 px-4 py-1 text-xs text-gray-400">(인)</span>
        </div>
      </div>
    </div>
  )
}
