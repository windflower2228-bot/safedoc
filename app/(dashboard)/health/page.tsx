'use client'
import Link from 'next/link'
import { HeartPulse, ChevronRight, FlaskConical, Activity, Stethoscope } from 'lucide-react'

const HEALTH_TYPES = [
  {
    href:  '/health/msds',
    icon:  FlaskConical,
    color: '#0891b2',
    bg:    '#ecfeff',
    title: 'MSDS 관리',
    desc:  'GHS 9종 유해성 분류 · 공용 공유 · 교육일지 1클릭 변환',
    badge: '화학물질',
    badgeColor: '#ecfeff',
    badgeText: '#0e7490',
  },
  {
    href:  '/health/work-env',
    icon:  Activity,
    color: '#16a34a',
    bg:    '#f0fdf4',
    title: '작업환경측정',
    desc:  '반기 1회 이상 | 소음·분진·유해화학물질 등',
    badge: '반기 1회',
    badgeColor: '#f0fdf4',
    badgeText: '#15803d',
  },
  {
    href:  '/health/health-check-general',
    icon:  Stethoscope,
    color: '#2563eb',
    bg:    '#eff6ff',
    title: '일반건강진단',
    desc:  '사무직 2년에 1회 · 비사무직 1년에 1회',
    badge: '연 1~2회',
    badgeColor: '#eff6ff',
    badgeText: '#1d4ed8',
  },
  {
    href:  '/health/health-check-placement',
    icon:  Stethoscope,
    color: '#7c3aed',
    bg:    '#f5f3ff',
    title: '배치전 건강진단',
    desc:  '유해업무 배치 전 실시 | 업무 적합성 판단',
    badge: '배치 전 필수',
    badgeColor: '#f5f3ff',
    badgeText: '#6d28d9',
  },
  {
    href:  '/health/health-check-special',
    icon:  Stethoscope,
    color: '#dc2626',
    bg:    '#fef2f2',
    title: '특수건강진단',
    desc:  '유해인자 취급 근로자 | 6개월~2년 주기',
    badge: '유해업무 필수',
    badgeColor: '#fef2f2',
    badgeText: '#b91c1c',
  },
]

export default function HealthHubPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-rose-500" />
          보건관리
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          작업환경측정, 건강진단, MSDS 등 보건 관련 문서를 관리합니다.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {HEALTH_TYPES.map((t) => {
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{t.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: t.badgeColor, color: t.badgeText }}>{t.badge}</span>
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
