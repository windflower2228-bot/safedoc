'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users2, Loader2, Printer, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'
import DocumentPhotoSection from '@/components/common/DocumentPhotoSection'

export default function SafetyCommitteeDetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`/api/safety-committee/${params.id}`).then(r=>r.json()).then(j=>{setDoc(j.data);setLoading(false)})
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const isCommittee = doc.committee_type === 'safety_committee'
  const color = isCommittee ? '#2563eb' : '#7c3aed'
  const bg    = isCommittee ? '#eff6ff'  : '#f5f3ff'
  const label = isCommittee ? '산업안전보건위원회' : '노사협의체'
  const members: any[]      = doc.members ?? []
  const agendas: any[]      = doc.agenda_items ?? []
  const laborMembers        = members.filter(m => m.side === 'labor')
  const mgmtMembers         = members.filter(m => m.side === 'management')
  const presentCount        = members.filter(m => m.is_present).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/safety-committee" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users2 className="w-5 h-5" style={{color}}/>
              {label} 회의록
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{doc.doc_number}</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="btn-secondary gap-1.5"><Printer className="w-4 h-4"/>출력</button>
      </div>

      {/* 인쇄 헤더 */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-bold tracking-widest mb-1">{label} 회의록</h1>
        <p className="text-sm text-gray-500">{isCommittee ? '산안법 제24조' : '산안법 제75조'}</p>
      </div>

      {/* 기본정보 */}
      <div className="card p-5 mb-4">
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="border border-gray-200 bg-gray-50 px-3 py-2.5 font-semibold w-20 text-center">문서번호</td>
              <td className="border border-gray-200 px-3 py-2.5 font-mono text-xs">{doc.doc_number}</td>
              <td className="border border-gray-200 bg-gray-50 px-3 py-2.5 font-semibold w-20 text-center">회의 일자</td>
              <td className="border border-gray-200 px-3 py-2.5">{doc.meeting_date} {doc.meeting_start && `${doc.meeting_start}~${doc.meeting_end}`}</td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 px-3 py-2.5 font-semibold text-center">회의 장소</td>
              <td className="border border-gray-200 px-3 py-2.5">{doc.meeting_place}</td>
              <td className="border border-gray-200 bg-gray-50 px-3 py-2.5 font-semibold text-center">의장</td>
              <td className="border border-gray-200 px-3 py-2.5">{doc.chairman_name || '—'}</td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 px-3 py-2.5 font-semibold text-center">참석 인원</td>
              <td className="border border-gray-200 px-3 py-2.5" colSpan={3}>{presentCount}/{members.length}명 참석</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 참석자 */}
      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">참석자 명단</div>
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          {[
            { side:'management', title: isCommittee ? '사용자위원' : '도급인', list:mgmtMembers },
            { side:'labor', title: isCommittee ? '근로자위원' : '수급인', list:laborMembers },
          ].map(g => (
            <div key={g.side} className="p-4">
              <div className="text-xs font-semibold mb-2" style={{color}}>{g.title}</div>
              <div className="space-y-1.5">
                {g.list.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={clsx('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0', m.is_present ? 'bg-green-100' : 'bg-gray-100')}>
                      {m.is_present && <CheckCircle2 className="w-3 h-3 text-green-600"/>}
                    </span>
                    <span className="font-medium">{m.name || '—'}</span>
                    <span className="text-gray-500">{m.position}</span>
                    {m.affiliation && <span className="text-gray-400">({m.affiliation})</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 안건 */}
      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">회의 안건</div>
        <div className="divide-y divide-gray-100">
          {agendas.map((a: any, i: number) => (
            <div key={i} className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{background:color}}>{a.seq ?? i+1}</span>
                <span className="font-semibold text-sm text-gray-900">{a.title}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 ml-9">
                {a.content && (
                  <div>
                    <div className="text-[10px] text-gray-400 mb-1">{isCommittee ? '심의내용' : '내용'}</div>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{a.content}</p>
                  </div>
                )}
                {a.decision && (
                  <div>
                    <div className="text-[10px] text-gray-400 mb-1">{isCommittee ? '의결,결정사항' : '심의·결정사항'}</div>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{a.decision}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 결의사항 */}
      {doc.resolution && (
        <div className="card p-5 mb-4">
          <div className="font-semibold text-gray-800 mb-2 text-sm">결의사항</div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{doc.resolution}</p>
        </div>
      )}
      {!isCommittee && doc.next_meeting_date && (
        <div className="card p-4 text-sm text-center" style={{background:bg,borderColor:color+'30'}}>
          차기 회의 예정일: <strong style={{color}}>{doc.next_meeting_date}</strong>
        </div>
      )}

      <DocumentPhotoSection
        category="safety_committee"
        docId={doc.id}
        title={`${label} 첨부 사진`}
      />
    </div>
  )
}
