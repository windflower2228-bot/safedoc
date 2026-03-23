'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'

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

type NodeTone = 'left_green' | 'left_blue' | 'right_warm' | 'center_focus' | 'bottom_plan'
type LinkNode = { label: string; href: string; desc?: string; tone?: NodeTone }
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
      { label: '안전보건교육일지', href: '/documents/education', desc: '유해위험요인 자동 반영', tone: 'right_warm' },
      { label: '작업계획서', href: '/documents/workplan', desc: '감소대책 자동 입력', tone: 'right_warm' },
      { label: '순회점검일지', href: '/documents/inspection', desc: '위험요인 선택 삽입', tone: 'right_warm' },
      { label: '협의체 회의록', href: '/documents/committee', desc: '안건/조치사항 연결', tone: 'right_warm' },
    ],
    assistLinks: [
      { label: '작업일보 업로드', href: '/worklog', desc: '공종 키워드 자동 분석', tone: 'left_green' },
      { label: 'MSDS 관리대장', href: '/health/msds', desc: '파일 업로드·공동 활용', tone: 'left_blue' },
      { label: 'MSDS 교육일지', href: '/documents/education', desc: '초안 자동 생성', tone: 'left_blue' },
      { label: '지정서·선임서', href: '/documents/designation', desc: '직급별 자동 생성', tone: 'left_green' },
    ],
    note: '위험요인 체크(교육/작업계획)에 따라 연계 문서가 자동 반영됩니다.',
    bottomLink: {
      label: '안전보건활동계획표',
      href: '/plan',
      desc: '이행여부 자동 체크·알림',
      tone: 'bottom_plan',
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

type CurveStroke = {
  d: string
  stroke: string
  dash?: string
}

type CurveLayout = {
  left: CurveStroke[]
  right: CurveStroke[]
  bottom: CurveStroke | null
  assist: CurveStroke[]
}

const CURVE_CARD_GAP = 0
const CURVE_PORT_EDGE_PADDING = 18

type NodeMetric = {
  midY: number
  topY: number
  bottomY: number
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

function createSmoothElbowCurvePath(startX: number, startY: number, endX: number, endY: number) {
  const direction = endX >= startX ? 1 : -1
  const horizontal = Math.abs(endX - startX)
  const elbow = Math.max(24, Math.min(42, horizontal * 0.72))
  const elbowX = startX + direction * elbow
  return `M ${startX} ${startY} C ${elbowX} ${startY}, ${elbowX} ${endY}, ${endX} ${endY}`
}

function createBottomCurvePath(startX: number, startY: number, endX: number, endY: number) {
  const bend = Math.max(30, Math.min(64, Math.abs(endY - startY) * 0.36))
  return `M ${startX} ${startY} C ${startX} ${startY + bend}, ${endX} ${endY - bend}, ${endX} ${endY}`
}

function FlowNode({
  node,
  tone,
  riskStyled = false,
  wrapperRef,
  wrapperClassName,
}: {
  node: LinkNode
  tone: 'left' | 'right' | 'center' | 'bottom'
  riskStyled?: boolean
  wrapperRef?: (el: HTMLDivElement | null) => void
  wrapperClassName?: string
}) {
  const nodeTone: NodeTone =
    (node.tone as NodeTone) ??
    (tone === 'left'
      ? 'left_blue'
      : tone === 'right'
        ? 'right_warm'
        : tone === 'bottom'
          ? 'bottom_plan'
          : 'center_focus')

  const toneClass =
    nodeTone === 'left_green'
      ? 'bg-[#e8f3ef] border-[#a8c9be]'
      : nodeTone === 'left_blue'
        ? 'bg-[#eaf2fa] border-[#aec6de]'
        : nodeTone === 'right_warm'
          ? 'bg-[#f6ece8] border-[#d7beb3]'
          : nodeTone === 'bottom_plan'
            ? 'bg-[#f7efdf] border-[#d9be8e] border-dashed'
            : 'bg-[#ece9f8] border-[#aea7cd]'

  const accentClass =
    nodeTone === 'left_green'
      ? 'text-[#2f765f]'
      : nodeTone === 'left_blue'
        ? 'text-[#3f6f99]'
        : nodeTone === 'right_warm'
          ? 'text-[#8b5646]'
          : nodeTone === 'bottom_plan'
            ? 'text-[#7a6237]'
            : 'text-[#5d4f9d]'

  const widthClass = riskStyled
    ? tone === 'center'
      ? 'lg:w-[164px] lg:h-16'
      : tone === 'bottom'
        ? 'lg:w-[300px] lg:h-12'
        : 'lg:w-[175px] lg:h-12'
    : tone === 'center'
      ? 'lg:w-[190px]'
      : tone === 'bottom'
        ? 'lg:w-[210px]'
        : 'lg:w-[220px]'

  const bodyClass = riskStyled ? 'px-2.5 py-1.5' : 'px-3 py-2.5'
  const titleClass = riskStyled ? 'text-[13px] font-medium leading-tight' : 'text-sm font-semibold leading-tight'
  const descClass = riskStyled
    ? `text-[11px] mt-0.5 ${accentClass}`
    : 'text-[11px] text-gray-600 mt-1'

  return (
    <div ref={wrapperRef} className={`relative w-fit ${wrapperClassName ?? ''}`}>
      <Link
        href={node.href}
        className={`relative z-10 block w-full ${widthClass} rounded-[12px] border ${bodyClass} hover:shadow-sm hover:-translate-y-0.5 transition-all ${toneClass}`}
      >
        <p className={`${titleClass} ${accentClass}`}>{node.label}</p>
        {node.desc && <p className={descClass}>{node.desc}</p>}
      </Link>
    </div>
  )
}

export default function MenuLinkagePanel() {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)
  const [curves, setCurves] = useState<CurveLayout>({ left: [], right: [], bottom: null, assist: [] })

  const desktopRef = useRef<HTMLDivElement | null>(null)
  const centerRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const leftRefs = useRef<(HTMLDivElement | null)[]>([])
  const rightRefs = useRef<(HTMLDivElement | null)[]>([])

  const menuKey = useMemo(() => resolveMenuKey(pathname), [pathname])
  const diagram = DIAGRAMS[menuKey]
  const isRiskDiagram = menuKey === 'risk'

  useLayoutEffect(() => {
    if (!open) {
      setCurves({ left: [], right: [], bottom: null, assist: [] })
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
      const centerMidY = centerRect.top - containerRect.top + centerRect.height / 2

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
            topY: rect.top - containerRect.top,
            bottomY: rect.bottom - containerRect.top,
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
            topY: rect.top - containerRect.top,
            bottomY: rect.bottom - containerRect.top,
            leftX: rect.left - containerRect.left,
            rightX: rect.right - containerRect.left,
          }
        })
        .sort((a, b) => a.midY - b.midY)

      const isRiskDiagram = menuKey === 'risk'
      const leftPorts = isRiskDiagram
        ? Array.from({ length: leftMetrics.length }, () => centerMidY)
        : createCardPorts(leftMetrics.length, centerTopY, centerBottomY)
      const rightPorts = isRiskDiagram
        ? Array.from({ length: rightMetrics.length }, () => centerMidY)
        : createCardPorts(rightMetrics.length, centerTopY, centerBottomY)

      const leftPaths: CurveStroke[] = leftMetrics.map((metric, index) => {
        const startX = metric.rightX + CURVE_CARD_GAP - (isRiskDiagram ? 1 : 0)
        const startY = metric.midY
        const endY = leftPorts[index]
        const stroke = isRiskDiagram
          ? index === 1 || index === 2
            ? '#378ADD'
            : '#1D9E75'
          : '#c68c81'
        const endX = centerLeftX + (isRiskDiagram ? 1 : 0)
        return {
          d: isRiskDiagram
            ? createSmoothElbowCurvePath(startX, startY, endX, endY)
            : createCurvePath(startX, startY, endX, endY),
          stroke,
        }
      })

      const rightPaths: CurveStroke[] = rightMetrics.map((metric, index) => {
        const endX = metric.leftX - CURVE_CARD_GAP + (isRiskDiagram ? 1 : 0)
        const endY = metric.midY
        const startY = rightPorts[index]
        const startX = centerRightX - (isRiskDiagram ? 1 : 0)
        const stroke = isRiskDiagram ? '#D85A30' : '#c68c81'
        return {
          d: isRiskDiagram
            ? createSmoothElbowCurvePath(startX, startY, endX, endY)
            : createCurvePath(startX, startY, endX, endY),
          stroke,
        }
      })

      let bottomPath: CurveStroke | null = null
      if (bottomRef.current) {
        const bottomRect = bottomRef.current.getBoundingClientRect()
        const startX = centerRect.left - containerRect.left + centerRect.width / 2
        const startY = centerRect.bottom - containerRect.top + CURVE_CARD_GAP
        const endX = bottomRect.left - containerRect.left + bottomRect.width / 2
        const endY = bottomRect.top - containerRect.top - CURVE_CARD_GAP
        bottomPath = {
          d: isRiskDiagram ? `M ${startX} ${startY} L ${endX} ${endY}` : createBottomCurvePath(startX, startY, endX, endY),
          stroke: isRiskDiagram ? '#BA7517' : '#c68c81',
          dash: '5 4',
        }
      }

      const assist: CurveStroke[] = []
      if (isRiskDiagram && leftMetrics.length >= 3) {
        const msdsTop = leftMetrics[1]
        const msdsBottom = leftMetrics[2]
        const x = Math.min(msdsTop.leftX, msdsBottom.leftX) + 14
        assist.push({
          d: `M ${x} ${msdsTop.bottomY} L ${x} ${msdsBottom.topY}`,
          stroke: '#378ADD',
          dash: '4 3',
        })
      }

      setCurves({ left: leftPaths, right: rightPaths, bottom: bottomPath, assist })
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
    <section
      className={`card no-print ${isRiskDiagram ? 'border-[#e8e5dd] bg-white shadow-sm' : 'border-[#dddcd7] bg-[#efefed]'}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-[#dddcd7]"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className="inline-block w-2 h-2 rounded-full bg-[#5d5ab8]" />
            현재 메뉴 연계도
          </span>
          <span className="text-sm font-semibold text-gray-900">{diagram.title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="lg:hidden space-y-2.5">
            {diagram.assistLinks.map((node) => (
              <FlowNode key={`m-assist-${node.href}-${node.label}`} node={node} tone="left" riskStyled={isRiskDiagram} />
            ))}
            <FlowNode
              node={{ label: diagram.title, href: diagram.centerHref, desc: diagram.centerSub }}
              tone="center"
              riskStyled={isRiskDiagram}
            />
            {diagram.autoLinks.map((node) => (
              <FlowNode key={`m-auto-${node.href}-${node.label}`} node={node} tone="right" riskStyled={isRiskDiagram} />
            ))}
            {diagram.bottomLink && <FlowNode node={diagram.bottomLink} tone="bottom" riskStyled={isRiskDiagram} />}
          </div>

          <div ref={desktopRef} className="hidden lg:block relative rounded-2xl border border-[#d7d6d0] bg-[#f8f8f7] px-4 py-5">
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible z-0">
              {isRiskDiagram && (
                <defs>
                  <marker
                    id="diagram-arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path
                      d="M2 1L8 5L2 9"
                      fill="none"
                      stroke="context-stroke"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </marker>
                </defs>
              )}
              {curves.left.map((curve, idx) => (
                <path
                  key={`left-curve-${idx}`}
                  d={curve.d}
                  fill="none"
                  stroke={curve.stroke}
                  strokeOpacity="0.96"
                  strokeWidth={isRiskDiagram ? '1.2' : '2.2'}
                  markerEnd={isRiskDiagram ? 'url(#diagram-arrow)' : undefined}
                  strokeLinecap="round"
                />
              ))}
              {curves.right.map((curve, idx) => (
                <path
                  key={`right-curve-${idx}`}
                  d={curve.d}
                  fill="none"
                  stroke={curve.stroke}
                  strokeOpacity="0.96"
                  strokeWidth={isRiskDiagram ? '1.2' : '2.2'}
                  markerEnd={isRiskDiagram ? 'url(#diagram-arrow)' : undefined}
                  strokeLinecap="round"
                />
              ))}
              {curves.assist.map((curve, idx) => (
                <path
                  key={`assist-curve-${idx}`}
                  d={curve.d}
                  fill="none"
                  stroke={curve.stroke}
                  strokeOpacity="0.96"
                  strokeWidth={isRiskDiagram ? '1' : '1.7'}
                  strokeDasharray={curve.dash}
                  markerEnd={isRiskDiagram ? 'url(#diagram-arrow)' : undefined}
                  strokeLinecap="round"
                />
              ))}
              {curves.bottom && (
                <path
                  d={curves.bottom.d}
                  fill="none"
                  stroke={curves.bottom.stroke}
                  strokeOpacity="0.96"
                  strokeWidth={isRiskDiagram ? '1.2' : '2.2'}
                  strokeDasharray={curves.bottom.dash}
                  markerEnd={isRiskDiagram ? 'url(#diagram-arrow)' : undefined}
                  strokeLinecap="round"
                />
              )}
            </svg>

            <div
              className={`relative z-10 grid items-center ${
                isRiskDiagram
                  ? 'grid-cols-[175px_164px_175px] justify-center gap-x-16'
                  : 'grid-cols-[1fr_190px_1fr] gap-12'
              }`}
            >
              <div className={isRiskDiagram ? 'space-y-8' : 'space-y-2.5'}>
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
                    riskStyled={isRiskDiagram}
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
                  riskStyled={isRiskDiagram}
                  wrapperClassName="lg:mx-auto"
                  wrapperRef={(el) => {
                    centerRef.current = el
                  }}
                />
              </div>

              <div className={isRiskDiagram ? 'space-y-8' : 'space-y-2.5'}>
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
                    riskStyled={isRiskDiagram}
                    wrapperClassName="lg:ml-auto"
                    wrapperRef={(el) => {
                      rightRefs.current[idx] = el
                    }}
                  />
                ))}
              </div>
            </div>

            {diagram.bottomLink && (
              <div className={`relative z-10 flex justify-center ${isRiskDiagram ? 'mt-11' : 'mt-10'}`}>
                <FlowNode
                  node={diagram.bottomLink}
                  tone="bottom"
                  riskStyled={isRiskDiagram}
                  wrapperRef={(el) => {
                    bottomRef.current = el
                  }}
                />
              </div>
            )}

            {menuKey === 'risk' && (
              <div className="relative z-10 mt-4 flex flex-col items-center gap-2">
                <div className="flex items-center gap-8 text-[11px] text-gray-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-8 h-0.5 bg-[#3c9f82]" />
                    실선: 자동 연계
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-8 h-0.5 border-t border-dashed border-[#b89a57]" />
                    점선: 조건부 반영
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-8 h-0.5 border-t border-dashed border-[#7aa6ca]" />
                    MSDS 계열
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 text-center">
                  위험요인 체크[교육/작업계획]에 따라 연계 문서가 자동 반영됩니다.
                </p>
              </div>
            )}
          </div>

          {menuKey !== 'risk' && <p className="text-[11px] text-gray-500 mt-2.5">{diagram.note}</p>}
        </div>
      )}
    </section>
  )
}
