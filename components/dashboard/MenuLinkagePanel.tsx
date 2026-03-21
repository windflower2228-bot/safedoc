'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  | 'osh_cost'
  | 'health_programs'
  | 'health'
  | 'hazardous'
  | 'plan'
  | 'history'
  | 'users'
  | 'company'

type LinkNode = { label: string; href: string; desc?: string }
type DiagramConfig = {
  title: string
  centerHref: string
  centerSub: string
  autoLinks: LinkNode[]
  assistLinks: LinkNode[]
  note: string
  bottomLink?: LinkNode
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
  if (pathname.startsWith('/osh-cost')) return 'osh_cost'
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
    centerHref: '/dashboard',
    centerSub: '연계 현황 허브',
    autoLinks: [],
    assistLinks: [
      { label: '위험성평가', href: '/risk', desc: '핵심 문서 진입' },
      { label: '활동계획표', href: '/plan', desc: '이행 상태 확인' },
      { label: '문서 버전 이력', href: '/history', desc: '변경 추적' },
    ],
    note: '대시보드는 연계 현황을 모아보는 허브입니다.',
  },
  risk: {
    title: '위험성평가',
    centerHref: '/risk',
    centerSub: '핵심 허브 문서',
    autoLinks: [
      { label: '안전보건교육일지', href: '/documents/education', desc: '유해위험요인 자동 반영' },
      { label: '작업계획서', href: '/documents/workplan', desc: '감소대책 자동 입력' },
      { label: '순회점검일지', href: '/documents/inspection', desc: '위험요인 연계 반영' },
      { label: '협의체 회의록', href: '/documents/committee', desc: '안전보건사항 연결' },
    ],
    assistLinks: [
      { label: '작업일보 업로드', href: '/worklog', desc: '공종 키워드 자동 분석' },
      { label: 'MSDS 관리대장', href: '/health/msds', desc: '파일 업로드·공종 반영' },
      { label: 'MSDS 교육일지', href: '/documents/education', desc: '초안 자동 생성' },
      { label: '지정서·선임서', href: '/documents/designation', desc: '직급별 자동 생성' },
    ],
    note: '위험요인 체크(교육/작업계획)에 따라 연계 문서가 자동 반영됩니다.',
    bottomLink: {
      label: '안전보건활동계획표',
      href: '/plan',
      desc: '이행 여부 자동 체크·알림',
    },
  },
  worklog: {
    title: '작업일보 분석',
    centerHref: '/worklog',
    centerSub: '입력 데이터 분석',
    autoLinks: [],
    assistLinks: [
      { label: '위험성평가', href: '/risk', desc: '분석 결과 기반 작성' },
      { label: '작업계획서', href: '/documents/workplan', desc: '감소대책 문서화' },
      { label: '활동계획표', href: '/plan', desc: '월별 이행 관리' },
    ],
    note: '작업일보 분석 결과를 기반으로 위험성평가 및 후속 문서 작성으로 이어집니다.',
  },
  safety_management: {
    title: '안전보건관리체제',
    centerHref: '/safety-management',
    centerSub: '체계 문서 관리',
    autoLinks: [],
    assistLinks: [
      { label: '지정/선임 문서', href: '/documents/designation', desc: '역할별 문서 연결' },
      { label: '문서 버전 이력', href: '/history', desc: '버전 추적' },
    ],
    note: '이 메뉴는 체계 문서 관리 중심이며 자동 연계는 제한적입니다.',
  },
  safety_committee: {
    title: '산업안전보건위원회·노사협의체',
    centerHref: '/safety-committee',
    centerSub: '회의체 운영',
    autoLinks: [],
    assistLinks: [
      { label: '협의체 회의록(문서)', href: '/documents/committee', desc: '회의록 등록' },
      { label: '활동계획표', href: '/plan', desc: '이행 관리' },
    ],
    note: '위원회/협의체 관리 화면이며 문서 메뉴와 함께 운영하면 이력 추적이 편합니다.',
  },
  safety_regulation: {
    title: '안전보건관리규정',
    centerHref: '/safety-regulation',
    centerSub: '기준 규정',
    autoLinks: [],
    assistLinks: [
      { label: '위험성평가 실시규정', href: '/risk/regulation', desc: '평가 기준 연결' },
      { label: '안전보건관리체제', href: '/safety-management', desc: '조직 체계 연결' },
    ],
    note: '규정 화면은 기준 문서 성격이며 자동 연계 동작은 없습니다.',
  },
  education: {
    title: '안전보건교육',
    centerHref: '/documents/education',
    centerSub: '교육 문서 관리',
    autoLinks: [
      { label: '활동계획표 이행', href: '/plan', desc: '저장 시 자동 완료 처리' },
    ],
    assistLinks: [
      { label: '위험성평가', href: '/risk', desc: '교육항목 자동 생성' },
      { label: 'MSDS 관리', href: '/health/msds', desc: '교육자료 연계' },
    ],
    note: '교육일지 저장 시 활동계획표 교육 항목이 자동 완료 처리됩니다.',
  },
  safety_measures: {
    title: '안전조치',
    centerHref: '/safety-measures',
    centerSub: '현장 조치 문서',
    autoLinks: [
      { label: '활동계획표 이행', href: '/plan', desc: '작업계획서 저장 시 체크' },
    ],
    assistLinks: [
      { label: '위험성평가', href: '/risk', desc: '감소대책 기반 연결' },
      { label: '사전조사 및 작업계획서', href: '/documents/workplan', desc: '위험요인 반영' },
      { label: '관리감독자 유해위험방지업무', href: '/safety-measures/supervisor-duties', desc: '별표2 자동 추출' },
    ],
    note: '작업계획서/관리감독자업무는 위험성평가 기반으로 연결됩니다.',
  },
  subcontract: {
    title: '도급사업 시 안전보건조치',
    centerHref: '/subcontract',
    centerSub: '도급 안전 문서',
    autoLinks: [
      { label: '활동계획표 이행', href: '/plan', desc: '점검·회의 저장 시 체크' },
    ],
    assistLinks: [
      { label: '위험성평가', href: '/risk', desc: '점검 초안 생성 기준' },
      { label: '순회점검일지', href: '/documents/inspection', desc: '자동 항목 생성' },
      { label: '합동안전점검일지', href: '/documents/joint-inspection', desc: '합동점검 연계' },
      { label: '협의체 회의록', href: '/documents/committee', desc: '회의록 연계' },
    ],
    note: '점검·회의록은 위험성평가를 바탕으로 초안 생성 연계가 가능합니다.',
  },
  osh_cost: {
    title: '산업안전보건관리비',
    centerHref: '/osh-cost',
    centerSub: '계상·사용 관리 허브',
    autoLinks: [
      { label: '계상', href: '/osh-cost/estimation', desc: '별표 1 산식 기반 계산' },
      { label: '사용', href: '/osh-cost/usage', desc: '별지 1 사용내역 관리' },
      { label: '질의회시 검색', href: '/osh-cost/qna', desc: '쟁점 사례 검색' },
    ],
    assistLinks: [
      { label: '위험성평가', href: '/risk', desc: '위험요인 기반 집행 우선순위' },
      { label: '작업일보 분석', href: '/worklog', desc: '현장 작업량 참고' },
      { label: '활동계획표', href: '/plan', desc: '월별 집행 일정 연계' },
    ],
    note: '관리비 계상(별표 1)과 사용관리(별지 1)를 같은 흐름으로 운영할 수 있습니다.',
  },
  health_programs: {
    title: '보건조치',
    centerHref: '/health-programs',
    centerSub: '보건 프로그램',
    autoLinks: [],
    assistLinks: [
      { label: '보건관리', href: '/health', desc: '진단/측정 데이터 연결' },
      { label: '활동계획표', href: '/plan', desc: '일정 관리' },
    ],
    note: '보건 프로그램은 독립 관리 중심입니다.',
  },
  health: {
    title: '보건관리',
    centerHref: '/health',
    centerSub: 'MSDS·건강진단',
    autoLinks: [],
    assistLinks: [
      { label: '보건조치', href: '/health-programs', desc: '프로그램 실행 연결' },
      { label: '안전보건교육', href: '/documents/education', desc: '교육자료 반영' },
    ],
    note: 'MSDS/건강진단 데이터는 교육/보건조치 작성 시 참고됩니다.',
  },
  hazardous: {
    title: '유해위험기계·기구',
    centerHref: '/hazardous-machinery',
    centerSub: '인증·검사 관리',
    autoLinks: [],
    assistLinks: [
      { label: '안전조치', href: '/safety-measures', desc: '현장 조치 연계' },
      { label: '활동계획표', href: '/plan', desc: '검사 일정 관리' },
    ],
    note: '인증·검사 관리는 독립 기능이며 일정 관리와 함께 활용합니다.',
  },
  plan: {
    title: '활동계획표',
    centerHref: '/plan',
    centerSub: '이행 관리 허브',
    autoLinks: [
      { label: '안전보건교육일지 저장 결과', href: '/documents/education', desc: '교육 항목 자동 완료' },
      { label: '작업계획서 저장 결과', href: '/documents/workplan', desc: '계획 항목 자동 완료' },
      { label: '순회/합동안전점검 저장 결과', href: '/documents/inspection', desc: '점검 항목 자동 완료' },
      { label: '협의체 회의록 저장 결과', href: '/documents/committee', desc: '회의 항목 자동 완료' },
    ],
    assistLinks: [
      { label: '위험성평가', href: '/risk', desc: '연계 문서 생성 출발점' },
    ],
    note: '연계 문서 저장 시 활동 항목이 자동으로 완료 처리됩니다.',
  },
  history: {
    title: '문서 버전 이력',
    centerHref: '/history',
    centerSub: '스냅샷 추적',
    autoLinks: [],
    assistLinks: [
      { label: '안전보건교육', href: '/documents/education', desc: '버전 누적' },
      { label: '사전조사 및 작업계획서', href: '/documents/workplan', desc: '버전 누적' },
      { label: '점검/협의체 문서', href: '/documents/inspection', desc: '버전 누적' },
    ],
    note: '각 문서 저장 시 버전 스냅샷이 누적됩니다.',
  },
  users: {
    title: '사용자 관리',
    centerHref: '/users',
    centerSub: '권한/조직',
    autoLinks: [],
    assistLinks: [
      { label: '회사·현장 관리', href: '/company', desc: '기준 데이터 연결' },
      { label: '대시보드', href: '/dashboard', desc: '현황 확인' },
    ],
    note: '권한/조직 설정 메뉴로 연계 자동생성 기능은 없습니다.',
  },
  company: {
    title: '회사·현장 관리',
    centerHref: '/company',
    centerSub: '기준 정보',
    autoLinks: [],
    assistLinks: [
      { label: '사용자 관리', href: '/users', desc: '계정 권한 연결' },
      { label: '대시보드', href: '/dashboard', desc: '운영 현황 확인' },
    ],
    note: '기준 정보(회사/현장) 관리 메뉴입니다.',
  },
}

type CurveLayout = {
  left: string[]
  right: string[]
  bottom: string | null
}

const CURVE_CARD_GAP = 0
const CURVE_PORT_EDGE_PADDING = 18

type NodeMetric = {
  midY: number
  leftX: number
  rightX: number
}

function createCardPorts(count: number, topY: number, bottomY: number) {
  if (count <= 1) return [(topY + bottomY) / 2]
  const span = Math.max(0, bottomY - topY)
  return Array.from({ length: count }, (_, index) => topY + (span * index) / (count - 1))
}

function createCurvePath(startX: number, startY: number, endX: number, endY: number) {
  const direction = endX >= startX ? 1 : -1
  const stem = Math.max(10, Math.min(20, Math.abs(endX - startX) * 0.16))
  const aX = startX + direction * stem
  const bX = endX - direction * stem
  const curve = Math.max(56, Math.min(150, Math.abs(bX - aX) * 0.62))
  const deltaY = endY - startY
  const cp1X = aX + direction * curve
  const cp2X = bX - direction * curve
  const cp1Y = startY + deltaY * 0.35
  const cp2Y = startY + deltaY * 0.65
  return `M ${startX} ${startY} L ${aX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${bX} ${endY} L ${endX} ${endY}`
}

function createBottomCurvePath(startX: number, startY: number, endX: number, endY: number) {
  const bend = Math.max(30, Math.min(64, Math.abs(endY - startY) * 0.36))
  return `M ${startX} ${startY} C ${startX} ${startY + bend}, ${endX} ${endY - bend}, ${endX} ${endY}`
}

function FlowNode({
  node,
  tone,
  wrapperRef,
  wrapperClassName,
}: {
  node: LinkNode
  tone: 'left' | 'right' | 'center' | 'bottom'
  wrapperRef?: (el: HTMLDivElement | null) => void
  wrapperClassName?: string
}) {
  const toneClass =
    tone === 'left'
      ? 'bg-[#eef5fd] border-[#b7cde8]'
      : tone === 'right'
        ? 'bg-[#e8f6f2] border-[#9fd2c4]'
        : tone === 'bottom'
          ? 'bg-[#f7f0e0] border-[#d8c4a2]'
          : 'bg-[#f8eee8] border-[#cfaea0]'

  const accentClass =
    tone === 'left'
      ? 'text-[#3a6ea5]'
      : tone === 'right'
        ? 'text-[#2b7a6a]'
        : tone === 'bottom'
          ? 'text-[#7b6133]'
          : 'text-[#8d4b3f]'

  const widthClass =
    tone === 'center'
      ? 'lg:w-[190px]'
      : tone === 'bottom'
        ? 'lg:w-[210px]'
        : 'lg:w-[220px]'

  return (
    <div ref={wrapperRef} className={`relative w-fit ${wrapperClassName ?? ''}`}>
      <Link
        href={node.href}
        className={`relative z-10 block w-full ${widthClass} rounded-xl border px-3 py-2.5 hover:shadow-sm hover:-translate-y-0.5 transition-all ${toneClass}`}
      >
        <p className={`text-sm font-semibold leading-tight ${accentClass}`}>{node.label}</p>
        {node.desc && <p className="text-[11px] text-gray-600 mt-1">{node.desc}</p>}
      </Link>
    </div>
  )
}

export default function MenuLinkagePanel() {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)
  const [curves, setCurves] = useState<CurveLayout>({ left: [], right: [], bottom: null })

  const desktopRef = useRef<HTMLDivElement | null>(null)
  const centerRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const leftRefs = useRef<(HTMLDivElement | null)[]>([])
  const rightRefs = useRef<(HTMLDivElement | null)[]>([])

  const menuKey = useMemo(() => resolveMenuKey(pathname), [pathname])
  const diagram = DIAGRAMS[menuKey]

  useLayoutEffect(() => {
    if (!open) {
      setCurves({ left: [], right: [], bottom: null })
      return
    }

    const container = desktopRef.current
    const centerNode = centerRef.current
    if (!container || !centerNode) return

    const computeCurves = () => {
      const containerRect = container.getBoundingClientRect()
      const centerRect = centerNode.getBoundingClientRect()
      const centerLeftX = centerRect.left - containerRect.left - CURVE_CARD_GAP
      const centerRightX = centerRect.right - containerRect.left + CURVE_CARD_GAP
      const centerTopY = centerRect.top - containerRect.top + CURVE_PORT_EDGE_PADDING
      const centerBottomY = centerRect.bottom - containerRect.top - CURVE_PORT_EDGE_PADDING

      const validLeftNodes = leftRefs.current
        .slice(0, diagram.assistLinks.length)
        .filter((node): node is HTMLDivElement => Boolean(node))
      const validRightNodes = rightRefs.current
        .slice(0, diagram.autoLinks.length)
        .filter((node): node is HTMLDivElement => Boolean(node))

      const leftMetrics = validLeftNodes
        .map<NodeMetric>((node) => {
          const rect = node.getBoundingClientRect()
          return {
            midY: rect.top - containerRect.top + rect.height / 2,
            leftX: rect.left - containerRect.left,
            rightX: rect.right - containerRect.left,
          }
        })
        .sort((a, b) => a.midY - b.midY)

      const rightMetrics = validRightNodes
        .map<NodeMetric>((node) => {
          const rect = node.getBoundingClientRect()
          return {
            midY: rect.top - containerRect.top + rect.height / 2,
            leftX: rect.left - containerRect.left,
            rightX: rect.right - containerRect.left,
          }
        })
        .sort((a, b) => a.midY - b.midY)

      const leftPorts = createCardPorts(leftMetrics.length, centerTopY, centerBottomY)
      const rightPorts = createCardPorts(rightMetrics.length, centerTopY, centerBottomY)

      const leftPaths = leftMetrics.map((metric, index) => {
        const startX = metric.rightX + CURVE_CARD_GAP
        const startY = metric.midY
        const endY = leftPorts[index]
        return createCurvePath(startX, startY, centerLeftX, endY)
      })

      const rightPaths = rightMetrics.map((metric, index) => {
        const endX = metric.leftX - CURVE_CARD_GAP
        const endY = metric.midY
        const startY = rightPorts[index]
        return createCurvePath(centerRightX, startY, endX, endY)
      })

      let bottomPath: string | null = null
      if (bottomRef.current) {
        const bottomRect = bottomRef.current.getBoundingClientRect()
        const startX = centerRect.left - containerRect.left + centerRect.width / 2
        const startY = centerRect.bottom - containerRect.top + CURVE_CARD_GAP
        const endX = bottomRect.left - containerRect.left + bottomRect.width / 2
        const endY = bottomRect.top - containerRect.top - CURVE_CARD_GAP
        bottomPath = createBottomCurvePath(startX, startY, endX, endY)
      }

      setCurves({ left: leftPaths, right: rightPaths, bottom: bottomPath })
    }

    const raf = requestAnimationFrame(computeCurves)
    const observer = new ResizeObserver(computeCurves)
    observer.observe(container)
    observer.observe(centerNode)
    leftRefs.current.forEach((node) => node && observer.observe(node))
    rightRefs.current.forEach((node) => node && observer.observe(node))
    if (bottomRef.current) observer.observe(bottomRef.current)
    window.addEventListener('resize', computeCurves)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', computeCurves)
    }
  }, [open, menuKey, diagram.assistLinks.length, diagram.autoLinks.length, Boolean(diagram.bottomLink)])

  return (
    <section className="card no-print border-[#d8d8d8] bg-[#f3f3f1]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#8d4b3f]" />
          <span className="text-sm font-semibold text-gray-900">현재 메뉴 연계도: {diagram.title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="lg:hidden space-y-2.5">
            {diagram.assistLinks.map((node) => (
              <FlowNode key={`m-assist-${node.href}-${node.label}`} node={node} tone="left" />
            ))}
            <FlowNode
              node={{ label: diagram.title, href: diagram.centerHref, desc: diagram.centerSub }}
              tone="center"
            />
            {diagram.autoLinks.map((node) => (
              <FlowNode key={`m-auto-${node.href}-${node.label}`} node={node} tone="right" />
            ))}
            {diagram.bottomLink && <FlowNode node={diagram.bottomLink} tone="bottom" />}
          </div>

          <div ref={desktopRef} className="hidden lg:block relative rounded-2xl border border-[#dadada] bg-[#f8f8f7] px-4 py-4">
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible z-0">
              {curves.left.map((path, idx) => (
                <path
                  key={`left-curve-${idx}`}
                  d={path}
                  fill="none"
                  stroke="#c68c81"
                  strokeOpacity="0.94"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              ))}
              {curves.right.map((path, idx) => (
                <path
                  key={`right-curve-${idx}`}
                  d={path}
                  fill="none"
                  stroke="#c68c81"
                  strokeOpacity="0.94"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              ))}
              {curves.bottom && (
                <path
                  d={curves.bottom}
                  fill="none"
                  stroke="#c68c81"
                  strokeOpacity="0.94"
                  strokeWidth="2.2"
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                />
              )}
            </svg>

            <div className="relative z-10 grid grid-cols-[1fr_190px_1fr] gap-12 items-center">
              <div className="space-y-2.5">
                {diagram.assistLinks.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white/70 px-3 py-2 text-xs text-gray-500 lg:w-[220px]">
                    선행 연계 없음
                  </div>
                )}
                {diagram.assistLinks.map((node, idx) => (
                  <FlowNode
                    key={`assist-${node.href}-${node.label}`}
                    node={node}
                    tone="left"
                    wrapperRef={(el) => {
                      leftRefs.current[idx] = el
                    }}
                  />
                ))}
              </div>

              <div className="relative">
                <FlowNode
                  node={{ label: diagram.title, href: diagram.centerHref, desc: diagram.centerSub }}
                  tone="center"
                  wrapperClassName="lg:mx-auto"
                  wrapperRef={(el) => {
                    centerRef.current = el
                  }}
                />
              </div>

              <div className="space-y-2.5">
                {diagram.autoLinks.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white/70 px-3 py-2 text-xs text-gray-500 lg:w-[220px] ml-auto">
                    자동 연계 없음
                  </div>
                )}
                {diagram.autoLinks.map((node, idx) => (
                  <FlowNode
                    key={`auto-${node.href}-${node.label}`}
                    node={node}
                    tone="right"
                    wrapperClassName="lg:ml-auto"
                    wrapperRef={(el) => {
                      rightRefs.current[idx] = el
                    }}
                  />
                ))}
              </div>
            </div>

            {diagram.bottomLink && (
              <div className="relative z-10 flex justify-center mt-9">
                <FlowNode
                  node={diagram.bottomLink}
                  tone="bottom"
                  wrapperRef={(el) => {
                    bottomRef.current = el
                  }}
                />
              </div>
            )}
          </div>

          <p className="text-[11px] text-gray-500 mt-2.5">{diagram.note}</p>
        </div>
      )}
    </section>
  )
}
