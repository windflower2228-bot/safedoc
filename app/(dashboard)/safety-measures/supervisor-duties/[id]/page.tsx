'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Shield, Loader2, CheckCircle2, Circle,
  Printer, ChevronDown, ChevronUp, Save, Link2,
} from 'lucide-react'
import { clsx } from 'clsx'
import { CATEGORY_LABELS } from '@/types/supervisor-duties'

export default function SupervisorDutyDetailPage({ params }: { params: { id: string } }) {
  const [doc,      setDoc]      = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [items,    setItems]    = useState<any[]>([])

  useEffect(() => {
    fetch(`/api/safety-measures/supervisor-duties/${params.id}`)
      .then(r => r.json()).then(j => {
        setDoc(j.data)
        setItems(j.data?.duty_items ?? [])
        setLoading(false)
      })
  }, [params.id])

  function toggleCheck(dutyIdx: number, field: 'checked_duties' | 'checked_preChecks', value: string) {
    setItems(prev => prev.map((item, i) => {
      if (i !== dutyIdx) return item
      const arr: string[] = item[field] ?? []
      const next = arr.includes(value) ? arr.filter((v: string) => v !== value) : [...arr, value]
      return { ...item, [field]: next }
    }))
  }

  function updateField(dutyIdx: number, field: string, value: string) {
    setItems(prev => prev.map((item, i) => i === dutyIdx ? { ...item, [field]: value } : item))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/safety-measures/supervisor-duties/${params.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duty_items: items, status: 'completed' }),
    })
    setSaving(false)
    if (res.ok) { toast.success('저장되었습니다.'); setDoc((p: any) => ({ ...p, status: 'completed' })) }
    else toast.error('저장 실패')
  }

  function printDoc() {
    window.print()
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  return (
    <div>
      {/* 헤더 — 화면용 */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/safety-measures/supervisor-duties" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4"/>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600"/>
              관리감독자의 유해위험방지업무
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 font-mono">{doc.doc_number}</span>
              {doc.linked_risk_id && (
                <span className="text-xs text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full">
                  <Link2 className="w-3 h-3"/>위험성평가 연계
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={printDoc}
            className="btn-secondary text-sm gap-1.5">
            <Printer className="w-4 h-4"/> 출력 (별도 출력)
          </button>
          <button onClick={save} disabled={saving}
            className="btn-primary text-sm" style={{background:'#dc2626'}}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            저장·완료
          </button>
        </div>
      </div>

      {/* 인쇄용 헤더 */}
      <div className="hidden print:block mb-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold tracking-widest mb-1">관리감독자의 유해·위험 방지 업무</h1>
          <p className="text-sm text-gray-500">산업안전보건기준에 관한 규칙 제35조제1항 / [별표 2·3]</p>
        </div>
        <table className="w-full border-collapse text-sm mb-4">
          <tbody>
            <tr>
              <td className="border border-gray-400 bg-gray-50 px-3 py-2 w-28 text-center font-semibold">문서번호</td>
              <td className="border border-gray-400 px-3 py-2">{doc.doc_number}</td>
              <td className="border border-gray-400 bg-gray-50 px-3 py-2 w-28 text-center font-semibold">작업일자</td>
              <td className="border border-gray-400 px-3 py-2">{doc.work_date}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-50 px-3 py-2 text-center font-semibold">관리감독자</td>
              <td className="border border-gray-400 px-3 py-2">{doc.supervisor_name} ({doc.supervisor_position})</td>
              <td className="border border-gray-400 bg-gray-50 px-3 py-2 text-center font-semibold">작업위치</td>
              <td className="border border-gray-400 px-3 py-2">{doc.work_location}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 기본정보 카드 */}
      <div className="grid grid-cols-4 gap-3 mb-4 print:hidden">
        <div className="card p-3"><div className="text-[9px] text-gray-400 mb-0.5">관리감독자</div><div className="text-xs font-semibold">{doc.supervisor_name}</div><div className="text-[10px] text-gray-500">{doc.supervisor_position}</div></div>
        <div className="card p-3"><div className="text-[9px] text-gray-400 mb-0.5">작업일자</div><div className="text-xs font-semibold">{doc.work_date}</div></div>
        <div className="card p-3"><div className="text-[9px] text-gray-400 mb-0.5">작업위치</div><div className="text-xs font-semibold">{doc.work_location||'—'}</div></div>
        <div className="card p-3"><div className="text-[9px] text-gray-400 mb-0.5">적용 항목</div><div className="text-xs font-semibold text-red-600">{items.length}개</div></div>
      </div>

      {/* 별표2·3 항목별 체크리스트 */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const cat = CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] ?? CATEGORY_LABELS.other
          const doneD = (item.checked_duties ?? []).length
          const doneP = (item.checked_preChecks ?? []).length
          const totalD = (item.duties ?? []).length
          const totalP = (item.preChecks ?? []).length
          return (
            <div key={item.duty_id} className="card overflow-hidden print:break-inside-avoid">
              {/* 섹션 헤더 */}
              <button
                onClick={() => setExpanded(expanded === item.duty_id ? null : item.duty_id)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:opacity-90 transition-opacity print:hidden"
                style={{ background: cat.bg }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: cat.color }}>{item.workType}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'white', color: cat.color }}>
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-gray-500">{item.legalRef}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px]" style={{ color: cat.color }}>
                    직무 {doneD}/{totalD} · 점검 {doneP}/{totalP}
                  </span>
                  {expanded === item.duty_id
                    ? <ChevronUp className="w-4 h-4" style={{ color: cat.color }}/>
                    : <ChevronDown className="w-4 h-4" style={{ color: cat.color }}/>}
                </div>
              </button>

              {/* 인쇄용 항목 헤더 */}
              <div className="hidden print:flex items-center gap-3 px-4 py-2 border-b border-gray-300" style={{ background: cat.bg }}>
                <span className="font-bold text-sm" style={{ color: cat.color }}>{item.workType}</span>
                <span className="text-xs text-gray-500">({item.legalRef})</span>
              </div>

              {/* 내용 — 화면: 아코디언 / 인쇄: 항상 표시 */}
              <div className={clsx(expanded === item.duty_id ? 'block' : 'hidden', 'print:block')}>
                <div className="p-5 grid grid-cols-2 gap-5">
                  {/* 직무수행내용 [별표2] */}
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      직무수행내용 <span className="text-[10px] text-gray-400 font-normal">[별표 2]</span>
                    </div>
                    <div className="space-y-2">
                      {(item.duties ?? []).map((duty: string, di: number) => {
                        const checked = (item.checked_duties ?? []).includes(duty)
                        return (
                          <label key={di} className="flex items-start gap-2 cursor-pointer group print:cursor-default">
                            <button type="button"
                              onClick={() => toggleCheck(idx, 'checked_duties', duty)}
                              className="flex-shrink-0 mt-0.5 print:hidden">
                              {checked
                                ? <CheckCircle2 className="w-4 h-4 text-green-600"/>
                                : <Circle className="w-4 h-4 text-gray-300 group-hover:text-gray-400"/>}
                            </button>
                            {/* 인쇄용 체크박스 */}
                            <span className="hidden print:inline w-4 h-4 border border-gray-400 inline-flex items-center justify-center flex-shrink-0 mt-0.5">
                              {checked ? '✓' : ''}
                            </span>
                            <span className={clsx('text-xs leading-relaxed', checked ? 'text-green-800 line-through' : 'text-gray-700')}>
                              {duty}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* 작업시작 전 점검사항 [별표3] */}
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      작업시작 전 점검사항 <span className="text-[10px] text-gray-400 font-normal">[별표 3]</span>
                    </div>
                    <div className="space-y-2">
                      {(item.preChecks ?? []).map((chk: string, ci: number) => {
                        const checked = (item.checked_preChecks ?? []).includes(chk)
                        return (
                          <label key={ci} className="flex items-start gap-2 cursor-pointer group print:cursor-default">
                            <button type="button"
                              onClick={() => toggleCheck(idx, 'checked_preChecks', chk)}
                              className="flex-shrink-0 mt-0.5 print:hidden">
                              {checked
                                ? <CheckCircle2 className="w-4 h-4 text-blue-600"/>
                                : <Circle className="w-4 h-4 text-gray-300 group-hover:text-gray-400"/>}
                            </button>
                            <span className="hidden print:inline w-4 h-4 border border-gray-400 inline-flex items-center justify-center flex-shrink-0 mt-0.5">
                              {checked ? '✓' : ''}
                            </span>
                            <span className={clsx('text-xs leading-relaxed', checked ? 'text-blue-800 line-through' : 'text-gray-700')}>
                              {chk}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* 이상사항·조치 */}
                <div className="px-5 pb-5 pt-0 grid grid-cols-2 gap-4 print:hidden">
                  <div>
                    <label className="label-base">이상사항</label>
                    <textarea value={item.deviations ?? ''} onChange={e => updateField(idx, 'deviations', e.target.value)}
                      rows={2} className="input-base resize-none text-xs" placeholder="이상 발견 내용을 기재하세요."/>
                  </div>
                  <div>
                    <label className="label-base">조치내용</label>
                    <textarea value={item.actions ?? ''} onChange={e => updateField(idx, 'actions', e.target.value)}
                      rows={2} className="input-base resize-none text-xs" placeholder="취한 조치를 기재하세요."/>
                  </div>
                </div>

                {/* 인쇄용 이상사항 */}
                <div className="hidden print:grid grid-cols-2 gap-4 px-5 pb-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">이상사항</div>
                    <div className="border border-gray-300 rounded p-2 min-h-[50px] text-xs">{item.deviations || ''}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">조치내용</div>
                    <div className="border border-gray-300 rounded p-2 min-h-[50px] text-xs">{item.actions || ''}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 인쇄용 서명란 */}
      <div className="hidden print:block mt-8">
        <div className="flex justify-end gap-16 text-sm">
          <div className="text-center">
            <div className="mb-8">관리감독자</div>
            <div className="border-b border-gray-400 w-32 mb-1"></div>
            <div className="text-xs text-gray-500">{doc.supervisor_name} (인)</div>
          </div>
          <div className="text-center">
            <div className="mb-8">안전관리자</div>
            <div className="border-b border-gray-400 w-32 mb-1"></div>
            <div className="text-xs text-gray-500">(인)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
