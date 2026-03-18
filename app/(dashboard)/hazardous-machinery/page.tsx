'use client'
import Link from 'next/link'
import { ShieldAlert, ChevronRight, Award, ClipboardCheck, CheckSquare } from 'lucide-react'

const ITEMS = [
  {
    href: '/hazardous-machinery/safety-cert',
    icon: Award,
    color: '#2563eb', bg: '#eff6ff',
    title: '안전인증',
    badge: 'KCs 인증',
    bc: '#eff6ff', bt: '#1d4ed8',
    desc: '산안법 제84조 / 시행령 제74조 | 기계·기구·방호장치·보호구 9종 + 방호장치 8종 + 보호구 6종',
    count: '23종 대상',
  },
  {
    href: '/hazardous-machinery/voluntary-cert',
    icon: CheckSquare,
    color: '#16a34a', bg: '#f0fdf4',
    title: '자율안전확인',
    badge: '자율신고',
    bc: '#f0fdf4', bt: '#15803d',
    desc: '산안법 제89조 / 시행령 제77조 | 기계·기구·방호장치·보호구 25종 | 제조·수입자 자율 확인 신고',
    count: '25종 대상',
  },
  {
    href: '/hazardous-machinery/safety-inspection',
    icon: ClipboardCheck,
    color: '#dc2626', bg: '#fef2f2',
    title: '안전검사',
    badge: '법정 의무',
    bc: '#fef2f2', bt: '#b91c1c',
    desc: '산안법 제93조 / 시행령 제78조 | 13종 대상 | 2년마다 (건설현장 크레인·리프트·곤돌라 6개월)',
    count: '13종 대상',
  },
]

export default function HazardousMachineryPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          유해위험기계·기구
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          안전인증 · 자율안전확인 · 안전검사를 통합 관리합니다.
        </p>
      </div>

      <div className="card p-4 mb-5 border-red-100 bg-red-50/30">
        <p className="text-[11px] text-red-700 leading-relaxed">
          <span className="font-semibold">산업안전보건법 제84조·제89조·제93조</span> — 유해하거나 위험한 기계·기구·설비는
          제조·수입 시 안전인증 또는 자율안전확인을, 사용 중에는 정기적인 안전검사를 받아야 합니다.
          미이행 시 1천만원 이상의 과태료 또는 징역형에 처해질 수 있습니다.
        </p>
      </div>

      <div className="space-y-4">
        {ITEMS.map(t => {
          const Icon = t.icon
          return (
            <Link key={t.href} href={t.href}
              className="card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group block">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: t.bg }}>
                  <Icon className="w-6 h-6" style={{ color: t.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-base font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {t.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: t.bc, color: t.bt }}>
                      {t.badge}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                      {t.count}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{t.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-2" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
