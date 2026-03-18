'use client'
import Link from 'next/link'
import { HardHat, ChevronRight, Shield, ClipboardList, FileText, Users, Layers } from 'lucide-react'

const ITEMS = [
  {
    href: '/safety-measures/ppe-ledger',
    icon: HardHat, color: '#2563eb', bg: '#eff6ff',
    title: '보호구 지급대장',
    desc: '산안법 제38조 / 안전보건규칙 제32조 | 보호구 지급·회수·점검 이력 관리',
    badge: '법정 비치',
  },
  {
    href: '/safety-measures/supervisor-duties',
    icon: Shield, color: '#dc2626', bg: '#fef2f2',
    title: '관리감독자의 유해위험방지업무',
    desc: '안전보건규칙 [별표 2·3] | 위험성평가·작업계획서 자동 연계 | 별도 출력',
    badge: '별표 2·3',
  },
  {
    href: '/safety-measures/work-plan',
    icon: ClipboardList, color: '#16a34a', bg: '#f0fdf4',
    title: '사전조사 및 작업계획서',
    desc: '안전보건규칙 제38조 / [별표 4] | 11개 위험작업 | 관리감독자업무 자동 연계',
    badge: '별표 4',
  },
  {
    href: '/safety-measures/work-commander',
    icon: Users, color: '#7c3aed', bg: '#f5f3ff',
    title: '작업지휘자·신호수·화재감시자 지정서',
    desc: '안전보건규칙 제35조·제220조·제241조 | 지정서 3종 | 직무 자동 입력',
    badge: '지정서',
  },
  {
    href: '/safety-measures/structural-review',
    icon: Layers, color: '#d97706', bg: '#fffbeb',
    title: '구조검토 및 조립상세도',
    desc: '안전보건규칙 제57조·제62조 등 | 비계·거푸집동바리·흙막이지보공·기타',
    badge: '4종',
  },
]

export default function SafetyMeasuresHubPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <HardHat className="w-5 h-5 text-orange-600" />
          안전조치
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          산업안전보건법·안전보건규칙에서 정하는 안전조치 문서를 관리합니다.
        </p>
      </div>
      <div className="space-y-3">
        {ITEMS.map(t => {
          const Icon = t.icon
          return (
            <Link key={t.href} href={t.href}
              className="card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group block">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: t.bg }}>
                  <Icon className="w-5 h-5" style={{ color: t.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {t.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: t.bg, color: t.color }}>
                      {t.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{t.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-2" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
