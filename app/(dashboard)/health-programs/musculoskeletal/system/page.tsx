'use client'

import Link from 'next/link'
import { ArrowLeft, Activity } from 'lucide-react'

export default function MusculoskeletalSystemPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/health-programs/musculoskeletal"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              근골격계 유해요인조사 도구
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              문서 작성 흐름과 동일하게 보이도록 대시보드형 레이아웃을 임베드 모드로 정리했습니다.
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <iframe
          src="/tools/msd_prevention_system.html?embed=1&start=step2"
          title="근골격계 유해요인조사 도구"
          className="w-full h-[calc(100vh-220px)] min-h-[900px] border-0"
        />
      </div>
    </div>
  )
}
