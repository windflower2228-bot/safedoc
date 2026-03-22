import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowLeft, FileSpreadsheet, Printer, Edit2,
  CheckCircle2, Clock, Link2, Wrench, ShieldCheck, Users,
} from 'lucide-react'
import type { WorkPlan, WorkPlanRiskItem, WorkPlanWorker } from '@/types/workplan'
import { WORK_PLAN_TYPE_LABELS } from '@/types/workplan'

type Params = { params: { id: string } }

const LEVEL_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  high:   { label: '高', bg: 'bg-red-50',   text: 'text-red-700' },
  medium: { label: '中', bg: 'bg-amber-50', text: 'text-amber-700' },
  low:    { label: '低', bg: 'bg-green-50', text: 'text-green-700' },
}

export default async function WorkPlanDetailPage({ params }: Params) {
  const supabase = createClient()
  const { data: wp, error } = await supabase
    .from('work_plans')
    .select(`
      *,
      author:user_profiles!author_id(name, position),
      approved_user:user_profiles!approved_by(name, position),
      project:projects(name, site_name),
      source_risk:risk_assessments!source_risk_id(id, title, eval_type),
      company:companies(name, address)
    `)
    .eq('id', params.id)
    .single()

  if (error || !wp) notFound()

  const doc        = wp as unknown as WorkPlan
  const riskItems  = (doc.risk_items ?? []) as WorkPlanRiskItem[]
  const workers    = ((doc.workers ?? []) as WorkPlanWorker[]).filter(w => w.name?.trim())
  const company    = doc.company    as unknown as { name: string; address: string } | null
  const project    = doc.project    as unknown as { name: string; site_name: string } | null
  const author     = doc.author     as unknown as { name: string; position: string } | null
  const sourceRisk = doc.source_risk as unknown as { id: string; title: string } | null

  const highItems   = riskItems.filter(i => i.risk_level === 'high')
  const totalWorkers = riskItems.reduce((s, i) => s + (i.worker_count || 0), 0)

  return (
    <div className="max-w-5xl mx-auto">
      {/* 화면 헤더 */}
      <div className="no-print flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/documents/workplan"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={doc.status === 'approved'
                ? 'flex items-center gap-1 text-xs text-green-600'
                : 'flex items-center gap-1 text-xs text-gray-400'}>
                {doc.status === 'approved'
                  ? <><CheckCircle2 className="w-3.5 h-3.5" /> 승인 완료</>
                  : <><Clock className="w-3.5 h-3.5" /> 작성 중</>}
              </span>
              {sourceRisk && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Link2 className="w-3 h-3" /> 위험성평가 연계
                </span>
              )}
              <span className="text-xs text-gray-400">
                {WORK_PLAN_TYPE_LABELS[doc.plan_type as keyof typeof WORK_PLAN_TYPE_LABELS]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/api/export/workplan/${doc.id}`} className="btn-secondary text-sm gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> 엑셀 출력
          </Link>
          <button onClick={() => {}} className="btn-secondary text-sm gap-1.5"
            suppressHydrationWarning>
            <Printer className="w-4 h-4" /> 인쇄
          </button>
          <Link href={`/documents/workplan/${doc.id}/edit`} className="btn-primary text-sm gap-1.5"
            style={{ background: '#16a34a' }}>
            <Edit2 className="w-4 h-4" /> 편집
          </Link>
        </div>
      </div>

      {/* 인쇄 문서 */}
      <div className="print-container bg-white">

        {/* 타이틀 */}
        <div className="text-center mb-5 pb-4 border-b-2 border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 tracking-widest mb-1">
            작  업  계  획  서
          </h2>
          <p className="text-sm text-gray-500">
            {WORK_PLAN_TYPE_LABELS[doc.plan_type as keyof typeof WORK_PLAN_TYPE_LABELS]}
          </p>
        </div>

        {/* 기본정보 테이블 */}
        <table className="w-full text-sm border-collapse mb-4 no-page-break">
          <tbody>
            <tr>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 w-24 text-center">작업명</td>
              <td className="border border-gray-400 px-3 py-2 font-medium" colSpan={3}>{doc.title}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 text-center">작업 기간</td>
              <td className="border border-gray-400 px-3 py-2">
                {doc.work_start_date} ~ {doc.work_end_date}
                {doc.work_start_time && ` / ${doc.work_start_time}`}
                {doc.work_end_time && ` ~ ${doc.work_end_time}`}
              </td>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 w-24 text-center">작업 장소</td>
              <td className="border border-gray-400 px-3 py-2">{doc.work_location}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 text-center">작업 책임자</td>
              <td className="border border-gray-400 px-3 py-2">
                {doc.supervisor_name || '—'}
                {doc.supervisor_position && ` (${doc.supervisor_position})`}
                {doc.supervisor_phone && ` / ${doc.supervisor_phone}`}
              </td>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 text-center">사업장</td>
              <td className="border border-gray-400 px-3 py-2">
                {company?.name} {project?.site_name && `/ ${project.site_name}`}
              </td>
            </tr>
            {sourceRisk && (
              <tr>
                <td className="border border-gray-400 bg-green-50 font-semibold px-3 py-2 text-center text-green-800">위험성평가</td>
                <td className="border border-gray-400 px-3 py-2 text-green-800" colSpan={3}>{sourceRisk.title}</td>
              </tr>
            )}
            <tr>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 text-center">관계 법령</td>
              <td className="border border-gray-400 px-3 py-2 text-xs text-gray-600" colSpan={3}>{doc.legal_basis || '—'}</td>
            </tr>
            {doc.work_scope && (
              <tr>
                <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 text-center align-top">작업 개요</td>
                <td className="border border-gray-400 px-3 py-2 whitespace-pre-wrap text-xs leading-relaxed" colSpan={3}>
                  {doc.work_scope}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 종합 안전대책 */}
        {doc.safety_summary && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-2">종합 안전대책</h3>
            <div className="border border-gray-300 rounded p-3 bg-green-50 text-xs whitespace-pre-wrap leading-relaxed text-gray-700">
              {doc.safety_summary}
            </div>
          </div>
        )}

        {/* 위험요인별 작업계획 */}
        <h3 className="text-sm font-bold text-gray-800 mb-2 mt-5">위험요인별 작업계획 및 감소대책</h3>
        {riskItems.map((item, idx) => {
          const ls = LEVEL_STYLE[item.risk_level] ?? LEVEL_STYLE.low
          return (
            <div key={idx} className="mb-4 border border-gray-300 rounded overflow-hidden no-page-break">
              {/* 항목 헤더 */}
              <div className={`flex items-center gap-3 px-3 py-2 ${ls.bg}`}>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${ls.text} border border-current`}>
                  {ls.label}
                </span>
                <span className="text-sm font-semibold text-gray-800 flex-1">
                  {item.work_content.split('\n')[0]}
                </span>
                <span className="text-xs text-gray-500">담당: {item.measure_owner || '—'}</span>
                {item.measure_due_date && (
                  <span className="text-xs text-gray-500">기한: {item.measure_due_date}</span>
                )}
              </div>

              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr>
                    <td className="border border-gray-200 bg-gray-50 font-semibold px-2 py-1.5 w-28 text-center">유해·위험요인</td>
                    <td className="border border-gray-200 px-2 py-1.5" colSpan={3}>{item.hazard_factor}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 bg-gray-50 font-semibold px-2 py-1.5 text-center align-top">
                      <Wrench className="w-3 h-3 mx-auto mb-0.5" />공학적 대책
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5">{item.engineering_measure || '—'}</td>
                    <td className="border border-gray-200 bg-gray-50 font-semibold px-2 py-1.5 w-24 text-center align-top">
                      <ShieldCheck className="w-3 h-3 mx-auto mb-0.5" />관리적 대책
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5">{item.admin_measure || '—'}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 bg-gray-50 font-semibold px-2 py-1.5 text-center">보호구</td>
                    <td className="border border-gray-200 px-2 py-1.5" colSpan={3}>{item.ppe_measure || '—'}</td>
                  </tr>
                  {item.work_method && (
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 font-semibold px-2 py-1.5 text-center align-top">작업 방법</td>
                      <td className="border border-gray-200 px-2 py-1.5 whitespace-pre-wrap leading-relaxed" colSpan={3}>
                        {item.work_method}
                      </td>
                    </tr>
                  )}
                  {item.equipment_needed && (
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 font-semibold px-2 py-1.5 text-center">필요 장비</td>
                      <td className="border border-gray-200 px-2 py-1.5" colSpan={3}>{item.equipment_needed}</td>
                    </tr>
                  )}
                  {item.check_items && (
                    <tr>
                      <td className="border border-gray-200 bg-green-50 font-semibold px-2 py-1.5 text-center align-top text-green-800">점검 항목</td>
                      <td className="border border-gray-200 px-2 py-1.5 whitespace-pre-wrap leading-relaxed font-mono" colSpan={3}>
                        {item.check_items}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        })}

        {/* 작업 인원 */}
        {workers.length > 0 && (
          <div className="page-break-before">
            <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" /> 작업 투입 인원
            </h3>
            <table className="w-full text-xs border-collapse mb-4">
              <thead>
                <tr className="bg-gray-800 text-white">
                  {['번호','성명','직종/직위','담당 역할','보유 자격증'].map(h => (
                    <th key={h} className="border border-gray-600 px-2 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workers.map((w, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-2 py-2 text-center">{i + 1}</td>
                    <td className="border border-gray-300 px-2 py-2 font-medium">{w.name}</td>
                    <td className="border border-gray-300 px-2 py-2">{w.position}</td>
                    <td className="border border-gray-300 px-2 py-2">{w.role}</td>
                    <td className="border border-gray-300 px-2 py-2">{w.license || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 서명란 */}
        <div className="mt-6 pt-4 border-t-2 border-gray-800">
          <p className="text-xs text-gray-500 mb-4">
            위와 같이 작업계획서를 작성하였으며 안전한 작업을 실시할 것을 확인합니다.
            &nbsp;&nbsp; {doc.work_start_date} &nbsp;&nbsp; {company?.name}
          </p>
          <div className="grid grid-cols-4 gap-4">
            {[
              { role: '작성자',           name: author?.name ?? '' },
              { role: '작업 책임자',      name: doc.supervisor_name ?? '' },
              { role: '안전보건관리책임자', name: '' },
              { role: '도급인 확인',       name: '' },
            ].map(s => (
              <div key={s.role} className="border border-gray-400 rounded">
                <div className="bg-gray-100 text-center text-xs font-semibold py-1.5 border-b border-gray-400">{s.role}</div>
                <div className="text-center text-sm font-medium py-1">{s.name}</div>
                <div className="border-t border-gray-300 h-10" />
                <div className="text-center text-xs text-gray-400 py-1">서명 / 날인</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
