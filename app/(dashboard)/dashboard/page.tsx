import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AlertTriangle, FileText, Plus, TrendingUp, Clock, CheckCircle2, Bell } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const now = new Date()
  const todayDate = format(now, 'yyyy-MM-dd')

  const [
    { count: totalRisk },
    { count: draftRisk },
    { data: recentDocs },
    { data: profile },
    { data: todayPlanItems },
    { count: totalTodayPlan },
    { count: doneTodayPlan },
    { data: todayWorklogs },
    { data: latestWorklog },
    { count: updatedTodayRisk },
  ] = await Promise.all([
    supabase.from('risk_assessments').select('*', { count: 'exact', head: true }),
    supabase.from('risk_assessments').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('risk_assessments')
      .select('id, title, status, eval_type, work_types, updated_at, author:user_profiles!author_id(name)')
      .order('updated_at', { ascending: false })
      .limit(6),
    supabase.from('user_profiles').select('name, position, company:companies(name)').eq('id', user!.id).single(),
    supabase
      .from('activity_items')
      .select('id, title, scheduled_date, scheduled_time, is_completed, activity_type')
      .eq('scheduled_date', todayDate)
      .order('scheduled_time', { ascending: true })
      .limit(6),
    supabase.from('activity_items').select('*', { count: 'exact', head: true }).eq('scheduled_date', todayDate),
    supabase
      .from('activity_items')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', todayDate)
      .eq('is_completed', true),
    supabase
      .from('worklog_analyses')
      .select('id, upload_date, file_name, detected_worktypes, summary, created_at')
      .eq('upload_date', todayDate)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('worklog_analyses')
      .select('id, upload_date, file_name, detected_worktypes, summary, created_at')
      .order('upload_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('risk_assessments')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', `${todayDate}T00:00:00`),
  ])

  const approvedRisk  = (totalRisk ?? 0) - (draftRisk ?? 0)
  const completionPct = totalRisk ? Math.round((approvedRisk / totalRisk) * 100) : 0
  const todayPlanPct = totalTodayPlan ? Math.round(((doneTodayPlan ?? 0) / totalTodayPlan) * 100) : 0
  const worklogRows = (todayWorklogs && todayWorklogs.length > 0) ? todayWorklogs : (latestWorklog ?? [])
  const hasTodayWorklog = Boolean(todayWorklogs && todayWorklogs.length > 0)

  const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
    draft:     { label: '작성 중',  cls: 'badge-draft' },
    in_review: { label: '검토 중',  cls: 'badge-review' },
    approved:  { label: '승인완료', cls: 'badge-approved' },
  }

  const companyRaw = profile?.company as unknown
  const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw
  const companyName = (company as { name?: string } | null)?.name ?? '회사 미지정'
  const profileName = profile?.name?.trim() || user?.email?.split('@')[0] || '사용자'
  const profilePosition = profile?.position?.trim() || '직책 미지정'

  return (
    <div className="space-y-6">
      {/* 인사 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          안녕하세요, {profileName}님 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {companyName} · {profilePosition} ·{' '}
          {format(new Date(), 'yyyy년 M월 d일 (eee)', { locale: ko })}
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: '전체 위험성평가',
            value: totalRisk ?? 0,
            icon: AlertTriangle,
            color: 'text-amber-500',
            bg:    'bg-amber-50',
            href:  '/risk',
          },
          {
            label: '작성 중',
            value: draftRisk ?? 0,
            icon: Clock,
            color: 'text-blue-500',
            bg:    'bg-blue-50',
            href:  '/risk?status=draft',
          },
          {
            label: '승인 완료',
            value: approvedRisk,
            icon: CheckCircle2,
            color: 'text-green-500',
            bg:    'bg-green-50',
            href:  '/risk?status=approved',
          },
          {
            label: '이행률',
            value: `${completionPct}%`,
            icon: TrendingUp,
            color: 'text-purple-500',
            bg:    'bg-purple-50',
            href:  '/plan',
          },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href} className="card p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-2.5 rounded-xl`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* 한눈에 보는 오늘 핵심 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">활동계획</h2>
            <Link href="/plan" className="text-xs text-blue-600 hover:underline">전체 보기</Link>
          </div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500">오늘 일정 완료</p>
              <p className="text-xl font-bold text-gray-900">{doneTodayPlan ?? 0}/{totalTodayPlan ?? 0}</p>
            </div>
            <p className="text-sm font-semibold text-green-600">{todayPlanPct}%</p>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${todayPlanPct}%` }} />
          </div>
          <div className="space-y-2">
            {todayPlanItems?.length === 0 && (
              <p className="text-xs text-gray-400 py-1">오늘 등록된 활동계획이 없습니다.</p>
            )}
            {todayPlanItems?.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="text-gray-800 truncate">{item.title}</p>
                  <p className="text-gray-400 mt-0.5">{item.scheduled_time || '시간 미지정'}</p>
                </div>
                <span className={item.is_completed ? 'text-green-600' : 'text-amber-600'}>
                  {item.is_completed ? '완료' : '예정'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">오늘 작업내용</h2>
            <Link href="/worklog" className="text-xs text-blue-600 hover:underline">분석 보기</Link>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {hasTodayWorklog ? '오늘 등록된 작업일보 분석 내용입니다.' : '오늘 데이터가 없어 최근 작업일보를 표시합니다.'}
          </p>
          <div className="space-y-3">
            {worklogRows.length === 0 && (
              <p className="text-xs text-gray-400 py-1">작업일보 분석 이력이 아직 없습니다.</p>
            )}
            {worklogRows.slice(0, 2).map((row) => {
              const workTypes = Array.isArray(row.detected_worktypes) ? row.detected_worktypes : []
              return (
                <div key={row.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                  <p className="text-xs font-medium text-gray-800 line-clamp-2">{row.summary || '요약 없음'}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {workTypes.slice(0, 3).map((wt) => (
                      <span key={`${row.id}-${wt}`} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {wt}
                      </span>
                    ))}
                    {workTypes.length === 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">공종 미감지</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">위험성평가 내용</h2>
            <Link href="/risk" className="text-xs text-blue-600 hover:underline">전체 보기</Link>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <p className="text-[11px] text-amber-700">오늘 수정</p>
              <p className="text-base font-bold text-amber-800">{updatedTodayRisk ?? 0}건</p>
            </div>
            <div className="rounded-lg bg-blue-50 px-3 py-2">
              <p className="text-[11px] text-blue-700">작성 중</p>
              <p className="text-base font-bold text-blue-800">{draftRisk ?? 0}건</p>
            </div>
          </div>
          <div className="space-y-2">
            {recentDocs?.slice(0, 3).map((doc) => {
              const st = STATUS_STYLE[doc.status] ?? { label: doc.status, cls: 'badge-draft' }
              return (
                <Link
                  key={doc.id}
                  href={`/risk/${doc.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                >
                  <p className="text-xs text-gray-800 truncate">{doc.title}</p>
                  <span className={st.cls}>{st.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* 최근 문서 + 빠른 접근 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* 최근 위험성평가 */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">최근 위험성평가</h2>
            <Link href="/risk" className="text-xs text-blue-600 hover:underline">전체 보기</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentDocs?.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-400">
                아직 위험성평가가 없습니다.
              </div>
            )}
            {recentDocs?.map(doc => {
              const st = STATUS_STYLE[doc.status] ?? { label: doc.status, cls: 'badge-draft' }
              const authorRaw = doc.author as unknown
              const author = Array.isArray(authorRaw) ? authorRaw[0] : authorRaw
              const authorName = (author as { name?: string } | null)?.name ?? ''
              const workTypes = Array.isArray(doc.work_types) ? doc.work_types : []
              const updatedAt = doc.updated_at ? new Date(doc.updated_at) : null
              const updatedAtLabel =
                updatedAt && !Number.isNaN(updatedAt.getTime())
                  ? format(updatedAt, 'MM.dd')
                  : '-'
              return (
                <Link
                  key={doc.id}
                  href={`/risk/${doc.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {doc.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {workTypes.slice(0, 2).join(', ') || '공종 미지정'}
                      {authorName && ` · ${authorName}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={st.cls}>{st.label}</span>
                    <span className="text-xs text-gray-300">{updatedAtLabel}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* 빠른 작업 */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">빠른 작업</h2>
            <div className="space-y-2">
              {[
                { href: '/risk/new',   icon: Plus,      label: '새 위험성평가 작성',    color: 'text-blue-600 bg-blue-50' },
                { href: '/upload',     icon: FileText,  label: '작업일보 업로드·분석',  color: 'text-purple-600 bg-purple-50' },
                { href: '/plan',       icon: Bell,      label: '이번 달 활동계획 확인', color: 'text-green-600 bg-green-50' },
              ].map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* 알림 카드 */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-400" />
              D-day 알림
            </h2>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-gray-800">합동안전보건점검</div>
                  <div className="text-xs text-red-500 mt-0.5">D-2 · 기한 임박</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-gray-800">안전보건 협의체 회의</div>
                  <div className="text-xs text-amber-600 mt-0.5">D-7</div>
                </div>
              </div>
              <Link href="/plan" className="block text-xs text-blue-600 hover:underline mt-1">
                전체 일정 보기 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
