import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, company:companies(*)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const admin = createAdminClient()

    // 첫 로그인 계정의 user_profiles가 비어 있으면 자동으로 기본 프로필을 생성한다.
    let companyId: string | null = null
    const { data: firstCompany } = await admin
      .from('companies')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    companyId = firstCompany?.id ?? null

    if (!companyId) {
      const { data: createdCompany } = await admin
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
      companyId = createdCompany?.id ?? null
    }

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

    const { error: bootstrapError } = await admin
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

    if (!bootstrapError) {
      redirect('/dashboard')
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-2">계정 초기 설정이 필요합니다</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            사용자 프로필 정보가 아직 생성되지 않아 대시보드를 불러올 수 없습니다.
            <br />
            관리자 계정에서 사용자 정보를 생성한 뒤 다시 로그인해 주세요.
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            로그인 화면으로 이동
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
          {children}
        </main>
      </div>
      {/* 모바일 하단 네비게이션 */}
      <MobileNav />
    </div>
  )
}
