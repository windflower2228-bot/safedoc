'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Shield, Loader2, Link2, CheckCircle2, BarChart3 } from 'lucide-react'
import { clsx } from 'clsx'
import { RESULT_COLOR, RESULT_LABEL, PARTICIPANT_ROLE_LABEL } from '@/types/inspection'
import DocumentPhotoSection from '@/components/common/DocumentPhotoSection'

export default function JointInspectionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [doc,     setDoc]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    fetch(`/api/documents/joint-inspection/${params.id}`)
      .then(r => r.json())
      .then(j => { setDoc(j.data); setLoading(false) })
  }, [params.id])

  async function handleComplete() {
    setSaving(true)
    const res = await fetch(`/api/documents/joint-inspection/${params.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', change_summary: '점검 완료 처리' }),
    })
    setSaving(false)
    if (res.ok) { toast.success('완료 처리되었습니다.'); setDoc((prev: any) => ({ ...prev, status: 'completed' })) }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
  if (!doc) return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const participants  = doc.participants  ?? []
  const checkItems    = doc.check_items   ?? []
  const improvements  = doc.improvement_items ?? []
  const failItems     = checkItems.filter((i: any) => i.result === 'fail')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/documents/joint-inspection" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              합동안전보건점검
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 font-mono">{doc.doc_number}</span>
              {doc.link_type === 'auto_from_risk' && (
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  <Link2 className="w-3 h-3" />{doc.source_risk?.title ?? '위험성평가 연계'}
                </span>
              )}
              <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                doc.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                {doc.status === 'completed' ? '완료' : '작성 중'}
              </span>
            </div>
          </div>
        </div>
        {doc.status === 'draft' && (
          <button onClick={handleComplete} disabled={saving}
            className="btn-primary gap-1.5" style={{ background: '#ea580c' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            완료 처리
          </button>
        )}
      </div>

      {/* 위험성평가 운영 실적 */}
      {doc.risk_summary && (
        <div className="card p-4 mb-4 border-orange-100 bg-orange-50/30">
          <div className="text-xs font-semibold text-orange-700 mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> 위험성평가 운영 실적 ({doc.risk_summary.period})
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label:'평가 건수',   value:`${doc.risk_summary.eval_count}건`,     color:'text-orange-700' },
              { label:'高위험',      value:`${doc.risk_summary.high_count}건`,     color:'text-red-600'    },
              { label:'이행률',      value:`${doc.risk_summary.resolved_rate}%`,   color:'text-green-600'  },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-lg p-3 border border-orange-100 text-center">
                <div className="text-[10px] text-gray-400">{s.label}</div>
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 기본정보 */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">기본정보</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div><dt className="text-xs text-gray-400">점검 일자</dt><dd className="font-medium mt-0.5">{doc.inspection_date}</dd></div>
          <div><dt className="text-xs text-gray-400">점검 구역</dt><dd className="font-medium mt-0.5">{doc.inspection_area}</dd></div>
        </dl>
      </div>

      {/* 점검단 구성 */}
      <div className="card overflow-hidden mb-4">
        <div className="ch px-5 py-3.5 border-b border-gray-100"><span className="font-semibold text-gray-800">점검단 구성</span></div>
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-100">
            {['성명','직위','소속','역할'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {participants.map((p: any) => (
              <tr key={p.seq}>
                <td className="px-4 py-2.5">{p.name || '—'}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.position}</td>
                <td className="px-4 py-2.5 text-gray-500">{p.affiliation || '—'}</td>
                <td className="px-4 py-2.5">
                  <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                    {PARTICIPANT_ROLE_LABEL[p.role] ?? p.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 점검 결과 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-gray-900">{checkItems.length}</div><div className="text-xs text-gray-400 mt-1">전체 항목</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">{checkItems.filter((i:any)=>i.result==='pass').length}</div><div className="text-xs text-gray-400 mt-1">양호</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-red-600">{failItems.length}</div><div className="text-xs text-gray-400 mt-1">불량</div></div>
      </div>

      {/* 개선 요구사항 */}
      {improvements.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <span className="font-semibold text-gray-800">개선 요구사항</span>
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              미완료 {improvements.filter((i:any)=>!i.is_done).length}건
            </span>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              {['내용','이행 기한','담당자','완료 여부'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {improvements.map((imp: any) => (
                <tr key={imp.seq} className={imp.is_done ? 'opacity-50' : ''}>
                  <td className="px-4 py-2.5">{imp.item}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{imp.deadline || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{imp.owner || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                      imp.is_done ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                      {imp.is_done ? '완료' : '미완료'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 총평 */}
      {doc.overall_opinion && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">점검 총평</h2>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{doc.overall_opinion}</p>
        </div>
      )}

      <DocumentPhotoSection
        category="document_joint_inspection"
        docId={doc.id}
        title="합동안전점검 첨부 사진"
      />
    </div>
  )
}
