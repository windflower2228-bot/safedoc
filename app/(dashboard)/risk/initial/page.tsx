'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileSearch } from 'lucide-react'
export default function Page() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/risk" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileSearch className="w-5 h-5" style={{color:'#1d4ed8'}}/>
            최초 위험성평가
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">지침 제15조제1항 | 사업 성립일(실착공일)로부터 1개월 이내 | 전체 작업 대상</p>
        </div>
      </div>
      <div className="card p-6 text-center">
        <p className="text-sm text-gray-500 mb-4">최초 위험성평가 목록을 조회하거나 새 평가를 작성합니다.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/risk/list?type=initial" className="btn-primary text-sm" style={{background:'#1d4ed8'}}> 목록 보기</Link>
          <Link href="/risk/new" className="btn-secondary text-sm">+ 새 평가 작성</Link>
        </div>
      </div>
    </div>
  )
}
