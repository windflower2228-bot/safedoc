'use client'

import Link from 'next/link'
import { Coins, ChevronRight, Calculator, ClipboardCheck, Search } from 'lucide-react'

const ITEMS = [
  {
    href: '/osh-cost/estimation',
    icon: Calculator,
    color: '#0284c7',
    bg: '#ecfeff',
    title: '계상',
    desc: '별표 1 기준으로 공사종류·규모별 요율과 기초액을 적용해 관리비를 산정합니다.',
    badge: '별표 1',
  },
  {
    href: '/osh-cost/usage',
    icon: ClipboardCheck,
    color: '#16a34a',
    bg: '#f0fdf4',
    title: '사용',
    desc: '별지 1 형식으로 사용내역을 기록하고 집행잔액 및 항목별 집행현황을 관리합니다.',
    badge: '별지 1',
  },
  {
    href: '/osh-cost/qna',
    icon: Search,
    color: '#7c3aed',
    bg: '#f5f3ff',
    title: '질의회시 검색',
    desc: '계상/사용 쟁점별 질의회시 키워드 검색으로 유사 사례를 빠르게 확인합니다.',
    badge: '행정해석',
  },
]

export default function OshCostHubPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Coins className="w-5 h-5 text-cyan-600" />
          산업안전보건관리비
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          건설업 산업안전보건관리비 계상 및 사용기준의 별표 1/별지 1 실무를 지원합니다.
        </p>
      </div>

      <div className="card p-4 mb-5 border-cyan-100 bg-cyan-50/40">
        <p className="text-xs text-cyan-800 leading-relaxed">
          최신 고시 개정 시 요율/기초액/사용인정 범위가 달라질 수 있습니다. 본 기능은 현장 실무 입력을 빠르게 돕기 위한 도구이며,
          최종 제출 전 최신 고시 원문과 발주기관 기준을 반드시 함께 확인하세요.
        </p>
      </div>

      <div className="space-y-3">
        {ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group block"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.bg }}>
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {item.title}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: item.bg, color: item.color }}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
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
