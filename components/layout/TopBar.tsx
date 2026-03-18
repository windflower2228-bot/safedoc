'use client'

import { useRouter } from 'next/navigation'
import { Bell, LogOut, Settings, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { UserProfile } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  super_admin:   '슈퍼관리자',
  company_admin: '회사관리자',
  manager:       '담당자',
  viewer:        '열람자',
}

interface Props { profile: UserProfile & { company?: { name: string } } }

export default function TopBar({ profile }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('로그아웃 되었습니다.')
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
      {/* 검색 */}
      <div className="flex-1 max-w-md">
        <input
          type="search"
          placeholder="문서명, 현장명, 공종명으로 검색..."
          className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* 알림 버튼 */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* 사용자 드롭다운 */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-700">{profile.name.charAt(0)}</span>
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-medium text-gray-900 leading-none">{profile.name}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{ROLE_LABELS[profile.role] ?? profile.role}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="text-xs font-medium text-gray-900">{profile.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">{profile.email}</div>
                </div>
                <button
                  onClick={() => { setOpen(false); router.push('/settings/profile') }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-3.5 h-3.5 text-gray-400" /> 프로필 설정
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-3.5 h-3.5" /> 로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
