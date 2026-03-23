import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { RiskAssessment } from '@/types'

const EVAL_METHOD_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  matrix:      { label: '빈도강도법', color: '#2563eb', bg: '#eff6ff' },
  checklist:   { label: '체크리스트', color: '#16a34a', bg: '#f0fdf4' },
  three_level: { label: '3단계판단', color: '#d97706', bg: '#fffbeb' },
  ops:         { label: 'OPS',        color: '#7c3aed', bg: '#f5f3ff' },
}

const EVAL_TYPE_LABELS: Record<string, string> = {
  initial:    '최초평가',
  periodic:   '정기평가',
  special:    '수시평가',
  always_on:  '상시평가',
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:      { label: '작성 중',  cls: 'badge-draft'    },
  in_review:  { label: '검토 중',  cls: 'badge-review'   },
  approved:   { label: '승인완료', cls: 'badge-approved'  },
  archived:   { label: '보관',     cls: 'badge-draft'    },
}

export default async function RiskListPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string; type?: string }
}) {
  const supabase = createClient()
  const page     = Number(searchParams.page ?? 1)
  const pageSize = 15

  let query = supabase
    .from('risk_assessments')
    .select(`
      *,
      author:user_profiles!author_id(name, position),
      project:projects(name, site_name),
      items:risk_items(current_level)
    `, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.type)   query = query.eq('eval_type', searchParams.type)
  if (searchParams.q) {
    query = query.or(
      `title.ilike.%${searchParams.q}%,work_types.cs.{${searchParams.q}}`
    )
  }

  const { data: assessments, count, error } = await query

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-red-500 text-sm">
        데이터를 불러오는 중 오류가 발생했습니다.
      </div>
    )
  }

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  function riskSummary(items: { current_level: string }[] | null) {
    if (!items?.length) return { high: 0, medium: 0, low: 0 }
    return {
      high:   items.filter(i => i.current_level === 'high').length,
      medium: items.filter(i => i.current_level === 'medium').length,
      low:    items.filter(i => i.current_level === 'low').length,
    }
  }

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            위험성평가
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            위험성평가는 교육일지·작업계획서·순회점검일지의 허브 문서입니다.
          </p>
        </div>
        <Link href="/risk/new" className="btn-primary">
          <Plus className="w-4 h-4" /> 새 위험성평가
        </Link>
      </div>

      {/* 필터 + 검색 */}
      <div className="card p-4 mb-4">
        <form className="flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="평가명, 공종 검색..."
            className="input-base max-w-xs"
          />
          <select name="status" defaultValue={searchParams.status} className="input-base w-36">
            <option value="">전체 상태</option>
            <option value="draft">작성 중</option>
            <option value="in_review">검토 중</option>
            <option value="approved">승인완료</option>
          </select>
          <button type="submit" className="btn-secondary">검색</button>
          {(searchParams.q || searchParams.status) && (
            <Link href={`/risk/list${searchParams.type ? `?type=${searchParams.type}` : ''}`} className="btn-secondary text-gray-400">초기화</Link>
          )}
        </form>
      </div>

      {/* 목록 테이블 */}
      <div className="card overflow-hidden">
        {assessments?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <AlertTriangle className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">위험성평가가 없습니다.</p>
            <p className="text-xs mt-1">새 위험성평가를 작성해보세요.</p>
            <Link href="/risk/new" className="btn-primary mt-4 text-sm">
              <Plus className="w-4 h-4" /> 새 위험성평가 작성
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">평가명</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">현장</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">유형</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">위험도 분포</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">작성자</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">상태</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">수정일</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(assessments as (RiskAssessment & {
                author: { name: string; position: string } | null
                project: { name: string; site_name: string } | null
                items: { current_level: string }[] | null
              })[]).map(assessment => {
                const summary = riskSummary(assessment.items)
                const status  = STATUS_LABELS[assessment.status] ?? { label: assessment.status, cls: 'badge-draft' }
                return (
                  <tr key={assessment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/risk/${assessment.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {assessment.title}
                      </Link>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {assessment.work_types.slice(0, 3).join(', ')}
                        {assessment.work_types.length > 3 && ` 외 ${assessment.work_types.length - 3}건`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {assessment.project?.site_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-600">{EVAL_TYPE_LABELS[assessment.eval_type]}</span>
                        {(assessment as any).eval_method && (assessment as any).eval_method !== 'matrix' && (
                          <span className="inline-block text-[9px] px-1.5 py-0.5 rounded font-semibold"
                            style={{
                              background: EVAL_METHOD_LABELS[(assessment as any).eval_method]?.bg ?? '#f3f4f6',
                              color:      EVAL_METHOD_LABELS[(assessment as any).eval_method]?.color ?? '#374151',
                            }}>
                            {EVAL_METHOD_LABELS[(assessment as any).eval_method]?.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {summary.high > 0 && (
                          <span className="badge-high">{summary.high}건</span>
                        )}
                        {summary.medium > 0 && (
                          <span className="badge-medium">{summary.medium}건</span>
                        )}
                        {summary.low > 0 && (
                          <span className="badge-low">{summary.low}건</span>
                        )}
                        {!assessment.items?.length && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {assessment.author
                        ? `${assessment.author.name} (${assessment.author.position})`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={status.cls}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {format(new Date(assessment.updated_at), 'MM.dd HH:mm', { locale: ko })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/risk/${assessment.id}/edit`}
                          className="px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >편집</Link>
                        <Link
                          href={`/api/export/risk/${assessment.id}`}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                        >
                          <FileSpreadsheet className="w-3 h-3" /> 엑셀
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`/risk/list?page=${p}${searchParams.q ? `&q=${searchParams.q}` : ''}${searchParams.status ? `&status=${searchParams.status}` : ''}${searchParams.type ? `&type=${searchParams.type}` : ''}`}
              className={`w-8 h-8 flex items-center justify-center text-sm rounded-lg transition-colors
                ${p === page
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
