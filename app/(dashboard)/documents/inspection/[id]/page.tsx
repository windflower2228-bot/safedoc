'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, ClipboardCheck, Edit2, Save, Loader2, Link2, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'
import { RESULT_LABEL, INSPECTION_TYPE_LABEL, type Inspection, type InspectionResult } from '@/types/inspection'

export default function InspectionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [doc, setDoc] = useState<Inspection | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [opinion, setOpinion] = useState('')

  useEffect(() => {
    fetch(`/api/documents/inspection/${params.id}`)
      .then((r) => r.json())
      .then((j) => {
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
      setDoc((prev) => (prev ? { ...prev, status: 'completed' } : prev))
    }
  }

  async function saveOpinion() {
    setSaving(true)
    const res = await fetch(`/api/documents/inspection/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overall_opinion: opinion, change_summary: '기타 특이사항 수정' }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('저장되었습니다.')
      setEditing(false)
    }
  }

  async function updateItem(seq: number, field: 'check_content' | 'result' | 'action_required', value: string) {
    if (!doc) return
    const updatedItems = doc.check_items.map((item) =>
      item.seq === seq ? { ...item, [field]: value } : item
    )
    setDoc((prev) => (prev ? { ...prev, check_items: updatedItems } : prev))
    await fetch(`/api/documents/inspection/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ check_items: updatedItems, change_summary: '점검 항목 수정' }),
    })
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    )
  if (!doc) return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/documents/inspection" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
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
              <span
                className={clsx(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  doc.status === 'completed'
                    ? 'bg-green-50 text-green-700'
                    : doc.status === 'draft'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-gray-50 text-gray-500'
                )}
              >
                {doc.status === 'completed' ? '완료' : doc.status === 'draft' ? '작성 중' : '보관'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {doc.status === 'draft' && (
            <button onClick={handleComplete} disabled={saving} className="btn-primary text-sm gap-1.5" style={{ background: '#d97706' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              완료 처리
            </button>
          )}
          <Link href={`/documents/inspection/new?copy=${doc.id}`} className="btn-secondary text-sm gap-1.5">
            <Edit2 className="w-4 h-4" /> 재점검 작성
          </Link>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">점검 기본정보</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-gray-400">점검 일자</dt>
            <dd className="font-medium text-gray-800 mt-0.5">{doc.inspection_date}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">점검자 성명</dt>
            <dd className="font-medium text-gray-800 mt-0.5">{doc.inspector_name || '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">점검 항목</h2>
        </div>
        {doc.check_items.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">점검 항목이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ tableLayout: 'fixed', minWidth: '720px' }}>
              <colgroup>
                <col style={{ width: 36 }} />
                <col />
                <col style={{ width: 120 }} />
                <col style={{ width: 220 }} />
              </colgroup>
              <thead>
                <tr className="bg-amber-50 border-b border-amber-100">
                  {['#', '점검내용', '점검결과', '조치사항'].map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold text-amber-800">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doc.check_items.map((item) => (
                  <tr key={item.seq} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-2 py-2 text-center text-gray-400">{item.seq}</td>
                    <td className="px-2 py-1.5">
                      <input
                        value={item.check_content}
                        onChange={(e) => updateItem(item.seq, 'check_content', e.target.value)}
                        className="w-full bg-transparent text-xs outline-none focus:bg-amber-50 focus:rounded focus:px-1"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={item.result}
                        onChange={(e) => updateItem(item.seq, 'result', e.target.value)}
                        className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1 bg-white"
                      >
                        {Object.entries(RESULT_LABEL).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={item.action_required}
                        onChange={(e) => updateItem(item.seq, 'action_required', e.target.value)}
                        className="w-full bg-transparent text-xs outline-none focus:bg-amber-50 focus:rounded focus:px-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">기타 특이사항</h2>
          <button onClick={() => (editing ? saveOpinion() : setEditing(true))} disabled={saving} className="btn-secondary text-xs gap-1.5">
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : editing ? (
              <>
                <Save className="w-3.5 h-3.5" />
                저장
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5" />
                편집
              </>
            )}
          </button>
        </div>
        {editing ? (
          <textarea value={opinion} onChange={(e) => setOpinion(e.target.value)} rows={4} className="input-base resize-none text-sm w-full" />
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{doc.overall_opinion || '기록된 특이사항이 없습니다.'}</p>
        )}
      </div>
    </div>
  )
}
