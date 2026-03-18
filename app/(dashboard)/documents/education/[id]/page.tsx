import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  BookOpen, ArrowLeft, FileSpreadsheet, Printer,
  Link2, Users, CheckCircle2, Edit2, Clock,
} from 'lucide-react'
import type { EducationJournal, EduItem, Attendee } from '@/types/education'
import { EDU_TYPE_LABELS } from '@/types/education'

type Params = { params: { id: string } }

const LEVEL_STYLE: Record<string, { label: string; cls: string; print: string }> = {
  high:   { label: '高', cls: 'badge-high',   print: '高' },
  medium: { label: '中', cls: 'badge-medium', print: '中' },
  low:    { label: '低', cls: 'badge-low',    print: '低' },
}

export default async function EducationDetailPage({ params }: Params) {
  const supabase = createClient()

  const { data: journal, error } = await supabase
    .from('education_journals')
    .select(`
      *,
      author:user_profiles!author_id(name, position, phone),
      project:projects(name, site_name, site_address),
      source_risk:risk_assessments!source_risk_id(id, title, eval_type, eval_start_date),
      company:companies(name, address, logo_url)
    `)
    .eq('id', params.id)
    .single()

  if (error || !journal) notFound()

  const doc       = journal as EducationJournal
  const items     = (doc.edu_items ?? []) as EduItem[]
  const attendees = (doc.attendees ?? []) as Attendee[]
  const company   = doc.company as { name: string; address: string; logo_url: string | null } | null
  const project   = doc.project as { name: string; site_name: string } | null
  const author    = doc.author  as { name: string; position: string; phone: string | null } | null
  const sourceRisk = doc.source_risk as { id: string; title: string; eval_type: string } | null
  const realAttendees = attendees.filter(a => a.name?.trim())

  return (
    <div className="max-w-5xl mx-auto">

      {/* 화면용 헤더 — 인쇄 시 숨김 */}
      <div className="no-print flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/documents/education" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              {doc.title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={doc.status === 'completed' ? 'flex items-center gap-1 text-xs text-green-600' : 'flex items-center gap-1 text-xs text-gray-400'}>
                {doc.status === 'completed'
                  ? <><CheckCircle2 className="w-3.5 h-3.5" /> 완료</>
                  : <><Clock className="w-3.5 h-3.5" /> 작성 중</>}
              </span>
              {sourceRisk && (
                <span className="flex items-center gap-1 text-xs text-blue-500">
                  <Link2 className="w-3 h-3" />
                  위험성평가 연계
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/api/export/education/${doc.id}`} className="btn-secondary text-sm gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> 엑셀 출력
          </Link>
          <button onClick={() => window.print()} className="btn-secondary text-sm gap-1.5">
            <Printer className="w-4 h-4" /> 인쇄
          </button>
          <Link href={`/documents/education/${doc.id}/edit`} className="btn-primary text-sm gap-1.5">
            <Edit2 className="w-4 h-4" /> 편집
          </Link>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          인쇄 전용 문서 — @media print 에서 이 부분만 출력
          ════════════════════════════════════════════════════════ */}
      <div className="print-container bg-white">

        {/* 문서 제목 */}
        <div className="text-center mb-5 pb-4 border-b-2 border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 tracking-widest mb-1">
            안전보건교육일지
          </h2>
          <p className="text-sm text-gray-500">
            {EDU_TYPE_LABELS[doc.edu_type as keyof typeof EDU_TYPE_LABELS]}
          </p>
        </div>

        {/* 기본 정보 테이블 */}
        <table className="w-full text-sm border-collapse mb-4 no-page-break">
          <tbody>
            <tr>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 w-24 text-center">교육명</td>
              <td className="border border-gray-400 px-3 py-2 font-medium" colSpan={3}>{doc.title}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 text-center">교육 일시</td>
              <td className="border border-gray-400 px-3 py-2">
                {doc.edu_date}
                {doc.edu_start_time && ` ${doc.edu_start_time}`}
                {doc.edu_end_time && ` ~ ${doc.edu_end_time}`}
                {doc.edu_duration_hours && (
                  <span>
                    {` (${doc.edu_duration_hours}시간`}
                    {doc.worker_type && (
                      <span className={doc.edu_duration_hours ? ' text-green-600 font-bold' : ' text-red-600 font-bold'}>
                        {doc.edu_duration_hours ? ' ✓' : ' ⚠ 미달'}
                      </span>
                    )}
                    {')'}
                  </span>
                )}
              </td>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 w-20 text-center">교육 장소</td>
              <td className="border border-gray-400 px-3 py-2">{doc.edu_location || '—'}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 text-center">근무형태</td>
              <td className="border border-gray-400 px-3 py-2">
                {doc.worker_type ? WORKER_TYPE_LABELS[doc.worker_type as WorkerType] : '—'}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 text-center">강사</td>
              <td className="border border-gray-400 px-3 py-2">
                {doc.instructor_name || '—'}
                {doc.instructor_position && ` (${doc.instructor_position})`}
                {doc.instructor_affil && ` / ${doc.instructor_affil}`}
              </td>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 text-center">참석 인원</td>
              <td className="border border-gray-400 px-3 py-2 font-semibold">{realAttendees.length}명</td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 text-center">사업장</td>
              <td className="border border-gray-400 px-3 py-2">{company?.name || '—'}</td>
              <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 text-center">현장명</td>
              <td className="border border-gray-400 px-3 py-2">{project?.site_name || '—'}</td>
            </tr>
            {sourceRisk && (
              <tr>
                <td className="border border-gray-400 bg-blue-50 font-semibold px-3 py-2 text-center text-blue-700">
                  위험성평가 연계
                </td>
                <td className="border border-gray-400 px-3 py-2 text-blue-700" colSpan={3}>
                  {sourceRisk.title}
                </td>
              </tr>
            )}
            {doc.edu_content && (
              <tr>
                <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-2 text-center align-top">교육 목적</td>
                <td className="border border-gray-400 px-3 py-2 whitespace-pre-wrap text-xs leading-relaxed" colSpan={3}>
                  {doc.edu_content}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 교육 항목 상세 */}
        <h3 className="text-sm font-bold text-gray-800 mb-2 mt-5">교육 항목 상세</h3>
        <table className="w-full text-xs border-collapse mb-4">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-600 px-2 py-2 text-center w-8">번호</th>
              <th className="border border-gray-600 px-2 py-2 text-left w-28">작업 내용</th>
              <th className="border border-gray-600 px-2 py-2 text-left w-28">유해·위험요인</th>
              <th className="border border-gray-600 px-2 py-2 text-center w-10">위험도</th>
              <th className="border border-gray-600 px-2 py-2 text-left">교육 핵심 포인트</th>
              <th className="border border-gray-600 px-2 py-2 text-left w-40">관계 법령</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const ls = LEVEL_STYLE[item.risk_level] ?? LEVEL_STYLE.low
              return (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-2 py-2 text-center font-bold">{item.seq}</td>
                  <td className="border border-gray-300 px-2 py-2 align-top whitespace-pre-wrap">{item.work_content}</td>
                  <td className="border border-gray-300 px-2 py-2 align-top whitespace-pre-wrap">{item.hazard_factor}</td>
                  <td className={`border border-gray-300 px-2 py-2 text-center font-bold
                    ${item.risk_level === 'high' ? 'text-red-700 bg-red-50' :
                      item.risk_level === 'medium' ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50'}`}>
                    {ls.label}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 align-top whitespace-pre-wrap leading-relaxed">{item.edu_point}</td>
                  <td className="border border-gray-300 px-2 py-2 align-top text-[10px] text-gray-500 leading-relaxed">{item.legal_basis}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* 참석자 명단 */}
        <div className="page-break-before">
          <h3 className="text-sm font-bold text-gray-800 mb-2">교육 참석자 명단</h3>
          <table className="w-full text-xs border-collapse mb-4">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-600 px-2 py-2 text-center w-10">번호</th>
                <th className="border border-gray-600 px-2 py-2 text-left w-28">성명</th>
                <th className="border border-gray-600 px-2 py-2 text-left w-28">직종/직위</th>
                <th className="border border-gray-600 px-2 py-2 text-left w-32">소속</th>
                <th className="border border-gray-600 px-2 py-2 text-center">서명</th>
              </tr>
            </thead>
            <tbody>
              {/* 입력된 참석자 */}
              {realAttendees.map((a, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-2 py-2.5 text-center">{idx + 1}</td>
                  <td className="border border-gray-300 px-2 py-2.5 font-medium">{a.name}</td>
                  <td className="border border-gray-300 px-2 py-2.5">{a.position}</td>
                  <td className="border border-gray-300 px-2 py-2.5">{a.department}</td>
                  <td className="border border-gray-300 px-2 py-2.5 text-center">
                    <div className="h-8 inline-block w-20 border-b border-gray-300"></div>
                  </td>
                </tr>
              ))}
              {/* 빈 서명 행 (최소 5행) */}
              {Array.from({ length: Math.max(0, 5 - realAttendees.length) }, (_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-gray-300 px-2 py-2.5 text-center text-gray-300">{realAttendees.length + i + 1}</td>
                  <td className="border border-gray-300 px-2 py-5"></td>
                  <td className="border border-gray-300 px-2 py-5"></td>
                  <td className="border border-gray-300 px-2 py-5"></td>
                  <td className="border border-gray-300 px-2 py-5"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 확인 서명 */}
        <div className="mt-6 pt-4 border-t-2 border-gray-800">
          <p className="text-xs text-gray-500 mb-4">
            위와 같이 안전보건교육을 실시하였음을 확인합니다.
            &nbsp;&nbsp;&nbsp; {doc.edu_date} &nbsp;&nbsp;&nbsp;
            {company?.name}
          </p>
          <div className="grid grid-cols-3 gap-6">
            {[
              { role: '교육 실시자 (강사)', name: doc.instructor_name || '' },
              { role: '안전보건관리책임자', name: '' },
              { role: '확인자 (관리감독자)', name: '' },
            ].map(s => (
              <div key={s.role} className="border border-gray-400 rounded">
                <div className="bg-gray-100 text-center text-xs font-semibold py-1.5 px-2 border-b border-gray-400">{s.role}</div>
                <div className="text-center text-sm font-medium py-1.5">{s.name}</div>
                <div className="border-t border-gray-300 h-12"></div>
                <div className="text-center text-xs text-gray-400 py-1">서명 / 날인</div>
              </div>
            ))}
          </div>
        </div>

      </div>
      {/* /print-container */}

    </div>
  )
}
