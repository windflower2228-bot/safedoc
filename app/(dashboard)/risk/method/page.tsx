'use client'

import Link from 'next/link'
import { ArrowLeft, CheckSquare, ChevronRight } from 'lucide-react'
import { EVAL_METHOD_CONFIG } from '@/types/risk-method'

export default function RiskMethodPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/risk" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            위험성평가 방법 선택
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            사업장 위험성평가에 관한 지침 제7조 | 4가지 방법 중 사업장 특성에 맞게 선택
          </p>
        </div>
      </div>

      <div className="card p-4 mb-5 bg-blue-50/40 border-blue-100 text-xs text-blue-700 leading-relaxed">
        지침 제7조: 사업주는 다음 각 호의 방법 중 하나 이상을 선택하여 위험성평가를 실시할 수 있습니다.
        단 한 가지 방법만 고정된 것이 아니며, 사업장의 규모·업종·공정 복잡성을 고려해 선정하는 것이 바람직합니다.
      </div>

      <div className="space-y-3">
        {Object.values(EVAL_METHOD_CONFIG).map((m, i) => (
          <Link key={m.id} href={`/risk/method/${m.id}`}
            className="card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group block">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
                style={{ background: m.bg, color: m.color }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-sm text-gray-900 group-hover:text-blue-700">{m.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: m.bg, color: m.color }}>{m.tag}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
                <p className="text-[10px] text-gray-400 mt-1">적합한 사업장: {m.suitable}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-2" />
            </div>
          </Link>
        ))}
      </div>

      <div className="card p-4 mt-5 border-gray-100 text-xs text-gray-500">
        <div className="font-semibold text-gray-700 mb-2">방법별 비교표</div>
        <table className="w-full text-[10px]">
          <thead><tr className="border-b border-gray-200">
            {['방법','정량성','적합 규모','주요 활용','법적 근거'].map(h => (
              <th key={h} className="py-1.5 text-left font-semibold text-gray-500 pr-3">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {[
              ['빈도·강도법', '높음', '중·대규모', '최초·정기평가', '지침 제7조①'],
              ['체크리스트법', '중간', '전체', '정기평가·법령 점검', '지침 제7조②'],
              ['3단계 판단법', '낮음', '소·중규모', '최초·수시평가', '지침 제7조③'],
              ['핵심요인기술법', '낮음', '소규모', '수시·비정형 작업', '지침 제7조④'],
            ].map(row => (
              <tr key={row[0]}>
                {row.map((cell, j) => (
                  <td key={j} className={`py-1.5 pr-3 ${j===0?'font-medium text-gray-700':'text-gray-500'}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
