// app/(dashboard)/documents/designation/page.tsx — 지정서·선임서 목록
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus, Stamp, FileDown, Edit2, CheckCircle2, Clock, XCircle } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  active:  { label: '유효',   cls: 'text-green-600 bg-green-50',  Icon: CheckCircle2 },
  expired: { label: '만료',   cls: 'text-gray-500 bg-gray-100',   Icon: Clock },
  revoked: { label: '취소됨', cls: 'text-red-500 bg-red-50',      Icon: XCircle },
}
const DOC_TYPE_COLOR: Record<string, string> = {
  designation: 'bg-purple-100 text-purple-700',
  appointment: 'bg-blue-100 text-blue-700',
}

export default async function DesignationListPage({
  searchParams,
}: {
  searchParams: { q?: string; doc_type?: string }
}) {
  const supabase = createClient()
  let query = supabase
    .from('designations')
    .select(`
      id, doc_type, role_label, doc_number,
      person_name, person_position, person_dept,
      effective_date, expiry_date, status, created_at,
      author:user_profiles!author_id(name),
      project:projects(site_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (searchParams.q)        query = query.or(`person_name.ilike.%${searchParams.q}%,role_label.ilike.%${searchParams.q}%`)
  if (searchParams.doc_type) query = query.eq('doc_type', searchParams.doc_type)

  const { data: docs, count } = await query

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Stamp className="w-5 h-5 text-purple-600" />
            지정서 · 선임서
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">총 {count ?? 0}건</p>
        </div>
        <Link href="/documents/designation/new"
          className="btn-primary" style={{ background: '#7c3aed' }}>
          <Plus className="w-4 h-4" /> 새 지정서 · 선임서
        </Link>
      </div>

      {/* 필터 */}
      <div className="card p-4 mb-4">
        <form className="flex flex-wrap gap-3">
          <input name="q" defaultValue={searchParams.q}
            placeholder="성명, 직위명 검색..."
            className="input-base max-w-xs" />
          <select name="doc_type" defaultValue={searchParams.doc_type}
            className="input-base w-32">
            <option value="">전체</option>
            <option value="designation">지정서</option>
            <option value="appointment">선임서</option>
          </select>
          <button type="submit" className="btn-secondary">검색</button>
          {(searchParams.q || searchParams.doc_type) && (
            <Link href="/documents/designation" className="btn-secondary text-gray-400">초기화</Link>
          )}
        </form>
      </div>

      {/* 목록 */}
      <div className="card overflow-hidden">
        {(!docs || docs.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Stamp className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">지정서·선임서가 없습니다.</p>
            <Link href="/documents/designation/new"
              className="btn-primary mt-4 text-sm"
              style={{ background: '#7c3aed' }}>
              <Plus className="w-4 h-4" /> 새로 작성하기
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['문서 종류','직위명','문서 번호','피지정자','현장','유효 기간','상태','작업'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(docs as any[]).map(doc => {
                const st   = STATUS_MAP[doc.status] ?? STATUS_MAP.active
                const Icon = st.Icon
                const proj = doc.project as { site_name: string } | null
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${DOC_TYPE_COLOR[doc.doc_type]}`}>
                        {doc.doc_type === 'appointment' ? '선임서' : '지정서'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/documents/designation/${doc.id}`}
                        className="font-medium text-gray-900 hover:text-purple-600 transition-colors">
                        {doc.role_label}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{doc.doc_number || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{doc.person_name}</div>
                      <div className="text-xs text-gray-400">{doc.person_position}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{proj?.site_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {doc.effective_date}
                      {doc.expiry_date && <span className="text-gray-300"> ~ {doc.expiry_date}</span>}
                      {!doc.expiry_date && <span className="text-gray-300"> ~ 재임</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${st.cls}`}>
                        <Icon className="w-3 h-3" />{st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/api/export/designation/${doc.id}`}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="PDF 출력">
                          <FileDown className="w-3.5 h-3.5" />
                        </Link>
                        <Link href={`/documents/designation/${doc.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="편집">
                          <Edit2 className="w-3.5 h-3.5" />
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
    </div>
  )
}
