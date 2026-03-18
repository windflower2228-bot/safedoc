'use client'
// components/layout/MobileNav.tsx — 모바일 하단 네비게이션 바

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, AlertTriangle, CalendarDays,
  ClipboardCheck, Plus,
} from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { href: '/dashboard',              icon: LayoutDashboard, label: '홈'    },
  { href: '/risk',                   icon: AlertTriangle,   label: '위험성평가' },
  { href: '/risk/new',               icon: Plus,            label: '작성',   primary: true },
  { href: '/documents/inspection',   icon: ClipboardCheck,  label: '점검'   },
  { href: '/plan',                   icon: CalendarDays,    label: '계획표' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex items-center justify-around px-1 py-1">
        {NAV_ITEMS.map(item => {
          const Icon     = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          if (item.primary) {
            return (
              <Link key={item.href} href={item.href}
                className="flex flex-col items-center -mt-5">
                <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
                  <Icon className="w-6 h-6 text-white"/>
                </div>
                <span className="text-[9px] text-blue-600 font-medium mt-0.5">{item.label}</span>
              </Link>
            )
          }

          return (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors"
              style={{ minWidth: 56 }}>
              <Icon className={clsx('w-5 h-5 transition-colors',
                isActive ? 'text-blue-600' : 'text-gray-400')}/>
              <span className={clsx('text-[10px] font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-gray-400')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
