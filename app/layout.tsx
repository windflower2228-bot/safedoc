import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { PwaRegister, PwaInstallBanner } from '@/components/pwa/PwaRegister'
import './globals.css'

export const metadata: Metadata = {
  title:         'SafeDoc — 산업안전보건 문서 통합관리',
  description:   '위험성평가를 허브로 삼아 산업안전보건 문서를 자동 연계·생성·관리하는 실무용 플랫폼',
  keywords:      ['산업안전보건', '위험성평가', '안전문서관리', '안전교육', 'MSDS'],
  manifest:      '/manifest.json',
  appleWebApp: {
    capable:        true,
    statusBarStyle: 'default',
    title:          'SafeDoc',
  },
  icons: {
    icon:  [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png' }],
  },
}

export const viewport: Viewport = {
  width:               'device-width',
  initialScale:        1,
  maximumScale:        1,      // 핀치줌 방지 (폼 입력 시 확대 방지)
  userScalable:        false,
  themeColor:          '#1E3A5F',
  viewportFit:         'cover', // 노치·홈바 영역까지 활용
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* iOS PWA 추가 메타 */}
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
        <meta name="apple-mobile-web-app-title" content="SafeDoc"/>
        <link rel="apple-touch-icon" href="/icons/icon-192.png"/>
        <link rel="apple-touch-startup-image" href="/icons/icon-512.png"/>
      </head>
      <body className="font-sans antialiased bg-gray-50">
        {children}
        <PwaRegister/>
        <PwaInstallBanner/>
        <Toaster position="top-right" richColors closeButton/>
      </body>
    </html>
  )
}
