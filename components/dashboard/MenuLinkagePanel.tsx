'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, Link2 } from 'lucide-react'

type MenuKey =
  | 'dashboard'
  | 'risk'
  | 'worklog'
  | 'safety_management'
  | 'safety_committee'
  | 'safety_regulation'
  | 'education'
  | 'safety_measures'
  | 'subcontract'
  | 'health_programs'
  | 'health'
  | 'hazardous'
  | 'plan'
  | 'history'
  | 'users'
  | 'company'

type LinkNode = { label: string; href: string }
type DiagramConfig = {
  title: string
  autoLinks: LinkNode[]
  assistLinks: LinkNode[]
  note: string
}

function resolveMenuKey(pathname: string): MenuKey {
  if (pathname.startsWith('/dashboard')) return 'dashboard'
  if (pathname.startsWith('/risk')) return 'risk'
  if (pathname.startsWith('/worklog')) return 'worklog'
  if (pathname.startsWith('/safety-management') || pathname.startsWith('/documents/designation')) return 'safety_management'
  if (pathname.startsWith('/safety-committee')) return 'safety_committee'
  if (pathname.startsWith('/safety-regulation')) return 'safety_regulation'
  if (pathname.startsWith('/documents/education') || pathname.startsWith('/documents/construction-edu')) return 'education'
  if (pathname.startsWith('/safety-measures') || pathname.startsWith('/documents/workplan')) return 'safety_measures'
  if (
    pathname.startsWith('/subcontract') ||
    pathname.startsWith('/documents/inspection') ||
    pathname.startsWith('/documents/joint-inspection') ||
    pathname.startsWith('/documents/committee')
  ) return 'subcontract'
  if (pathname.startsWith('/health-programs')) return 'health_programs'
  if (pathname.startsWith('/health')) return 'health'
  if (pathname.startsWith('/hazardous-machinery')) return 'hazardous'
  if (pathname.startsWith('/plan')) return 'plan'
  if (pathname.startsWith('/history')) return 'history'
  if (pathname.startsWith('/users')) return 'users'
  if (pathname.startsWith('/company')) return 'company'
  return 'dashboard'
}

const DIAGRAMS: Record<MenuKey, DiagramConfig> = {
  dashboard: {
    title: '대시보드',
    autoLinks: [],
    assistLinks: [
      { label: '위험성평가', href: '/risk' },
      { label: '활동계획표', href: '/plan' },
      { label: '문서 버전 이력', href: '/history' },
    ],
    note: '대시보드는 연계 현황을 모아보는 허브입니다.',
  },
  risk: {
    title: '위험성평가',
    autoLinks: [
      { label: '안전보건교육일지', href: '/documents/education' },
      { label: '사전조사 및 작업계획서', href: '/documents/workplan' },
      { label: '관리감독자 유해위험방지업무', href: '/safety-measures/supervisor-duties' },
      { label: '활동계획표 이행', href: '/plan' },
    ],
    assistLinks: [
      { label: '순회점검일지', href: '/documents/inspection' },
      { label: '합동안전점검일지', href: '/documents/joint-inspection' },
      { label: '안전보건협의체 회의록', href: '/documents/committee' },
    ],
    note: '위험요인 체크(교육/작업계획)에 따라 연계 문서 초안 생성이 가능합니다.',
  },
  worklog: {
    title: '작업일보 분석',
    autoLinks: [],
    assistLinks: [
      { label: '위험성평가', href: '/risk' },
      { label: '사전조사 및 작업계획서', href: '/documents/workplan' },
      { label: '활동계획표', href: '/plan' },
    ],
    note: '작업일보 분석 결과를 기반으로 위험성평가 및 후속 문서 작성으로 이어집니다.',
  },
  safety_management: {
    title: '안전보건관리체제',
    autoLinks: [],
    assistLinks: [
      { label: '지정/선임 문서', href: '/documents/designation' },
      { label: '문서 버전 이력', href: '/history' },
    ],
    note: '이 메뉴는 체계 문서 관리 중심이며 자동 연계는 제한적입니다.',
  },
  safety_committee: {
    title: '산업안전보건위원회·노사협의체',
    autoLinks: [],
    assistLinks: [
      { label: '안전보건협의체 회의록(문서)', href: '/documents/committee' },
      { label: '활동계획표', href: '/plan' },
    ],
    note: '위원회/협의체 관리 화면이며 문서 메뉴와 함께 운영하면 이력 추적이 편합니다.',
  },
  safety_regulation: {
    title: '안전보건관리규정',
    autoLinks: [],
    assistLinks: [
      { label: '위험성평가 실시규정', href: '/risk/regulation' },
      { label: '안전보건관리체제', href: '/safety-management' },
    ],
    note: '규정 화면은 기준 문서 성격이며 자동 연계 동작은 없습니다.',
  },
  education: {
    title: '안전보건교육',
    autoLinks: [
      { label: '활동계획표 이행', href: '/plan' },
    ],
    assistLinks: [
      { label: '위험성평가', href: '/risk' },
      { label: 'MSDS 관리', href: '/health/msds' },
    ],
    note: '교육일지 저장 시 활동계획표 교육 항목이 자동 완료 처리됩니다.',
  },
  safety_measures: {
    title: '안전조치',
    autoLinks: [
      { label: '활동계획표 이행(작업계획서 저장)', href: '/plan' },
    ],
    assistLinks: [
      { label: '위험성평가', href: '/risk' },
      { label: '사전조사 및 작업계획서', href: '/documents/workplan' },
      { label: '관리감독자 유해위험방지업무', href: '/safety-measures/supervisor-duties' },
    ],
    note: '작업계획서/관리감독자업무는 위험성평가 기반으로 연결됩니다.',
  },
  subcontract: {
    title: '도급사업 시 안전보건조치',
    autoLinks: [
      { label: '활동계획표 이행(점검/협의체 저장)', href: '/plan' },
    ],
    assistLinks: [
      { label: '위험성평가', href: '/risk' },
      { label: '순회점검일지', href: '/documents/inspection' },
      { label: '합동안전점검일지', href: '/documents/joint-inspection' },
      { label: '안전보건협의체 회의록', href: '/documents/committee' },
    ],
    note: '점검·회의록은 위험성평가를 바탕으로 초안 생성 연계가 가능합니다.',
  },
  health_programs: {
    title: '보건조치',
    autoLinks: [],
    assistLinks: [
      { label: '보건관리', href: '/health' },
      { label: '활동계획표', href: '/plan' },
    ],
    note: '보건 프로그램은 독립 관리 중심입니다.',
  },
  health: {
    title: '보건관리',
    autoLinks: [],
    assistLinks: [
      { label: '보건조치', href: '/health-programs' },
      { label: '안전보건교육', href: '/documents/education' },
    ],
    note: 'MSDS/건강진단 데이터는 교육/보건조치 작성 시 참고됩니다.',
  },
  hazardous: {
    title: '유해위험기계·기구',
    autoLinks: [],
    assistLinks: [
      { label: '안전조치', href: '/safety-measures' },
      { label: '활동계획표', href: '/plan' },
    ],
    note: '인증·검사 관리는 독립 기능이며 일정 관리와 함께 활용합니다.',
  },
  plan: {
    title: '활동계획표',
    autoLinks: [
      { label: '안전보건교육일지 저장 결과', href: '/documents/education' },
      { label: '작업계획서 저장 결과', href: '/documents/workplan' },
      { label: '순회/합동안전점검 저장 결과', href: '/documents/inspection' },
      { label: '협의체 회의록 저장 결과', href: '/documents/committee' },
    ],
    assistLinks: [
      { label: '위험성평가', href: '/risk' },
    ],
    note: '연계 문서 저장 시 활동 항목이 자동으로 완료 처리됩니다.',
  },
  history: {
    title: '문서 버전 이력',
    autoLinks: [],
    assistLinks: [
      { label: '안전보건교육', href: '/documents/education' },
      { label: '사전조사 및 작업계획서', href: '/documents/workplan' },
      { label: '점검/협의체 문서', href: '/documents/inspection' },
    ],
    note: '각 문서 저장 시 버전 스냅샷이 누적됩니다.',
  },
  users: {
    title: '사용자 관리',
    autoLinks: [],
    assistLinks: [
      { label: '회사·현장 관리', href: '/company' },
      { label: '대시보드', href: '/dashboard' },
    ],
    note: '권한/조직 설정 메뉴로 연계 자동생성 기능은 없습니다.',
  },
  company: {
    title: '회사·현장 관리',
    autoLinks: [],
    assistLinks: [
      { label: '사용자 관리', href: '/users' },
      { label: '대시보드', href: '/dashboard' },
    ],
    note: '기준 정보(회사/현장) 관리 메뉴입니다.',
  },
}

function LinkChips({ links }: { links: LinkNode[] }) {
  if (links.length === 0) {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
        연계 항목 없음
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-700 transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}

export default function MenuLinkagePanel() {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  const menuKey = useMemo(() => resolveMenuKey(pathname), [pathname])
  const diagram = DIAGRAMS[menuKey]

  return (
    <section className="card no-print border-blue-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-900">현재 메뉴 연계도: {diagram.title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <p className="text-xs font-semibold text-blue-800 mb-2">자동 연계</p>
              <LinkChips links={diagram.autoLinks} />
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
              <p className="text-xs font-semibold text-indigo-800 mb-2">클릭/생성 연계</p>
              <LinkChips links={diagram.assistLinks} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-2.5">{diagram.note}</p>
        </div>
      )}
    </section>
  )
}
