'use client'
import Link from 'next/link'
import { Layers, ChevronRight } from 'lucide-react'
const TYPES = [
  { href:'/safety-measures/structural-review/scaffold', label:'비계', desc:'안전보건규칙 제57조·제58조 | 강관·틀·이동식·달비계 구조검토 및 조립상세도', color:'#2563eb', bg:'#eff6ff' },
  { href:'/safety-measures/structural-review/formwork', label:'거푸집동바리', desc:'안전보건규칙 제62조 | 슬래브·보·벽체 거푸집 동바리 구조검토 및 조립도', color:'#dc2626', bg:'#fef2f2' },
  { href:'/safety-measures/structural-review/earth-retention', label:'흙막이지보공', desc:'안전보건규칙 제76조 | H파일·CIP·SCW·시트파일 등 흙막이 구조검토 및 조립도', color:'#d97706', bg:'#fffbeb' },
  { href:'/safety-measures/structural-review/other', label:'기타', desc:'기타 가설구조물 구조검토 및 조립상세도', color:'#6b7280', bg:'#f9fafb' },
]
export default function StructuralReviewHub() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-600"/>구조검토 및 조립상세도
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">가설구조물 구조검토서 및 조립상세도 파일 관리</p>
      </div>
      <div className="space-y-3">
        {TYPES.map(t=>(
          <Link key={t.href} href={t.href} className="card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group block">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:t.bg}}>
                <Layers className="w-5 h-5" style={{color:t.color}}/>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 group-hover:text-blue-700">{t.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500"/>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
