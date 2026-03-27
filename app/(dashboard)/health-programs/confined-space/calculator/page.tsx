'use client'

import Link from 'next/link'
import { ArrowLeft, Calculator } from 'lucide-react'

export default function ConfinedSpaceCalculatorPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/health-programs/confined-space/new"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-violet-600" />
              밀폐공간 자동계산기
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              환기량 자동 산정 코드가 적용된 계산 화면입니다.
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <iframe
          src="/tools/confined_space_ventilation.html"
          title="밀폐공간 자동계산기"
          className="w-full h-[calc(100vh-220px)] min-h-[820px] border-0"
        />
      </div>
    </div>
  )
}
