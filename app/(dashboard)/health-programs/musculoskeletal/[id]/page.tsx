'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Printer, Users, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

const SURVEY_TYPE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  initial:   { label:'최초조사', color:'#2563eb', bg:'#eff6ff' },
  regular:   { label:'정기조사', color:'#16a34a', bg:'#f0fdf4' },
  immediate: { label:'수시조사', color:'#dc2626', bg:'#fef2f2' },
}

export default function MusculoskeletalDetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/health-programs/musculoskeletal/${params.id}`)
      .then(r => r.json()).then(j => { setDoc(j.data); setLoading(false) })
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const sc = SURVEY_TYPE_LABEL[doc.survey_type] ?? SURVEY_TYPE_LABEL.regular
  const burdenItems: any[] = doc.burden_work_check ?? []
  const applicable = burdenItems.filter((b: any) => b.is_applicable)
  const symptoms: any[] = doc.symptom_survey ?? []
  const improvements: any[] = doc.improvement_plan ?? []

  return (
    <div className="max-w-5xl mx-auto print:max-w-full">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/health-programs/musculoskeletal" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600"/>근골격계 유해요인조사</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{doc.doc_number}</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="btn-secondary gap-1.5"><Printer className="w-4 h-4"/>출력</button>
      </div>

      {/* 기본정보 */}
      <div className="card p-5 mb-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div><div className="text-xs text-gray-400">조사 유형</div>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:sc.bg,color:sc.color}}>{sc.label}</span></div>
          <div><div className="text-xs text-gray-400">조사일</div><div className="font-medium text-gray-900 mt-0.5">{doc.survey_date}</div></div>
          <div><div className="text-xs text-gray-400">부서명</div><div className="font-medium text-gray-900 mt-0.5">{doc.dept_name}</div></div>
          <div><div className="text-xs text-gray-400">작업명</div><div className="font-medium text-gray-900 mt-0.5">{doc.work_name}</div></div>
        </div>
      </div>

      {/* 부담작업 판정 결과 */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3 text-sm">근골격계부담작업 판정 결과</h2>
        {applicable.length > 0 ? (
          <div className="p-3 bg-red-50 rounded-xl border border-red-100 mb-3">
            <div className="font-semibold text-red-700 text-sm mb-2">⚠ {applicable.length}가지 부담작업 해당 → 유해요인조사 의무 발생</div>
            <div className="space-y-1.5">
              {applicable.map((b: any) => (
                <div key={b.seq} className="flex items-start gap-2 text-xs text-red-800">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500"/>
                  <span>{b.seq}. {b.description}{b.work_hours_per_day ? ` (일 ${b.work_hours_per_day})` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-green-50 rounded-xl border border-green-100 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4"/><span>부담작업 해당 없음</span>
          </div>
        )}
      </div>

      {/* 기본조사 */}
      {doc.basic_survey && (doc.basic_survey.work_situation || doc.basic_survey.work_condition) && (
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">유해요인 기본조사</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {doc.basic_survey.work_situation && (
              <div><div className="text-xs text-gray-400 mb-1">작업장 상황</div>
                <div className="text-gray-700 leading-relaxed">{doc.basic_survey.work_situation}</div></div>
            )}
            {doc.basic_survey.work_condition && (
              <div><div className="text-xs text-gray-400 mb-1">작업 조건</div>
                <div className="text-gray-700 leading-relaxed">{doc.basic_survey.work_condition}</div></div>
            )}
          </div>
          {doc.basic_survey.symptoms_present && (
            <div className="mt-3 p-2.5 bg-amber-50 rounded-lg text-xs text-amber-700 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0"/>징후·증상 호소 근로자 있음
            </div>
          )}
        </div>
      )}

      {/* 증상조사 */}
      {symptoms.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">근골격계질환 증상조사</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                {['근로자','부서','나이/성별','경력','통증 신체부위','비고'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {symptoms.map((w: any, i: number) => {
                  const painParts = (w.body_parts ?? []).filter((b: any) => b.pain_level > 0)
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2.5 font-medium text-gray-900">{w.worker_name || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{w.dept || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{w.age || '—'} / {w.sex || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{w.career_years ? `${w.career_years}년` : '—'}</td>
                      <td className="px-3 py-2.5">
                        {painParts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {painParts.map((b: any) => (
                              <span key={b.part} className={clsx('text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                                b.pain_level >= 4 ? 'bg-red-100 text-red-700' :
                                b.pain_level >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600')}>
                                {b.part}({b.pain_level})
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-gray-300">없음</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{w.special_note || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 개선계획 */}
      {improvements.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">작업환경 개선계획</div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['우선순위','대상 작업','유해요인','개선 조치','담당자','기한','완료'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {improvements.map((p: any, i: number) => (
                <tr key={i} className={p.done ? 'opacity-60' : ''}>
                  <td className="px-3 py-2.5">
                    <span className={clsx('text-[9px] px-1.5 py-0.5 rounded font-bold',
                      p.priority==='高'?'bg-red-50 text-red-700':p.priority==='中'?'bg-amber-50 text-amber-700':'bg-gray-50 text-gray-500')}>
                      {p.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-800">{p.target_work}</td>
                  <td className="px-3 py-2.5 text-gray-600">{p.hazard}</td>
                  <td className="px-3 py-2.5 text-gray-700 max-w-[200px]">{p.measure}</td>
                  <td className="px-3 py-2.5 text-gray-600">{p.responsible || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{p.due_date || '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    {p.done ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto"/> : <XCircle className="w-4 h-4 text-gray-200 mx-auto"/>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 서명란 */}
      <div className="card p-5">
        <div className="grid grid-cols-3 gap-6 text-center text-sm">
          {['조사자','관리감독자','사업주(또는 안전보건관리책임자)'].map(r => (
            <div key={r} className="border-t-2 border-gray-300 pt-4">
              <div className="text-xs text-gray-400 mb-1">{r}</div>
              <div className="h-8"/>
              <div className="text-xs text-gray-400">(서명)</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
