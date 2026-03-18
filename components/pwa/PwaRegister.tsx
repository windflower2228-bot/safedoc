'use client'
// components/pwa/PwaRegister.tsx
// 앱 로드 시 Service Worker 등록 + 설치 프롬프트 처리

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    deferredPrompt: any
  }
}

export function PwaRegister() {
  useEffect(() => {
    // Service Worker 등록
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          console.log('[SafeDoc PWA] SW registered:', reg.scope)
        })
        .catch(err => {
          console.warn('[SafeDoc PWA] SW registration failed:', err)
        })
    }

    // 설치 프롬프트 이벤트 저장
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault()
      window.deferredPrompt = e
    })
  }, [])

  return null
}

// 홈 화면에 추가 버튼 (조건부 표시)
export function PwaInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // PWA로 실행 중이 아닐 때만 표시
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true

    if (!isStandalone) {
      const dismissed = sessionStorage.getItem('pwa-banner-dismissed')
      if (!dismissed) {
        const timer = setTimeout(() => setShow(true), 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  async function handleInstall() {
    const prompt = window.deferredPrompt
    if (prompt) {
      prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') setShow(false)
      window.deferredPrompt = null
    } else {
      // iOS 안내
      alert('Safari 브라우저에서 → 공유 버튼 → "홈 화면에 추가"를 탭하세요.')
    }
  }

  function dismiss() {
    sessionStorage.setItem('pwa-banner-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden">
      <div className="bg-white border border-blue-200 rounded-2xl shadow-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5">
            <rect x="3" y="3" width="14" height="14" rx="3"/>
            <path d="M10 7v6M7 10h6"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900">홈 화면에 추가</div>
          <div className="text-xs text-gray-400 mt-0.5">앱처럼 바로 실행할 수 있습니다.</div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={dismiss} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">나중에</button>
          <button onClick={handleInstall}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700">
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
