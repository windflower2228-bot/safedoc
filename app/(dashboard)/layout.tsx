import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import RouteAwareMenuLinkagePanel from '@/components/dashboard/RouteAwareMenuLinkagePanel'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  let bootstrapErrMsg = ''

  // RLS 상태와 무관하게 서비스 권한으로 현재 사용자 프로필을 조회/복구한다.
  const { data: initialProfile, error: initialProfileError } = await admin
    .from('user_profiles')
    .select('*, company:companies(*)')
    .eq('id', user.id)
    .maybeSingle()

  if (initialProfileError) {
    bootstrapErrMsg = `[read_profile] ${initialProfileError.message}`
    console.error('dashboard bootstrap read_profile failed', {
      userId: user.id,
      error: initialProfileError,
    })
  }

  let profile = initialProfile

  const needsBootstrap = !profile || !profile.company_id
  if (needsBootstrap) {
    let companyId = profile?.company_id ?? null

    if (!companyId) {
      const { data: firstCompany, error: firstCompanyError } = await admin
        .from('companies')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (firstCompanyError) {
        bootstrapErrMsg = `[read_company] ${firstCompanyError.message}`
        console.error('dashboard bootstrap read_company failed', {
          userId: user.id,
          error: firstCompanyError,
        })
      }

      companyId = firstCompany?.id ?? null
    }

    if (!companyId) {
      const { data: createdCompany, error: createCompanyError } = await admin
        .from('companies')
        .insert({
          name: '기본 회사',
          biz_number: null,
          ceo_name: '',
          address: '',
          industry: '',
        })
        .select('id')
        .single()

      if (createCompanyError) {
        bootstrapErrMsg = `[create_company] ${createCompanyError.message}`
        console.error('dashboard bootstrap create_company failed', {
          userId: user.id,
          error: createCompanyError,
        })
      }

      companyId = createdCompany?.id ?? null
    }

    if (companyId) {
      const candidateRole = String(user.user_metadata?.role ?? '')
      const role =
        candidateRole === 'super_admin' ||
        candidateRole === 'company_admin' ||
        candidateRole === 'manager' ||
        candidateRole === 'viewer'
          ? candidateRole
          : 'company_admin'

      const displayName =
        String(user.user_metadata?.name ?? '').trim() ||
        user.email?.split('@')[0] ||
        '사용자'
      const displayPosition = String(user.user_metadata?.position ?? '').trim()

      const { error: upsertError } = await admin
        .from('user_profiles')
        .upsert(
          {
            id: user.id,
            company_id: companyId,
            email: user.email ?? '',
            name: displayName,
            position: displayPosition || '담당자',
            role,
            is_active: true,
          },
          { onConflict: 'id' }
        )

      if (upsertError) {
        bootstrapErrMsg = `[upsert_profile] ${upsertError.message}`
        console.error('dashboard bootstrap upsert_profile failed', {
          userId: user.id,
          companyId,
          error: upsertError,
        })
      } else {
        const { data: repairedProfile, error: repairedProfileError } = await admin
          .from('user_profiles')
          .select('*, company:companies(*)')
          .eq('id', user.id)
          .maybeSingle()

        if (repairedProfileError) {
          bootstrapErrMsg = `[re_read_profile] ${repairedProfileError.message}`
          console.error('dashboard bootstrap re_read_profile failed', {
            userId: user.id,
            error: repairedProfileError,
          })
        } else {
          profile = repairedProfile
        }
      }
    } else if (!bootstrapErrMsg) {
      bootstrapErrMsg = '[company_id] missing'
    }
  }

  if (!profile || !profile.company_id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-2">계정 초기 설정을 자동 복구하지 못했습니다</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-3">
            서버에서 프로필 자동 생성/연결을 시도했지만 완료되지 않았습니다.
            <br />
            잠시 후 다시 로그인하면 재시도됩니다.
          </p>
          {bootstrapErrMsg && (
            <p className="text-[11px] text-red-500 mb-4 break-all">{bootstrapErrMsg}</p>
          )}
          <a
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            로그인 다시 하기
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 사이드바: 데스크톱만 표시 */}
      <div className="hidden md:block">
        <Sidebar profile={profile} />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar profile={profile} />
        {/* 메인 콘텐츠: 모바일에서 하단 네비 공간 확보 */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="mb-4">
            <RouteAwareMenuLinkagePanel />
          </div>
          {children}
        </main>
      </div>
      {/* 모바일 하단 네비게이션 */}
      <MobileNav />
    </div>
  )
}
