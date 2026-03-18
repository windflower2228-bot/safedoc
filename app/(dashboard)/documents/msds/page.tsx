// app/(dashboard)/documents/msds/page.tsx — MSDS 목록
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FlaskConical, BookOpen, Download, Globe } from 'lucide-react'
import { GHS_LABELS, GHS_COLORS, type GhsHazardClass } from '@/types/msds'

export default async function MsdsListPage({
  searchParams,
}: {
  searchParams: { q?: string; is_public?: string }
}) {
  const supabase = createClient()

  let query = supabase
    .from('msds_records')
    .select(`
      id, product_name, product_code, cas_number,
      manufacturer, ghs_hazards, signal_word,
      is_public, status, revision_date, file_name,
      legal_classification,
      created_at, author:user_profiles!author_id(name)
    `, { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (searchParams.q)
    query = query.ilike('product_name', `%${searchParams.q}%`)
  if (searchParams.is_public === 'true')
    query = query.eq('is_public', true)

  const { data: records, count } = await query

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-cyan-600" />
            MSDS 관리대장
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">총 {count ?? 0}종 등록됨</p>
        </div>
        <Link href="/documents/msds/new"
          className="btn-primary" style={{ background: '#0891b2' }}>
          <Plus className="w-4 h-4" /> MSDS 등록
        </Link>
      </div>

      {/* 필터 */}
      <div className="card p-4 mb-4">
        <form className="flex flex-wrap gap-3">
          <input name="q" defaultValue={searchParams.q}
            placeholder="제품명, CAS 번호 검색..."
            className="input-base max-w-xs" />
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" name="is_public" value="true"
              defaultChecked={searchParams.is_public === 'true'}
              className="w-4 h-4 accent-cyan-600" />
            공용 자료만 보기
          </label>
          <button type="submit" className="btn-secondary">검색</button>
          {(searchParams.q || searchParams.is_public) && (
            <Link href="/documents/msds" className="btn-secondary text-gray-400">초기화</Link>
          )}
        </form>
      </div>

      {/* 목록 */}
      <div className="card overflow-hidden">
        {(!records || records.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FlaskConical className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">등록된 MSDS가 없습니다.</p>
            <Link href="/documents/msds/new"
              className="btn-primary mt-4 text-sm"
              style={{ background: '#0891b2' }}>
              <Plus className="w-4 h-4" /> MSDS 등록하기
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['제품명','CAS 번호','제조사','GHS 유해성','신호어','특별관리물질','공용','파일','작업'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(records as any[]).map(rec => (
                <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/documents/msds/${rec.id}`}
                      className="font-medium text-gray-900 hover:text-cyan-600 transition-colors">
                      {rec.product_name}
                    </Link>
                    {rec.product_code && (
                      <div className="text-xs text-gray-400 mt-0.5">{rec.product_code}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                    {rec.cas_number || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {rec.manufacturer || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {((rec.ghs_hazards ?? []) as GhsHazardClass[]).slice(0, 3).map(h => {
                        const c = GHS_COLORS[h]
                        return (
                          <span key={h}
                            className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-full ${c.bg} ${c.text}`}>
                            {GHS_LABELS[h]}
                          </span>
                        )
                      })}
                      {(rec.ghs_hazards ?? []).length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{rec.ghs_hazards.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {rec.signal_word === 'danger'
                      ? <span className="text-red-600 font-medium">위험</span>
                      : rec.signal_word === 'warning'
                      ? <span className="text-amber-600 font-medium">경고</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  {/* 특별관리물질 여부 */}
                  <td className="px-4 py-3 text-center">
                    {(rec as any).legal_classification?.is_special
                      ? <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold whitespace-nowrap">🔴 특별관리물질</span>
                      : (rec as any).legal_classification?.special_checked_at
                      ? <span className="text-[10px] text-gray-300">해당없음</span>
                      : <span className="text-[10px] text-gray-200">미확인</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {rec.is_public
                      ? <Globe className="w-3.5 h-3.5 text-cyan-500 mx-auto" />
                      : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {rec.file_name
                      ? <span className="text-cyan-600">{rec.file_name.slice(0, 15)}...</span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/documents/msds/${rec.id}`}
                        className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg"
                        title="상세 보기">
                        <FlaskConical className="w-3.5 h-3.5" />
                      </Link>
                      <Link href={`/documents/education/new?msds=${rec.id}`}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="교육일지 자동 생성">
                        <BookOpen className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
