import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowLeft, FileDown, Edit2, Stamp,
  CheckCircle2, Clock, XCircle, Link2, Building2,
} from 'lucide-react'
import type { Designation } from '@/types/designation'
import { DOC_TYPE_LABELS } from '@/types/designation'
import DocumentPhotoSection from '@/components/common/DocumentPhotoSection'

type Params = { params: { id: string } }

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:  { label: '유효 중',  cls: 'text-green-600 bg-green-50' },
  expired: { label: '만료',    cls: 'text-gray-500 bg-gray-100' },
  revoked: { label: '취소됨',  cls: 'text-red-500 bg-red-50' },
}

export default async function DesignationDetailPage({ params }: Params) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('designations')
    .select(`*, author:user_profiles!author_id(name,position),
      project:projects(name,site_name), company:companies(name,address)`)
    .eq('id', params.id).single()

  if (error || !data) notFound()

  const doc     = data as Designation
  const company = doc.company as { name: string; address: string } | null
  const project = doc.project as { name: string; site_name: string } | null
  const duties  = (doc.duties ?? []) as string[]
  const st      = STATUS_MAP[doc.status] ?? STATUS_MAP.active
  const period  = doc.effective_date + (doc.expiry_date ? ` ~ ${doc.expiry_date}` : ' ~ 재임 기간 중')

  return (
    <div className="max-w-3xl mx-auto">
      {/* 화면 헤더 */}
      <div className="no-print flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/documents/designation"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Stamp className="w-5 h-5 text-purple-600" />
              {doc.role_label} {DOC_TYPE_LABELS[doc.doc_type]}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${st.cls}`}>
                {st.label}
              </span>
              <span className="text-xs text-gray-400 font-mono">{doc.doc_number}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/api/export/designation/${doc.id}`}
            className="btn-primary gap-1.5" style={{ background: '#7c3aed' }}>
            <FileDown className="w-4 h-4" /> PDF 출력
          </Link>
          <Link href={`/documents/designation/${doc.id}/edit`}
            className="btn-secondary gap-1.5">
            <Edit2 className="w-4 h-4" /> 편집
          </Link>
        </div>
      </div>

      {/* ── 인쇄용 문서 미리보기 ───────────────────────────── */}
      <div className="print-container bg-white card overflow-hidden">

        {/* 타이틀 */}
        <div style={{ background: '#1E3A5F' }} className="text-white text-center py-3">
          <div className="text-2xl font-black tracking-[6px]">
            {DOC_TYPE_LABELS[doc.doc_type].split('').join('  ')}
          </div>
        </div>
        <div style={{ background: '#2E6DA4' }} className="text-white text-xs px-4 py-1.5">
          문서번호: {doc.doc_number || '—'} &nbsp;|&nbsp; {company?.name}
          {project?.site_name && ` &nbsp;|&nbsp; ${project.site_name}`}
        </div>

        {/* 주제 박스 */}
        <div className="bg-blue-50 border-y border-blue-200 text-center py-4 px-4">
          <div className="text-xl font-black text-blue-900 tracking-wide mb-1">
            {doc.role_label} {DOC_TYPE_LABELS[doc.doc_type]}
          </div>
          <div className="text-sm text-blue-700">피지정자: {doc.person_name}</div>
        </div>

        <div className="p-6 space-y-5">
          {/* 피지정자 정보 */}
          <div>
            <div style={{ background: '#2E6DA4' }} className="text-white text-sm font-bold px-3 py-1.5 mb-0">
              ■ 피지정자 정보
            </div>
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr>
                  <td className="border border-gray-300 bg-gray-50 font-bold text-blue-900 text-center w-24 px-2 py-2">성 &nbsp;&nbsp; 명</td>
                  <td className="border border-gray-300 px-3 py-2 font-bold" style={{ width: '38%' }}>{doc.person_name}</td>
                  <td className="border border-gray-300 bg-gray-50 font-bold text-blue-900 text-center w-20 px-2 py-2">직 &nbsp; 위</td>
                  <td className="border border-gray-300 px-3 py-2">{doc.person_position}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 bg-gray-50 font-bold text-blue-900 text-center px-2 py-2">소 &nbsp;&nbsp; 속</td>
                  <td className="border border-gray-300 px-3 py-2">{doc.person_dept || '—'}</td>
                  <td className="border border-gray-300 bg-gray-50 font-bold text-blue-900 text-center px-2 py-2">주민등록</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-gray-500">
                    {doc.person_id_last4 ? `******-${doc.person_id_last4}***` : '—'}
                  </td>
                </tr>
                {doc.person_address && (
                  <tr>
                    <td className="border border-gray-300 bg-gray-50 font-bold text-blue-900 text-center px-2 py-2">주 &nbsp;&nbsp; 소</td>
                    <td className="border border-gray-300 px-3 py-2" colSpan={3}>{doc.person_address}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 지정 내용 */}
          <div>
            <div style={{ background: '#2E6DA4' }} className="text-white text-sm font-bold px-3 py-1.5 mb-0">
              ■ 지정 내용
            </div>
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr>
                  <td className="border border-gray-300 bg-gray-50 font-bold text-blue-900 text-center w-24 px-2 py-2">직 위 명</td>
                  <td className="border border-gray-300 px-3 py-2 font-bold">{doc.role_label}</td>
                  <td className="border border-gray-300 bg-gray-50 font-bold text-blue-900 text-center w-24 px-2 py-2">지정 기간</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{period}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 bg-gray-50 font-bold text-blue-900 text-center px-2 py-2">법적 근거</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm" colSpan={3}>{doc.legal_basis}</td>
                </tr>
                {doc.work_scope && (
                  <tr>
                    <td className="border border-gray-300 bg-gray-50 font-bold text-blue-900 text-center px-2 py-2 align-top">담당 작업</td>
                    <td className="border border-gray-300 px-3 py-2 whitespace-pre-line text-sm" colSpan={3}>{doc.work_scope}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 직무 목록 */}
          <div>
            <div style={{ background: '#2E6DA4' }} className="text-white text-sm font-bold px-3 py-1.5 mb-0">
              ■ 주요 직무
            </div>
            <table className="w-full text-sm border-collapse">
              <tbody>
                {duties.map((duty, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                    <td className="border border-gray-300 bg-gray-100 font-bold text-blue-900 text-center w-8 px-2 py-2">{idx + 1}</td>
                    <td className="border border-gray-300 px-3 py-2 leading-relaxed">{duty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 고지문 */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg text-center py-4 px-6 text-sm text-blue-900 leading-loose">
            위 사람을 <strong>{company?.name}{project?.site_name ? ` ${project.site_name}` : ''}</strong>의<br />
            <strong>【{doc.role_label}】</strong>으로 지정하고,<br />
            「{doc.legal_basis}」에 따른 주요 직무를 성실히 수행하여 줄 것을 당부합니다.
          </div>

          {/* 날짜 + 서명 */}
          <div className="text-center font-bold text-base tracking-widest">
            {doc.effective_date.replace(/-/g, '. ')}
          </div>

          <div className="flex justify-end">
            <div className="border border-gray-300 w-56 text-sm">
              <div className="flex border-b border-gray-300">
                <div className="bg-gray-50 font-bold text-blue-900 text-center w-14 py-2 px-1 border-r border-gray-300 flex-shrink-0">소 속</div>
                <div className="px-3 py-2 flex-1">{doc.issuer_company}</div>
              </div>
              <div className="flex border-b border-gray-300">
                <div className="bg-gray-50 font-bold text-blue-900 text-center w-14 py-2 px-1 border-r border-gray-300 flex-shrink-0">직 위</div>
                <div className="px-3 py-2 flex-1">{doc.issuer_position}</div>
              </div>
              <div className="flex border-b border-gray-300">
                <div className="bg-gray-50 font-bold text-blue-900 text-center w-14 py-2 px-1 border-r border-gray-300 flex-shrink-0">성 명</div>
                <div className="px-3 py-2 flex-1">{doc.issuer_name}</div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-400">
                <span>지정권자</span>
                <div className="w-10 h-10 rounded-full border-2 border-red-400 text-red-400 flex items-center justify-center text-xs font-bold">
                  (인)
                </div>
              </div>
            </div>
          </div>

          {/* 푸터 */}
          <div className="border-t border-gray-200 pt-3 text-xs text-gray-400 leading-relaxed">
            ※ 본 {DOC_TYPE_LABELS[doc.doc_type]}는 산업안전보건법령에 따라 발행된 공식 문서입니다.<br />
            ※ 지정된 직무를 성실히 수행하고, 변경 사항 발생 시 즉시 보고하여 주십시오.
          </div>

          <DocumentPhotoSection
            category="document_designation"
            docId={doc.id}
            title="지정서/선임서 첨부 사진"
          />
        </div>
      </div>
    </div>
  )
}
