'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, UsersRound, Loader2, CheckCircle2, BarChart3, Edit2 } from 'lucide-react'
import { clsx } from 'clsx'

export default function CommitteeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [doc,     setDoc]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    fetch(`/api/documents/committee/${params.id}`)
      .then(r => r.json())
      .then(j => { setDoc(j.data); setLoading(false) })
  }, [params.id])

  async function handleComplete() {
    setSaving(true)
    const res = await fetch(`/api/documents/committee/${params.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', change_summary: '회의록 완료 처리' }),
    })
    setSaving(false)
    if (res.ok) { toast.success('완료 처리되었습니다.'); setDoc((prev: any) => ({ ...prev, status: 'completed' })) }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
  if (!doc) return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const members      = doc.members       ?? []
  const agendaItems  = doc.agenda_items  ?? []
  const perf         = doc.risk_performance
  const presentCount = members.filter((m: any) => m.is_present).length
  const managementMembers = members.filter((m: any) =>
    m.side === 'management' || (m.side == null && m.role !== 'worker_rep')
  )
  const laborMembers = members.filter((m: any) =>
    m.side === 'labor' || m.role === 'worker_rep'
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/documents/committee" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-purple-600" />
              안전보건협의체 회의록
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 font-mono">{doc.doc_number}</span>
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                {doc.meeting_type === 'regular' ? '정기 회의' : '임시 회의'}
              </span>
              <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                doc.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                {doc.status === 'completed' ? '완료' : '작성 중'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {doc.status === 'draft' && (
            <button onClick={handleComplete} disabled={saving}
              className="btn-primary gap-1.5" style={{ background: '#7c3aed' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              완료 처리
            </button>
          )}
          <Link href={`/documents/committee/new?copy=${doc.id}`} className="btn-secondary gap-1.5 text-sm">
            <Edit2 className="w-4 h-4" /> 수정
          </Link>
        </div>
      </div>

      {/* 기본정보 */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">회의 기본정보</h2>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div><dt className="text-xs text-gray-400">회의 일자</dt><dd className="font-medium mt-0.5">{doc.meeting_date}</dd></div>
          <div><dt className="text-xs text-gray-400">장소</dt><dd className="font-medium mt-0.5">{doc.meeting_place}</dd></div>
          <div><dt className="text-xs text-gray-400">시간</dt><dd className="font-medium mt-0.5">{doc.meeting_start ?? '—'} ~ {doc.meeting_end ?? '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">참석 인원</dt><dd className="font-medium mt-0.5">{presentCount}/{members.length}명</dd></div>
          <div><dt className="text-xs text-gray-400">차기 회의</dt><dd className="font-medium mt-0.5">{doc.next_meeting_date ?? '—'}</dd></div>
        </dl>
      </div>

      {/* 위험성평가 운영 실적 */}
      {perf && (
        <div className="card p-4 mb-4 border-purple-100 bg-purple-50/30">
          <div className="text-xs font-semibold text-purple-700 mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> 위험성평가 운영 실적 ({perf.period})
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label:'평가 건수', value:`${perf.eval_count}건`, color:'text-purple-700' },
              { label:'高위험',    value:`${perf.high_count}건`, color:'text-red-600'    },
              { label:'中·低',     value:`${perf.mid_count+perf.low_count}건`, color:'text-amber-600' },
              { label:'이행률',    value:`${perf.resolved_rate}%`, color:'text-green-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-lg p-3 border border-purple-100 text-center">
                <div className="text-[10px] text-gray-400">{s.label}</div>
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
          {perf.notable_items?.length > 0 && (
            <div className="mt-3 text-xs text-purple-600">
              <span className="font-medium">고위험 항목:</span> {perf.notable_items.join(' / ')}
            </div>
          )}
        </div>
      )}

      {/* 참석자 명단 */}
      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <span className="font-semibold text-gray-800">참석자 명단</span>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          <div className="rounded-xl border border-blue-100 overflow-hidden">
            <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 text-xs font-semibold text-blue-700">사용자측</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white border-b border-blue-50">
                  {['성명', '직위', '소속', '참석'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {managementMembers.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-gray-400">등록된 참석자 없음</td></tr>
                ) : (
                  managementMembers.map((m: any, idx: number) => (
                    <tr key={`mgmt-${m.seq ?? idx}`} className={m.is_present ? '' : 'opacity-50'}>
                      <td className="px-3 py-2 font-medium">{m.name || '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{m.position || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{m.affiliation || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', m.is_present ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                          {m.is_present ? '참석' : '불참'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-green-100 overflow-hidden">
            <div className="px-3 py-2 bg-green-50 border-b border-green-100 text-xs font-semibold text-green-700">근로자측</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white border-b border-green-50">
                  {['성명', '직위', '소속', '참석'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-green-50">
                {laborMembers.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-gray-400">등록된 참석자 없음</td></tr>
                ) : (
                  laborMembers.map((m: any, idx: number) => (
                    <tr key={`labor-${m.seq ?? idx}`} className={m.is_present ? '' : 'opacity-50'}>
                      <td className="px-3 py-2 font-medium">{m.name || '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{m.position || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{m.affiliation || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', m.is_present ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                          {m.is_present ? '참석' : '불참'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 안건 */}
      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <span className="font-semibold text-gray-800">회의 안건</span>
        </div>
        <div className="divide-y divide-gray-100">
          {agendaItems.map((a: any) => (
            <div key={a.seq} className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {a.seq}
                </span>
                <span className="font-medium text-gray-900 text-sm">{a.title}</span>
                {a.title?.includes('위험성평가 실시에 관한 사항') && perf && (
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    위험성평가 연계
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 ml-9">
                {a.content && (
                  <div>
                    <div className="text-[10px] text-gray-400 mb-1">내용</div>
                    <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{a.content}</p>
                  </div>
                )}
                {a.decision && (
                  <div>
                    <div className="text-[10px] text-gray-400 mb-1">결정 사항</div>
                    <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{a.decision}</p>
                  </div>
                )}
                {(a.owner || a.deadline) && (
                  <div className="flex gap-4">
                    {a.owner    && <div><div className="text-[10px] text-gray-400">담당자</div><div className="text-xs font-medium">{a.owner}</div></div>}
                    {a.deadline && <div><div className="text-[10px] text-gray-400">이행 기한</div><div className="text-xs font-medium">{a.deadline}</div></div>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 결의사항 */}
      {doc.resolution && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">결의사항</h2>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{doc.resolution}</p>
        </div>
      )}
    </div>
  )
}
