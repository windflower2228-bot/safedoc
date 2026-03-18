'use client'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'

const REGULATION_SECTIONS = [
  { title:'제1조 목적', content:'이 규정은 사업장 위험성평가에 관한 지침(고용노동부고시 제2024-76호)에 따라 위험성평가를 체계적으로 실시하기 위한 범위·방법·주기·담당자 등을 정함을 목적으로 한다.' },
  { title:'제2조 적용범위', content:'이 규정은 본 사업장에서 근무하는 모든 근로자(협력업체, 방문객 포함)에게 안전·보건상 영향을 주는 모든 유해·위험요인에 적용한다.' },
  { title:'제3조 실시 주체 및 참여자', content:'① 위험성평가는 사업주 책임하에 실시한다.\n② 안전보건관리책임자, 관리감독자, 안전관리자·안전보건관리담당자, 해당 작업 근로자가 참여한다 (지침 제6조).\n③ 근로자 참여는 의무이며, 유해·위험요인을 가장 잘 아는 근로자를 포함해야 한다.' },
  { title:'제4조 평가 대상', content:'업무 중 근로자에게 노출된 것이 확인되었거나 노출될 것이 합리적으로 예견 가능한 모든 유해·위험요인 (지침 제5조의2). 단, 매우 경미한 부상만을 초래하는 것이 명백한 경우 제외 가능.' },
  { title:'제5조 평가 방법', content:'다음 중 하나 이상의 방법을 선택하여 실시 (지침 제9조제5항):\n① 빈도·강도법 (가능성×중대성)\n② 체크리스트법\n③ 위험성 수준 3단계 판단법 (高·中·低)\n④ 핵심요인 기술법\n단, ①의 방법을 기본으로 포함해야 한다.' },
  { title:'제6조 실시 시기', content:'① 최초평가: 사업개시(실착공)일로부터 1개월 이내\n② 수시평가: 건설물 변경, 설비 신규 도입, 작업방법 변경, 재해 발생 등 해당 사유 발생 시 작업 착수 전\n③ 정기평가: 최초평가 후 매년 1회\n④ 상시평가: 수시·정기를 대체하는 경우 매월·매주·매일 실시 (지침 제15조)' },
  { title:'제7조 기록 및 보존', content:'위험성평가 결과는 기록하여 3년간 보존한다 (지침 제14조). 기록사항: ① 평가 대상 작업 ② 실시 내용 및 결과 ③ 근로자 참여 사실 ④ 감소대책 이행 결과 ⑤ 그 밖에 필요한 사항' },
  { title:'제8조 공유 및 고지', content:'평가 결과는 근로자가 쉽게 볼 수 있도록 게시하고, 안전보건교육 및 작업 전 안전점검회의(TBM) 내용에 포함한다 (지침 제13조).' },
]

export default function RiskRegulationPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/risk" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
        <div><h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-cyan-600"/>위험성평가 실시규정</h1>
        <p className="text-sm text-gray-400 mt-0.5">지침 제9조 사전준비 | 위험성평가 실시규정 표준 예시</p></div>
      </div>
      <div className="card p-4 mb-5 bg-cyan-50/30 border-cyan-100 text-xs text-cyan-700">
        ※ 이 내용은 고용노동부 위험성평가지침 제9조에 따른 실시규정 표준 예시입니다. 사업장에 맞게 수정하여 활용하세요.
      </div>
      <div className="card overflow-hidden">
        <div className="divide-y divide-gray-100">
          {REGULATION_SECTIONS.map((s, i) => (
            <div key={i} className="p-5">
              <div className="font-semibold text-gray-800 text-sm mb-2">{s.title}</div>
              <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">{s.content}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
