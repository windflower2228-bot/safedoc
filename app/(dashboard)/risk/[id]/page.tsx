import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  AlertTriangle, FileSpreadsheet, Edit2, ArrowLeft,
  CheckCircle2, Clock, BookOpen, ClipboardCheck,
  Shield, Link2,
} from 'lucide-react'
import DocumentPhotoSection from '@/components/common/DocumentPhotoSection'

type Params = { params: { id: string } }

const HAZARD_LABELS: Record<string, string> = {
  fall: '추락·전도', entanglement: '끼임', collision: '충돌',
  fire: '화재·폭발', hazmat: '유해물질', electrical: '감전',
  ergonomic: '근골격계', other: '기타',
}
const EVAL_TYPE_LABELS: Record<string, string> = {
  initial: '최초평가', periodic: '정기평가',
  special: '수시평가', always_on: '상시평가',
}

export default async function RiskDetailPage({ params }: Params) {
  const supabase = createClient()

  const { data: ra, error } = await supabase
    .from('risk_assessments')
    .select(`
      *,
      author:user_profiles!author_id(name, position),
      reviewer:user_profiles!reviewer_id(name, position),
      approver:user_profiles!approver_id(name, position),
      project:projects(name, site_name),
      items:risk_items(*),
      company:companies(name)
    `)
    .eq('id', params.id)
    .single()

  if (error || !ra) notFound()

  const items   = ((ra.items ?? []) as any[]).sort((a, b) => a.seq - b.seq)
  const company = ra.company as { name: string } | null
  const project = ra.project as { name: string; site_name: string } | null
  const author  = ra.author  as { name: string; position: string } | null

  const high   = items.filter(i => i.current_level === 'high').length
  const medium = items.filter(i => i.current_level === 'medium').length
  const low    = items.length - high - medium
  const eduItems  = items.filter(i => i.link_to_education)
  const planItems = items.filter(i => i.link_to_work_plan)

  const statusMap: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
    draft:     { label: '작성 중',  icon: Clock,          cls: 'text-gray-500' },
    in_review: { label: '검토 중',  icon: Clock,          cls: 'text-blue-500' },
    approved:  { label: '승인완료', icon: CheckCircle2,   cls: 'text-green-500' },
    archived:  { label: '보관',     icon: CheckCircle2,   cls: 'text-gray-400' },
  }
  const statusInfo = statusMap[ra.status] ?? statusMap.draft
  const StatusIcon = statusInfo.icon

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* 상단 헤더 */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/risk" className="mt-1 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{ra.title}</h1>
              <span className={`flex items-center gap-1 text-xs font-medium ${statusInfo.cls}`}>
                <StatusIcon className="w-3.5 h-3.5" /> {statusInfo.label}
              </span>
              <span className="text-xs text-gray-400">v{ra.version}</span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              {company?.name} · {project?.site_name ?? '현장 미지정'} ·{' '}
              {EVAL_TYPE_LABELS[ra.eval_type]}
              {(ra as any).eval_method && (ra as any).eval_method !== 'matrix' && (
                <span className="inline-block mx-1 text-[9px] px-1.5 py-0.5 rounded font-semibold"
                  style={{background:(ra as any).eval_method==='checklist'?'#f0fdf4':(ra as any).eval_method==='three_level'?'#fffbeb':'#f5f3ff',
                    color:(ra as any).eval_method==='checklist'?'#16a34a':(ra as any).eval_method==='three_level'?'#d97706':'#7c3aed'}}>
                  {(ra as any).eval_method==='checklist'?'체크리스트법':(ra as any).eval_method==='three_level'?'3단계판단법':'핵심요인기술법(OPS)'}
                </span>
              )} ·{' '}
              {format(new Date(ra.updated_at), 'yyyy.MM.dd HH:mm', { locale: ko })} 수정
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/api/export/risk/${ra.id}`} className="btn-secondary text-sm gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> 엑셀 출력
          </Link>
          <Link href={`/risk/${ra.id}/edit`} className="btn-primary text-sm gap-1.5">
            <Edit2 className="w-4 h-4" /> 편집
          </Link>
        </div>
      </div>

      {/* 기본정보 + 통계 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> 평가 기본정보
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['평가 기간', `${ra.eval_start_date} ~ ${ra.eval_end_date}`],
              ['평가 방법', (ra as any).eval_method === 'checklist' ? '체크리스트법' :
                           (ra as any).eval_method === 'three_level' ? '위험성 수준 3단계 판단법' :
                           (ra as any).eval_method === 'ops' ? '핵심요인 기술법(OPS)' :
                           `빈도·강도법 (${(ra as any).matrix_size ?? 5}×${(ra as any).matrix_size ?? 5})`],
              ['관련 공종', (ra.work_types as string[]).join(', ')],
              ['작성자', author ? `${author.name} (${author.position})` : '—'],
              ['개요', ra.overview || '—'],
            ].map(([label, value]) => (
              <div key={label} className={label === '개요' || label === '관련 공종' ? 'col-span-2' : ''}>
                <dt className="text-xs text-gray-400">{label}</dt>
                <dd className="text-gray-800 mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* 위험도 요약 */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">위험도 분포</h2>
          <div className="space-y-2.5">
            {[
              { label: '高위험 (즉시 개선)', count: high,   cls: 'bg-red-500' },
              { label: '中위험 (단기 개선)', count: medium, cls: 'bg-amber-400' },
              { label: '低위험 (허용)',       count: low,    cls: 'bg-green-500' },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">{s.label}</span>
                  <span className="font-semibold text-gray-800">{s.count}건</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.cls}`}
                    style={{ width: items.length > 0 ? `${(s.count / items.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
              전체 {items.length}개 항목
            </div>
          </div>
        </div>
      </div>

      {/* 연계 문서 패널 */}
      {(eduItems.length > 0 || planItems.length > 0) && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-500" /> 연계 가능 문서
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {eduItems.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium text-blue-800">안전보건교육일지</div>
                    <div className="text-xs text-blue-500">{eduItems.length}개 위험요인 자동 반영</div>
                  </div>
                </div>
                <Link href={`/documents/education/new?from=${ra.id}`} className="text-xs text-blue-600 font-medium hover:underline">
                  생성 →
                </Link>
              </div>
            )}
            {planItems.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-green-600" />
                  <div>
                    <div className="text-sm font-medium text-green-800">작업계획서</div>
                    <div className="text-xs text-green-600">{planItems.length}개 감소대책 자동 반영</div>
                  </div>
                </div>
                <Link href={`/documents/workplan/new?from=${ra.id}`} className="text-xs text-green-700 font-medium hover:underline">
                  생성 →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 위험요인 상세 테이블 */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">위험요인 평가 항목</h2>
          <span className="text-xs text-gray-400">총 {items.length}개</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['번호','작업 내용','유해위험요인','유형','가능성','중대성','점수','판정','공학적 대책','관리적 대책','보호구','담당자','기한','교육','계획'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item: any, i: number) => (
                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                  <td className="px-3 py-3 text-center font-medium text-gray-500">{item.seq}</td>
                  <td className="px-3 py-3 max-w-[140px]">
                    <div className="whitespace-pre-wrap text-gray-800">{item.work_content}</div>
                  </td>
                  <td className="px-3 py-3 max-w-[140px]">
                    <div className="whitespace-pre-wrap text-gray-600">{item.hazard_factor}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-gray-500">{HAZARD_LABELS[item.hazard_type] ?? '기타'}</td>
                  <td className="px-3 py-3 text-center">{item.current_probability}</td>
                  <td className="px-3 py-3 text-center">{item.current_severity}</td>
                  <td className="px-3 py-3 text-center font-bold text-gray-800">{item.current_score}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={
                      item.current_level === 'high' ? 'badge-high' :
                      item.current_level === 'medium' ? 'badge-medium' : 'badge-low'
                    }>
                      {item.current_level === 'high' ? '高' : item.current_level === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                  <td className="px-3 py-3 max-w-[120px] whitespace-pre-wrap text-gray-600">{item.engineering_measure || '—'}</td>
                  <td className="px-3 py-3 max-w-[120px] whitespace-pre-wrap text-gray-600">{item.admin_measure || '—'}</td>
                  <td className="px-3 py-3 max-w-[100px] whitespace-pre-wrap text-gray-600">{item.ppe_measure || '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-gray-600">{item.measure_owner || '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-gray-500">{item.measure_due_date || '—'}</td>
                  <td className="px-3 py-3 text-center">
                    {item.link_to_education
                      ? <span className="text-blue-500 font-bold">✓</span>
                      : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {item.link_to_work_plan
                      ? <span className="text-green-500 font-bold">✓</span>
                      : <span className="text-gray-200">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 비-matrix 평가 데이터 표시 */}
      {(ra as any).eval_method === 'checklist' && ((ra as any).checklist_items ?? []).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">
            체크리스트 점검 결과
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                {['#','분류','점검항목','결과','현황','개선대책'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {((ra as any).checklist_items as any[]).map((item: any, i: number) => (
                  <tr key={i} className={item.check_result === 'improve' ? 'bg-red-50/30' : ''}>
                    <td className="px-3 py-2.5 text-gray-400">{item.seq ?? i+1}</td>
                    <td className="px-3 py-2.5"><span className="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{item.category}</span></td>
                    <td className="px-3 py-2.5 text-gray-800">{item.hazard_factor}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                        item.check_result==='ok'?'bg-green-50 text-green-700':
                        item.check_result==='improve'?'bg-red-50 text-red-700':
                        'bg-gray-100 text-gray-400'}`}>
                        {item.check_result==='ok'?'적정':item.check_result==='improve'?'보완필요':'해당없음'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[150px] truncate">{item.current_status || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[150px] truncate">{item.improve_action || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(ra as any).eval_method === 'three_level' && ((ra as any).three_level_items ?? []).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">
            위험성 수준 3단계 판단 결과
          </div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['#','작업내용','유해위험요인','현재조치','위험수준','허용여부','감소대책'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {((ra as any).three_level_items as any[]).map((item: any, i: number) => (
                <tr key={i} className={item.risk_level==='high'?'bg-red-50/30':item.risk_level==='medium'?'bg-amber-50/20':''}>
                  <td className="px-3 py-2.5 text-gray-400">{item.seq ?? i+1}</td>
                  <td className="px-3 py-2.5 text-gray-800">{item.work_content || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-800">{item.hazard_factor}</td>
                  <td className="px-3 py-2.5 text-gray-600 max-w-[120px] truncate">{item.current_measure || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.risk_level==='high'?'bg-red-100 text-red-700':
                      item.risk_level==='medium'?'bg-amber-100 text-amber-700':
                      'bg-green-100 text-green-700'}`}>
                      {item.risk_level==='high'?'상(高)':item.risk_level==='medium'?'중(中)':'하(低)'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[9px] ${item.is_acceptable?'text-green-600':'text-red-600'}`}>
                      {item.is_acceptable ? '허용가능' : '개선필요'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 max-w-[150px] truncate">{item.reduce_measure || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(ra as any).eval_method === 'ops' && ((ra as any).ops_items ?? []).length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">핵심요인기술법(OPS) 시트</h2>
          {((ra as any).ops_items as any[]).map((item: any, i: number) => (
            <div key={i} className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-purple-700 text-white">
                <span className="font-semibold text-sm">OPS #{item.seq ?? i+1} — {item.work_name}</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-400 mb-1">작업 단계</div>
                  <div className="text-gray-800">{item.work_step || '—'}</div>
                  <div className="text-xs text-gray-400 mt-3 mb-1">⚠ 핵심 유해위험요인</div>
                  <div className="text-red-800 font-medium">{item.hazard_factor}</div>
                  <div className="text-xs text-gray-400 mt-2">예상 재해: {item.injury_type}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">현재 안전조치</div>
                  <div className="text-gray-800">{item.current_measure || '—'}</div>
                  {!item.is_sufficient && item.additional_measure && (
                    <>
                      <div className="text-xs text-orange-700 mt-3 mb-1">추가 조치사항</div>
                      <div className="text-orange-800">{item.additional_measure}</div>
                    </>
                  )}
                  {item.worker_pledge && (
                    <>
                      <div className="text-xs text-green-700 mt-3 mb-1">TBM 준수사항</div>
                      <div className="text-green-800">{item.worker_pledge}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DocumentPhotoSection
        category="risk_assessment"
        docId={ra.id}
        title="위험성평가 첨부 사진"
      />
    </div>
  )
}
