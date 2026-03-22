'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, ClipboardCheck, Edit2, Save,
  Loader2, Link2, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Download,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  CATEGORY_LABEL, RESULT_LABEL, RESULT_COLOR,
  INSPECTION_TYPE_LABEL,
  type Inspection, type InspectionCheckItem, type InspectionCategory,
} from '@/types/inspection'

export default function InspectionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [doc,     setDoc]     = useState<Inspection | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing]  = useState(false)
  const [opinion, setOpinion]  = useState('')

  useEffect(() => {
    fetch(`/api/documents/inspection/${params.id}`)
      .then(r => r.json())
      .then(j => {
        setDoc(j.data)
        setOpinion(j.data?.overall_opinion ?? '')
        setLoading(false)
      })
  }, [params.id])

  async function handleComplete() {
    setSaving(true)
    const res = await fetch(`/api/documents/inspection/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', change_summary: '점검 완료 처리' }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('점검이 완료 처리되었습니다.')
      setDoc(prev => prev ? { ...prev, status: 'completed' } : prev)
    }
  }

  async function saveOpinion() {
    setSaving(true)
    const res = await fetch(`/api/documents/inspection/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overall_opinion: opinion, change_summary: '총평 수정' }),
    })
    setSaving(false)
    if (res.ok) { toast.success('저장되었습니다.'); setEditing(false) }
  }

  async function updateItem(seq: number, field: string, value: string | boolean) {
    if (!doc) return
    const updatedItems = doc.check_items.map(item =>
      item.seq === seq ? { ...item, [field]: value } : item
    )
    setDoc(prev => prev ? { ...prev, check_items: updatedItems } : prev)
    await fetch(`/api/documents/inspection/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ check_items: updatedItems, change_summary: '점검 결과 수정' }),
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
    </div>
  )
  if (!doc) return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const failItems = doc.check_items.filter(i => i.result === 'fail')
  const passItems = doc.check_items.filter(i => i.result === 'pass')

  // 카테고리 그룹핑
  const grouped = Object.entries(CATEGORY_LABEL).map(([cat, label]) => ({
    cat: cat as InspectionCategory,
    label,
    items: doc.check_items.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/documents/inspection"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-amber-600" />
              {INSPECTION_TYPE_LABEL[doc.inspection_type] ?? doc.inspection_type}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 font-mono">{doc.doc_number}</span>
              {doc.link_type === 'auto_from_risk' && (
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  <Link2 className="w-3 h-3" />
                  {doc.source_risk?.title ?? '위험성평가 연계'}
                </span>
              )}
              <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                doc.status === 'completed' ? 'bg-green-50 text-green-700' :
                doc.status === 'draft'     ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500')}>
                {doc.status === 'completed' ? '완료' : doc.status === 'draft' ? '작성 중' : '보관'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {doc.status === 'draft' && (
            <button onClick={handleComplete} disabled={saving}
              className="btn-primary text-sm gap-1.5" style={{ background: '#d97706' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              완료 처리
            </button>
          )}
          <Link href={`/documents/inspection/new?copy=${doc.id}`}
            className="btn-secondary text-sm gap-1.5">
            <Edit2 className="w-4 h-4" /> 재점검 작성
          </Link>
        </div>
      </div>

      {/* 기본정보 */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">점검 기본정보</h2>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
          {[
            ['점검 일자',   doc.inspection_date],
            ['점검 구역',   doc.inspection_area],
            ['점검자',      doc.inspector_name],
            ['직위',        doc.inspector_position],
            ['부서',        doc.inspector_dept ?? '—'],
            ['날씨',        doc.weather ?? '—'],
            ['시작 시간',   doc.inspection_start ?? '—'],
            ['종료 시간',   doc.inspection_end ?? '—'],
            ['재점검 예정', doc.follow_up_date ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-gray-400">{label}</dt>
              <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* 점검 결과 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{doc.check_items.length}</div>
          <div className="text-xs text-gray-400 mt-1">전체 항목</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{passItems.length}</div>
          <div className="text-xs text-gray-400 mt-1">양호</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{failItems.length}</div>
          <div className="text-xs text-gray-400 mt-1">불량</div>
        </div>
      </div>

      {/* 불량 항목 요약 (불량이 있을 때만) */}
      {failItems.length > 0 && (
        <div className="card p-4 mb-4 border-red-100 bg-red-50/30">
          <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            불량 항목 ({failItems.length}건) — 조치 필요
          </h3>
          <div className="space-y-2">
            {failItems.map(item => (
              <div key={item.seq} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-red-100">
                <span className="text-xs text-red-400 font-mono w-6 flex-shrink-0 pt-0.5">#{item.seq}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{item.check_content}</div>
                  {item.defect_detail && (
                    <div className="text-xs text-red-600 mt-0.5">{item.defect_detail}</div>
                  )}
                  {item.action_required && (
                    <div className="text-xs text-gray-500 mt-0.5">조치: {item.action_required}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {item.action_deadline && (
                    <span className="text-[10px] text-gray-400">{item.action_deadline}</span>
                  )}
                  <button
                    onClick={() => updateItem(item.seq, 'is_resolved', true)}
                    className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium transition-all',
                      item.is_resolved
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700')}>
                    {item.is_resolved ? '조치 완료' : '미조치'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 전체 점검 항목 (카테고리별) */}
      <div className="card overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">전체 점검 항목</h2>
        </div>
        {grouped.map(g => (
          <div key={g.cat} className="border-b border-gray-100 last:border-b-0">
            <button
              onClick={() => setExpanded(expanded === g.cat ? null : g.cat)}
              className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">{g.label}</span>
                <span className="text-[10px] text-gray-400">{g.items.length}개</span>
                {g.items.filter(i => i.result === 'fail').length > 0 && (
                  <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
                    불량 {g.items.filter(i => i.result === 'fail').length}건
                  </span>
                )}
              </div>
              {expanded === g.cat
                ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            {expanded === g.cat && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ tableLayout: 'fixed', minWidth: '700px' }}>
                  <colgroup>
                    <col style={{ width: 28 }} /><col /><col style={{ width: 70 }} />
                    <col style={{ width: 140 }} /><col style={{ width: 100 }} /><col style={{ width: 80 }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-amber-50">
                      {['#', '점검 내용', '결과', '불량 내용', '조치 요구사항', '조치 완료'].map(h => (
                        <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold text-amber-800">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map(item => {
                      const rc = RESULT_COLOR[item.result]
                      return (
                        <tr key={item.seq} className={clsx('border-b border-gray-100', item.result === 'fail' && 'bg-red-50/20')}>
                          <td className="px-2 py-2 text-center text-gray-400">{item.seq}</td>
                          <td className="px-2 py-2">
                            <div className={clsx('text-xs', item.source_risk_item_id && 'text-blue-700 font-medium')}>
                              {item.check_content}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={item.result}
                              onChange={e => updateItem(item.seq, 'result', e.target.value)}
                              className={clsx('text-[10px] font-medium rounded-full px-2 py-0.5 border-none outline-none cursor-pointer', rc.bg, rc.text)}>
                              {Object.entries(RESULT_LABEL).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-500">{item.defect_detail || '—'}</td>
                          <td className="px-2 py-2 text-xs text-gray-500">{item.action_required || '—'}</td>
                          <td className="px-2 py-2 text-center">
                            {item.result === 'fail' ? (
                              <button
                                onClick={() => updateItem(item.seq, 'is_resolved', !item.is_resolved)}
                                className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium',
                                  item.is_resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                                {item.is_resolved ? '완료' : '미조치'}
                              </button>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 총평 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">점검 총평</h2>
          <button onClick={() => editing ? saveOpinion() : setEditing(true)}
            disabled={saving}
            className="btn-secondary text-xs gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : editing ? <><Save className="w-3.5 h-3.5" />저장</>
              : <><Edit2 className="w-3.5 h-3.5" />편집</>}
          </button>
        </div>
        {editing ? (
          <textarea
            value={opinion}
            onChange={e => setOpinion(e.target.value)}
            rows={4}
            className="input-base resize-none text-sm w-full"
          />
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {doc.overall_opinion || '총평이 없습니다.'}
          </p>
        )}
      </div>
    </div>
  )
}
