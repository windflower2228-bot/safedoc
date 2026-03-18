import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  if (!profile) redirect('/login')

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
