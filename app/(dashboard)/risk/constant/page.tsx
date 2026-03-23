'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity } from 'lucide-react'
export default function Page() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/risk" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5" style={{color:'#7c3aed'}}/>
            상시 위험성평가
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">지침 제15조제4항 | 매월 유해위험요인 발굴 · 매주 논의·공유 · 매일 TBM</p>
        </div>
      </div>
      <div className="card p-6 text-center">
        <p className="text-sm text-gray-500 mb-4">상시 위험성평가 목록을 조회하거나 새 평가를 작성합니다.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/risk/list?type=always_on" className="btn-primary text-sm" style={{background:'#7c3aed'}}> 목록 보기</Link>
          <Link href="/risk/tbm" className="btn-secondary text-sm">TBM 회의</Link>
          <Link href="/risk/new" className="btn-secondary text-sm">+ 새 평가 작성</Link>
        </div>
      </div>
    </div>
  )
}
