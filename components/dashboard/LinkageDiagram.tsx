import Link from 'next/link'
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Link2,
  Shield,
  Users,
} from 'lucide-react'

type NodeItem = {
  href: string
  label: string
  desc: string
  color: string
  bg: string
  Icon: any
}

const LINKED_NODES: NodeItem[] = [
  {
    href: '/documents/education',
    label: '안전보건교육일지',
    desc: '교육연계 체크 항목 자동 반영',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    Icon: BookOpen,
  },
  {
    href: '/documents/workplan',
    label: '사전조사 및 작업계획서',
    desc: '작업계획 연계 체크 + 감소대책 반영',
    color: 'text-green-600',
    bg: 'bg-green-50',
    Icon: ClipboardCheck,
  },
  {
    href: '/safety-measures/supervisor-duties',
    label: '관리감독자 유해위험방지업무',
    desc: '위험성평가 저장 시 별표2 자동 추출',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    Icon: Shield,
  },
  {
    href: '/documents/inspection',
    label: '순회점검일지',
    desc: '위험성평가 ID 연계 시 점검항목 자동 생성',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    Icon: ClipboardCheck,
  },
  {
    href: '/documents/joint-inspection',
    label: '합동안전점검일지',
    desc: '위험성평가 ID 연계 시 합동점검 초안 생성',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    Icon: FileText,
  },
  {
    href: '/documents/committee',
    label: '안전보건협의체 회의록',
    desc: '위험성평가 운영실적 자동 반영',
    color: 'text-fuchsia-600',
    bg: 'bg-fuchsia-50',
    Icon: Users,
  },
]

export default function LinkageDiagram() {
  return (
    <section className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-500" />
          위험성평가 연계 다이어그램
        </h2>
        <span className="text-xs text-gray-400">박스를 클릭하면 해당 폴더로 이동</span>
      </div>

      <div className="p-5 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_auto_1.3fr_auto_2.5fr] items-stretch">
          <Link
            href="/risk"
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-700 font-medium">시작 폴더</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">위험성평가</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  위험요인 입력 + 교육/작업계획 연계 체크
                </p>
              </div>
            </div>
          </Link>

          <div className="hidden lg:flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-gray-300" />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold text-gray-700">연계 엔진</p>
            <div className="mt-2 space-y-2">
              <div className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                1) 위험요인별 <b>교육연계/작업계획 연계</b> 체크
              </div>
              <div className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                2) 저장 시 <b>관리감독자 업무</b> 자동 추출
              </div>
              <div className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                3) 각 문서 저장 시 <b>활동계획표 이행</b> 자동 체크
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-gray-300" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {LINKED_NODES.map((node) => {
              const Icon = node.Icon
              return (
                <Link
                  key={node.href}
                  href={node.href}
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${node.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${node.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{node.label}</p>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{node.desc}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <ArrowDown className="w-4 h-4 text-gray-300" />
          <Link
            href="/plan"
            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 hover:shadow-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">활동계획표 이행 현황 (/plan)</span>
          </Link>
          <p className="text-[11px] text-gray-500 mt-2 text-center">
            연계된 문서를 저장하면 해당 활동 항목이 자동 완료 처리됩니다.
          </p>
        </div>
      </div>
    </section>
  )
}
