'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, UsersRound, Loader2, Link2, Printer, FileText, ClipboardCheck,
} from 'lucide-react'
import { clsx } from 'clsx'

type RiskLite = {
  id: string
  title: string
  eval_type: 'initial' | 'periodic' | 'special' | 'always_on'
  eval_method?: 'matrix' | 'checklist' | 'three_level' | 'ops'
  eval_start_date: string
  updated_at: string
}

type TbmPoint = {
  seq: number
  work: string
  hazard: string
  measure: string
  level: 'high' | 'medium' | 'low'
}

const LEVEL_TONE = {
  high:   { label: '高', cls: 'bg-red-100 text-red-700 border-red-200' },
  medium: { label: '中', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  low:    { label: '低', cls: 'bg-green-100 text-green-700 border-green-200' },
} as const

const EVAL_TYPE_LABEL: Record<string, string> = {
  initial:   '최초평가',
  periodic:  '정기평가',
  special:   '수시평가',
  always_on: '상시평가',
}

const TBM_PHASES = [
  {
    key: 'prepare',
    title: '사전 준비',
    items: [
      '오늘 작업내용·작업순서 공유',
      '위험성평가 핵심 위험요인 확인',
      '최근 아차사고·사고사례 공유',
    ],
  },
  {
    key: 'execute',
    title: '실행',
    items: [
      '작업자 건강상태·보호구 착용 확인',
      '위험요인별 감소대책·비상대피 요령 공유',
      '작업 중지 기준(즉시 중지 조건) 재확인',
    ],
  },
  {
    key: 'feedback',
    title: '환류',
    items: [
      '현장 제안·질문사항 접수',
      '조치 담당자·완료기한 지정',
      '회의 결과 기록·공유·보관',
    ],
  },
]

const ATTENDEE_ROWS = 8

function levelPriority(level: 'high' | 'medium' | 'low') {
  if (level === 'high') return 0
  if (level === 'medium') return 1
  return 2
}

function buildTbmPoints(assessment: any): TbmPoint[] {
  const matrixPoints: TbmPoint[] = ((assessment.items ?? []) as any[]).map((item, idx) => ({
    seq: idx + 1,
    work: item.work_content ?? '',
    hazard: item.hazard_factor ?? '',
    measure: [item.engineering_measure, item.admin_measure, item.ppe_measure].filter(Boolean).join(' / ') || 'TBM에서 감소대책 재확인',
    level: (item.current_level as 'high' | 'medium' | 'low') ?? 'medium',
  }))

  const threeLevelPoints: TbmPoint[] = ((assessment.three_level_items ?? []) as any[]).map((item, idx) => ({
    seq: idx + 1,
    work: item.work_content ?? '',
    hazard: item.hazard_factor ?? '',
    measure: item.reduce_measure || item.current_measure || 'TBM에서 감소대책 수립',
    level: (item.risk_level as 'high' | 'medium' | 'low') ?? 'medium',
  }))

  const checklistPoints: TbmPoint[] = ((assessment.checklist_items ?? []) as any[]).map((item, idx) => ({
    seq: idx + 1,
    work: item.category ?? '체크리스트 항목',
    hazard: item.hazard_factor ?? '',
    measure: item.improve_action || item.current_status || 'TBM에서 보완조치 확인',
    level: item.check_result === 'improve' ? 'high' : 'medium',
  }))

  const opsPoints: TbmPoint[] = ((assessment.ops_items ?? []) as any[]).map((item, idx) => ({
    seq: idx + 1,
    work: item.work_name || item.work_step || 'OPS 작업',
    hazard: item.hazard_factor ?? '',
    measure: [item.current_measure, item.additional_measure, item.worker_pledge].filter(Boolean).join(' / ') || 'TBM 공유사항 확인',
    level: item.is_sufficient ? 'medium' : 'high',
  }))

  const merged = [...matrixPoints, ...threeLevelPoints, ...checklistPoints, ...opsPoints]
    .filter(point => point.hazard.trim().length > 0)
    .sort((a, b) => levelPriority(a.level) - levelPriority(b.level))
    .slice(0, 10)

  return merged.map((point, idx) => ({ ...point, seq: idx + 1 }))
}

export default function RiskTbmPage() {
  const [loadingRisks, setLoadingRisks] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [risks, setRisks] = useState<RiskLite[]>([])
  const [selectedRiskId, setSelectedRiskId] = useState('')
  const [selectedRisk, setSelectedRisk] = useState<any>(null)
  const [tbmPoints, setTbmPoints] = useState<TbmPoint[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [meeting, setMeeting] = useState({
    tbm_date: new Date().toISOString().slice(0, 10),
    location: '',
    team_leader: '',
    weather: '',
    note: '',
  })
  const [attendees, setAttendees] = useState(
    Array.from({ length: ATTENDEE_ROWS }, () => ({ name: '', role: '' }))
  )

  useEffect(() => {
    async function loadList() {
      setLoadingRisks(true)
      try {
        const res = await fetch('/api/risk?pageSize=100')
        const json = await res.json()
        const list: RiskLite[] = (json.data ?? []) as RiskLite[]
        setRisks(list)

        if (list.length > 0) {
          const preferred = list.find(item => item.eval_type === 'always_on') ?? list[0]
          setSelectedRiskId(preferred.id)
        }
      } finally {
        setLoadingRisks(false)
      }
    }
    loadList()
  }, [])

  useEffect(() => {
    async function loadDetail() {
      if (!selectedRiskId) return

      setLoadingDetail(true)
      try {
        const res = await fetch(`/api/risk/${selectedRiskId}`)
        const json = await res.json()
        const doc = json.data
        setSelectedRisk(doc)
        setTbmPoints(buildTbmPoints(doc))
      } finally {
        setLoadingDetail(false)
      }
    }
    loadDetail()
  }, [selectedRiskId])

  const selectedRiskMeta = useMemo(
    () => risks.find(risk => risk.id === selectedRiskId) ?? null,
    [risks, selectedRiskId]
  )

  const progressCount = Object.values(checked).filter(Boolean).length
  const totalCheckItems = TBM_PHASES.reduce((acc, phase) => acc + phase.items.length, 0) + tbmPoints.length

  return (
    <div className="max-w-6xl mx-auto print:max-w-none">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/risk" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-violet-600" />
              T.B.M (작업 전 안전점검회의)
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              위험성평가 연계 10분 회의 | 사전 준비 → 실행 → 환류 흐름으로 현장 공유
            </p>
          </div>
        </div>
        <button onClick={() => window.print()} className="btn-secondary text-sm gap-1.5">
          <Printer className="w-4 h-4" /> 인쇄
        </button>
      </div>

      <div className="card p-4 mb-4 print:mb-3">
        <div className="grid md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="label-base">연계 위험성평가</label>
            <select
              value={selectedRiskId}
              onChange={e => setSelectedRiskId(e.target.value)}
              className="input-base text-sm"
              disabled={loadingRisks || risks.length === 0}
            >
              {loadingRisks && <option>불러오는 중...</option>}
              {!loadingRisks && risks.length === 0 && <option>위험성평가 없음</option>}
              {!loadingRisks && risks.map(risk => (
                <option key={risk.id} value={risk.id}>
                  [{EVAL_TYPE_LABEL[risk.eval_type] ?? '평가'}] {risk.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">TBM 일자</label>
            <input
              type="date"
              value={meeting.tbm_date}
              onChange={e => setMeeting(prev => ({ ...prev, tbm_date: e.target.value }))}
              className="input-base text-sm"
            />
          </div>
          <div>
            <label className="label-base">작업 위치</label>
            <input
              value={meeting.location}
              onChange={e => setMeeting(prev => ({ ...prev, location: e.target.value }))}
              className="input-base text-sm"
              placeholder="예: A동 지하 1층"
            />
          </div>
          <div>
            <label className="label-base">팀장/진행자</label>
            <input
              value={meeting.team_leader}
              onChange={e => setMeeting(prev => ({ ...prev, team_leader: e.target.value }))}
              className="input-base text-sm"
              placeholder="예: 홍길동 반장"
            />
          </div>
          <div>
            <label className="label-base">날씨/특이사항</label>
            <input
              value={meeting.weather}
              onChange={e => setMeeting(prev => ({ ...prev, weather: e.target.value }))}
              className="input-base text-sm"
              placeholder="예: 강풍, 우천"
            />
          </div>
        </div>

        {selectedRiskMeta && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
              연계 문서: {selectedRiskMeta.title}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              유형: {EVAL_TYPE_LABEL[selectedRiskMeta.eval_type] ?? '평가'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              평가일: {selectedRiskMeta.eval_start_date}
            </span>
            <Link href={`/risk/${selectedRiskMeta.id}`} className="text-blue-600 hover:underline inline-flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5" /> 위험성평가 원문 열기
            </Link>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {TBM_PHASES.map(phase => (
          <div key={phase.key} className="card p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-2">{phase.title}</h2>
            <div className="space-y-2">
              {phase.items.map(item => {
                const key = `${phase.key}-${item}`
                return (
                  <label key={key} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!checked[key]}
                      onChange={e => setChecked(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="mt-0.5 w-3.5 h-3.5 accent-violet-600"
                    />
                    <span className="text-xs text-gray-600 leading-relaxed">{item}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-violet-600" />
            위험성평가 연계 핵심 위험요인 공유
          </h2>
          <span className="text-xs text-gray-400">
            체크 진행률 {progressCount}/{totalCheckItems || 1}
          </span>
        </div>

        {loadingDetail ? (
          <div className="p-8 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> 연계 항목 불러오는 중...
          </div>
        ) : tbmPoints.length === 0 ? (
          <div className="p-8 text-sm text-gray-400 text-center">
            연계 가능한 위험요인이 없습니다. 위험성평가 문서를 먼저 작성해 주세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[860px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['#', '작업', '핵심 위험요인', '감소대책(TBM 전달)', '위험도', '전달 확인'].map(header => (
                    <th key={header} className="px-3 py-2.5 text-left font-semibold text-gray-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tbmPoints.map(point => {
                  const rowKey = `point-${point.seq}`
                  const tone = LEVEL_TONE[point.level]
                  return (
                    <tr key={rowKey}>
                      <td className="px-3 py-2.5 text-gray-400">{point.seq}</td>
                      <td className="px-3 py-2.5 text-gray-700">{point.work || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-700">{point.hazard}</td>
                      <td className="px-3 py-2.5 text-gray-700">{point.measure}</td>
                      <td className="px-3 py-2.5">
                        <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold', tone.cls)}>
                          {tone.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!checked[rowKey]}
                            onChange={e => setChecked(prev => ({ ...prev, [rowKey]: e.target.checked }))}
                            className="w-3.5 h-3.5 accent-violet-600"
                          />
                          <span className="text-gray-500">공유 완료</span>
                        </label>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">참석자 서명</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                {['번호', '성명', '직종/역할', '서명'].map(header => (
                  <th key={header} className="px-3 py-2 text-left font-semibold text-gray-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attendees.map((attendee, idx) => (
                <tr key={`attendee-${idx}`}>
                  <td className="px-3 py-2 text-gray-400 w-16">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      value={attendee.name}
                      onChange={e => setAttendees(prev => prev.map((row, rowIdx) => rowIdx === idx ? { ...row, name: e.target.value } : row))}
                      className="input-base text-xs py-1.5"
                      placeholder="성명"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={attendee.role}
                      onChange={e => setAttendees(prev => prev.map((row, rowIdx) => rowIdx === idx ? { ...row, role: e.target.value } : row))}
                      className="input-base text-xs py-1.5"
                      placeholder="예: 철근반, 형틀반"
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-300">_____________________</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4 print:hidden">
        <label className="label-base">비고 / 조치결과</label>
        <textarea
          value={meeting.note}
          onChange={e => setMeeting(prev => ({ ...prev, note: e.target.value }))}
          className="input-base text-sm resize-none"
          rows={3}
          placeholder="예: 고위험 2건 즉시 개선 완료, 비계 난간 보강 후 작업 재개"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {selectedRiskId && (
            <>
              <Link href={`/documents/education/new?from=${selectedRiskId}`} className="btn-secondary">
                <FileText className="w-3.5 h-3.5" /> 교육일지 생성
              </Link>
              <Link href={`/documents/workplan/new?from=${selectedRiskId}`} className="btn-secondary">
                <FileText className="w-3.5 h-3.5" /> 작업계획서 생성
              </Link>
              <Link href={`/documents/inspection/new?risk_id=${selectedRiskId}`} className="btn-secondary">
                <FileText className="w-3.5 h-3.5" /> 점검일지 생성
              </Link>
            </>
          )}
          <button onClick={() => window.print()} className="btn-primary gap-1.5" style={{ background: '#7c3aed' }}>
            <Printer className="w-3.5 h-3.5" /> TBM 출력
          </button>
        </div>
      </div>
    </div>
  )
}
