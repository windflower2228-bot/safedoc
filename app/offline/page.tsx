// app/offline/page.tsx — 오프라인 폴백 페이지
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#1E3A5F" strokeWidth="1.5">
            <path d="M18 3v10M18 23v10M3 18h10M23 18h10"/>
            <circle cx="18" cy="18" r="5"/>
            <path d="M7 7l5 5M24 24l5 5M7 29l5-5M24 12l5-5" opacity=".4"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">오프라인 상태입니다</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          인터넷 연결이 없어 페이지를 불러올 수 없습니다.<br/>
          네트워크 연결 후 다시 시도해주세요.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          다시 시도
        </button>
        <p className="text-xs text-gray-400 mt-4">
          이전에 열었던 페이지는 캐시에서 불러올 수 있습니다.
        </p>
      </div>
    </div>
  )
}
