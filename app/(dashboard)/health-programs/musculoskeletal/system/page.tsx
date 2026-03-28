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
              근골격계 유해요인조사 통합 시스템
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              요청하신 코드(msd_prevention_system)를 우선 반영한 화면입니다.
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <iframe
          src="/tools/msd_prevention_system.html"
          title="근골격계 유해요인조사 통합 시스템"
          className="w-full h-[calc(100vh-220px)] min-h-[900px] border-0"
        />
      </div>
    </div>
  )
}
