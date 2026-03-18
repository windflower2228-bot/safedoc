'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Wrench, Loader2, CheckCircle2, AlertTriangle,
  XCircle, Link2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { clsx } from 'clsx'
import { MACHINE_TYPES, PARTICIPANT_ROLES } from '@/types/pre-work-inspection'

export default function PreWorkInspectionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [doc,     setDoc]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [expanded,setExpanded]= useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/subcontract/pre-work-inspection/${params.id}`)
      .then(r => r.json()).then(j => { setDoc(j.data); setLoading(false) })
  }, [params.id])

  async function complete() {
    setSaving(true)
    const res = await fetch(`/api/subcontract/pre-work-inspection/${params.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    setSaving(false)
    if (res.ok) { toast.success('완료 처리되었습니다.'); setDoc((p: any) => ({ ...p, status: 'completed' })) }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const mt         = MACHINE_TYPES[doc.machine_type_code as keyof typeof MACHINE_TYPES]
  const checkItems = doc.check_items ?? []
  const categories = Array.from(new Set(checkItems.map((i: any) => i.category))) as string[]
  const failItems  = checkItems.filter((i: any) => i.result === 'fail')
  const participants = doc.participants ?? []

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/subcontract/pre-work-inspection" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4"/>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600"/>
              작업 시작 전 합동안전점검
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 font-mono">{doc.doc_number}</span>
              {mt && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: mt.bg, color: mt.color }}>
                  {mt.label}
                </span>
              )}
              {doc.work_stopped && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                  ⚠ 작업중지
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
          <button onClick={complete} disabled={saving}
            className="btn-primary gap-1.5" style={{ background: '#ea580c' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
            완료 처리
          </button>
        )}
      </div>

      {/* 작업중지 배너 */}
      {doc.work_stopped && (
        <div className="card p-4 mb-4 border-red-300 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"/>
            <div>
              <div className="text-sm font-bold text-red-800 mb-1">작업 중지 조치</div>
              <p className="text-xs text-red-700 leading-relaxed">{doc.stop_reason || '사유 미기재'}</p>
            </div>
          </div>
        </div>
      )}

      {/* 기계정보 + 점검정보 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 mb-3">기계·기구 정보</h3>
          <dl className="space-y-2 text-sm">
            {[
              ['기계명',         doc.machine_name],
              ['모델·형식',      doc.machine_model || '—'],
              ['등록번호',        doc.machine_serial || '—'],
              ['정격하중 등',    doc.machine_capacity || '—'],
              ['안전검사 합격번호', doc.safety_cert_no || '—'],
              ['안전검사 유효기간', doc.safety_cert_expiry || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-xs text-gray-400 w-28 flex-shrink-0">{k}</dt>
                <dd className="text-xs font-medium text-gray-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 mb-3">점검 정보</h3>
          <dl className="space-y-2">
            {[
              ['점검 일자',   doc.inspection_date],
              ['점검 시간',   doc.inspection_time || '—'],
              ['작업 위치',   doc.work_location],
              ['작업 내용',   doc.work_description || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-xs text-gray-400 w-20 flex-shrink-0">{k}</dt>
                <dd className="text-xs font-medium text-gray-800">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              {doc.work_plan_exists
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500"/>
                : <XCircle className="w-3.5 h-3.5 text-gray-300"/>}
              <span className={doc.work_plan_exists ? 'text-green-700' : 'text-gray-400'}>작업계획서 확인</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {doc.worker_qualification_ok
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500"/>
                : <XCircle className="w-3.5 h-3.5 text-gray-300"/>}
              <span className={doc.worker_qualification_ok ? 'text-green-700' : 'text-gray-400'}>자격·면허 확인</span>
            </div>
          </div>
        </div>
      </div>

      {/* 점검 결과 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-gray-900">{checkItems.length}</div><div className="text-xs text-gray-400 mt-1">전체 항목</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">{checkItems.filter((i: any) => i.result === 'pass').length}</div><div className="text-xs text-gray-400 mt-1">양호</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-red-600">{failItems.length}</div><div className="text-xs text-gray-400 mt-1">불량</div></div>
      </div>

      {/* 불량 항목 요약 */}
      {failItems.length > 0 && (
        <div className="card p-4 mb-4 border-red-100 bg-red-50/20">
          <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4"/>불량 항목 ({failItems.length}건) — 즉시 조치 필요
          </h3>
          <div className="space-y-2">
            {failItems.map((item: any) => (
              <div key={item.seq} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-red-100">
                <span className="text-xs text-red-400 font-mono w-5 flex-shrink-0 pt-0.5">#{item.seq}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800">{item.item}</div>
                  {item.defect_detail && <div className="text-xs text-red-600 mt-0.5">{item.defect_detail}</div>}
                  {item.action_required && <div className="text-xs text-gray-500 mt-0.5">조치: {item.action_required}</div>}
                </div>
                <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                  item.is_resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {item.is_resolved ? '조치 완료' : '미조치'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 전체 점검 항목 */}
      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <h2 className="font-semibold text-gray-800">전체 점검 항목</h2>
          {mt && <span className="text-[10px] text-gray-400">{mt.legalBasis}</span>}
        </div>
        {categories.map(cat => {
          const catItems = checkItems.filter((i: any) => i.category === cat)
          const catFail  = catItems.filter((i: any) => i.result === 'fail').length
          return (
            <div key={cat} className="border-b border-gray-100 last:border-b-0">
              <button type="button"
                onClick={() => setExpanded(expanded === cat ? null : cat)}
                className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">{cat}</span>
                  <span className="text-[10px] text-gray-400">{catItems.length}개</span>
                  {catFail > 0 && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">불량 {catFail}건</span>}
                </div>
                {expanded === cat ? <ChevronUp className="w-3.5 h-3.5 text-gray-400"/> : <ChevronDown className="w-3.5 h-3.5 text-gray-400"/>}
              </button>
              {expanded === cat && (
                <table className="w-full text-xs" style={{ tableLayout:'fixed', minWidth:'700px' }}>
                  <colgroup><col style={{width:24}}/><col/><col style={{width:72}}/><col style={{width:140}}/><col style={{width:130}}/></colgroup>
                  <thead><tr style={{ background: mt?.bg ?? '#f9fafb' }}>
                    {['#','점검 항목','결과','불량 내용','조치 요구사항'].map(h => (
                      <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold" style={{ color: mt?.color }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {catItems.map((item: any) => (
                      <tr key={item.seq} className={clsx('border-b border-gray-100', item.result === 'fail' && 'bg-red-50/20')}>
                        <td className="px-2 py-2 text-center text-gray-400">{item.seq}</td>
                        <td className="px-2 py-2 text-xs text-gray-800 leading-snug">{item.item}</td>
                        <td className="px-2 py-2">
                          <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            item.result === 'pass' ? 'bg-green-50 text-green-700' :
                            item.result === 'fail' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500')}>
                            {item.result === 'pass' ? '양호' : item.result === 'fail' ? '불량' : '해당없음'}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-xs text-red-600">{item.defect_detail || '—'}</td>
                        <td className="px-2 py-2 text-xs text-gray-500">{item.action_required || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )
        })}
      </div>

      {/* 참여자 */}
      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-gray-100"><h2 className="font-semibold text-gray-800">점검 참여자</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-100">
            {['성명','직위','소속','역할'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {participants.map((p: any) => (
              <tr key={p.seq}>
                <td className="px-4 py-2.5 font-medium">{p.name || '—'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{p.position}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{p.affiliation || '—'}</td>
                <td className="px-4 py-2.5">
                  <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                    {PARTICIPANT_ROLES[p.role as keyof typeof PARTICIPANT_ROLES] ?? p.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 총평 */}
      {doc.overall_opinion && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">점검 결과 총평</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{doc.overall_opinion}</p>
          {doc.follow_up_date && (
            <p className="text-xs text-gray-400 mt-2">재점검 예정: {doc.follow_up_date}</p>
          )}
        </div>
      )}
    </div>
  )
}
