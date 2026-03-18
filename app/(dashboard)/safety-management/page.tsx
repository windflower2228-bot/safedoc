'use client'
import Link from 'next/link'
import { ShieldCheck, ChevronRight, FileText, Users, UserCheck, Activity } from 'lucide-react'
import { SAFETY_ROLES } from '@/types/safety-management'

const ITEMS = [
  {
    href: '/safety-management/annual-report',
    icon: Activity,
    color: '#1d4ed8', bg: '#eff6ff',
    title: '연간 이사회 보고 및 승인',
    desc: '산안법 제14조 | 매년 이사회 보고 · 승인 의무 (상시 500명 이상)',
    badge: '매년 의무',
    bc: '#eff6ff', bt: '#1d4ed8',
  },
  ...Object.values(SAFETY_ROLES).map(r => ({
    href: r.href,
    icon: FileText,
    color: r.color, bg: r.bg,
    title: r.label,
    desc: `${r.legalBasis} | ${r.docType}`,
    badge: r.docType,
    bc: r.bg, bt: r.color,
  })),
]

export default function SafetyManagementHubPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-700" />
          안전보건관리체제
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          산업안전보건법에서 정하는 안전보건관리체제 구성원의 지정·선임 문서를 관리합니다.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {ITEMS.map((t) => {
          const Icon = t.icon
          return (
            <Link key={t.href} href={t.href}
              className="card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group block">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: t.bg }}>
                  <Icon className="w-5 h-5" style={{ color: t.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {t.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: t.bc, color: t.bt }}>
                      {t.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{t.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
