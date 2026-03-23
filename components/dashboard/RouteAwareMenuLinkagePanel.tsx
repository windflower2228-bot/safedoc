'use client'

import { usePathname } from 'next/navigation'
import MenuLinkagePanel from '@/components/dashboard/MenuLinkagePanel'

export default function RouteAwareMenuLinkagePanel() {
  const pathname = usePathname()

  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return null
  }

  return <MenuLinkagePanel />
}
