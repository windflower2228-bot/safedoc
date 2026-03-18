'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, ClipboardCheck, Plus, Loader2,
  AlertTriangle, CheckCircle2, Clock, XCircle, RefreshCw,
  CalendarDays, ChevronDown, ChevronUp, Settings,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  SAFETY_INSPECTION_TYPES, STATUS_CFG, CATEGORY_CFG,
  calcNextInspectionDate, calcInspectionStatus,
  type SafetyInspectionType,
} from '@/types/hazardous-machinery'

interface InspectionItem {
  id:                  string
  machine_type:        string
  machine_name:        string
  model_no:            string | null
  serial_no:           string | null
  location:            string | null
  install_date:        string | null
  is_applicable:       boolean
  inapplicable_reason: string | null
  inspection_records:  any[]
  last_inspection_date:string | null
  next_due_date:       string | null
  inspection_cycle:    string | null
  inspection_status:   string
  notes:               string | null
}

// 세부 입력 모달
function InspectionRecordModal({
  item, machineType, onClose, onSaved,
}: {
  item: InspectionItem | null
  machineType: SafetyInspectionType
  onClose: () => void
  onSaved: (updated: InspectionItem) => void
}) {
  const [saving,     setSaving]    = useState(false)
  const [isConstr,   setIsConstr]  = useState(false)
  const [isPsm,      setIsPsm]     = useState(false)
  const [form, setForm] = useState({
    inspection_date: new Date().toISOString().slice(0, 10),
    result:          'pass',
    cert_no:         '',
    agency:          '',
    notes:           '',
  })

  const nextDate = form.inspection_date
    ? calcNextInspectionDate(machineType.code, form.inspection_date, isConstr, isPsm)
    : null

  async function save() {
    if (!item) return
    setSaving(true)
    const newRecord = {
      seq:            (item.inspection_records?.length ?? 0) + 1,
      inspection_date: form.inspection_date,
      result:          form.result,
      cert_no:         form.cert_no || null,
      agency:          form.agency || null,
      next_due_date:   nextDate,
      notes:           form.notes || null,
    }
    const records = [...(item.inspection_records ?? []), newRecord]
    const payload = {
      inspection_records:   records,
      last_inspection_date: form.inspection_date,
      next_due_date:        nextDate,
      inspection_cycle:     isConstr ? '6개월' : isPsm ? '4년' : machineType.cycleLabel,
      inspection_status:    calcInspectionStatus(nextDate, true),
    }
    const res  = await fetch(`/api/hazardous-machinery/safety-inspection/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }

    // 활동계획표 연계
    if (nextDate) {
      await fetch('/api/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:     `[안전검사] ${item.machine_name} (${machineType.label})`,
          plan_date: nextDate,
          category:  'inspection',
          description: `산안법 제93조 법정 안전검사 | ${machineType.cycleLabel}마다 | 기계번호: ${item.serial_no || '—'}`,
          is_recurring: false,
        }),
      })
      toast.success('활동계획표에 다음 검사 일정이 자동 등록되었습니다.')
    }
    onSaved(json.data)
    onClose()
  }

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">안전검사 이력 등록</h2>
            <p className="text-xs text-gray-400 mt-0.5">{item.machine_name} — {machineType.label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">검사 일자 *</label>
              <input type="date" value={form.inspection_date}
                onChange={e => setForm(f => ({ ...f, inspection_date: e.target.value }))}
                className="input-base" />
            </div>
            <div>
              <label className="label-base">검사 결과</label>
              <select value={form.result}
                onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                className="input-base">
                <option value="pass">합격</option>
                <option value="fail">불합격</option>
                <option value="conditional">조건부 합격</option>
              </select>
            </div>
            <div>
              <label className="label-base">합격증 번호</label>
              <input value={form.cert_no}
                onChange={e => setForm(f => ({ ...f, cert_no: e.target.value }))}
                placeholder="안전검사 합격증 번호" className="input-base" />
            </div>
            <div>
              <label className="label-base">검사기관</label>
              <input value={form.agency}
                onChange={e => setForm(f => ({ ...f, agency: e.target.value }))}
                placeholder="예: 한국안전기술원" className="input-base" />
            </div>
          </div>

          {/* 특수 조건 */}
          <div className="space-y-2 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-600 mb-2">검사주기 조건</p>
            {['crane','lift','gondola'].includes(machineType.code) && (
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={isConstr}
                  onChange={e => setIsConstr(e.target.checked)}
                  className="w-4 h-4 accent-orange-600" />
                <span className="text-gray-700">건설현장 사용 (6개월마다)</span>
              </label>
            )}
            {machineType.code === 'pressure_vessel' && (
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={isPsm}
                  onChange={e => setIsPsm(e.target.checked)}
                  className="w-4 h-4 accent-purple-600" />
                <span className="text-gray-700">PSM(공정안전보고서) 적용 압력용기 (4년마다)</span>
              </label>
            )}
            <div className="text-xs text-gray-400 mt-1">
              기본 검사주기: <span className="font-medium text-gray-700">{machineType.cycleLabel}</span>
            </div>
          </div>

          {/* 다음 검사 예정일 자동 계산 */}
          {nextDate && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
              <CalendarDays className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <div className="text-xs text-blue-600 font-semibold">다음 검사 예정일 (자동 계산)</div>
                <div className="text-sm font-bold text-blue-800 mt-0.5">{nextDate}</div>
                <div className="text-[10px] text-blue-500 mt-0.5">저장 시 활동계획표에 자동 등록됩니다.</div>
              </div>
            </div>
          )}

          <div>
            <label className="label-base">비고</label>
            <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              className="input-base" />
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">취소</button>
          <button onClick={save} disabled={saving}
            className="btn-primary" style={{ background: '#dc2626' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            검사 이력 저장
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SafetyInspectionPage() {
  const [items,     setItems]     = useState<InspectionItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [selItem,   setSelItem]   = useState<InspectionItem | null>(null)
  const [selMType,  setSelMType]  = useState<SafetyInspectionType | null>(null)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [initializing, setInit]   = useState(false)

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    setLoading(true)
    const res = await fetch('/api/hazardous-machinery/safety-inspection')
    const j   = await res.json()
    setItems(j.data ?? [])
    setLoading(false)
  }

  // 법정 13종 초기 데이터 생성
  async function initAllMachines() {
    setInit(true)
    await fetch('/api/hazardous-machinery/safety-inspection/init', { method: 'POST' })
    await loadItems()
    setInit(false)
    toast.success('안전검사 대상 13종이 초기화되었습니다.')
  }

  // 해당여부 토글
  async function toggleApplicable(item: InspectionItem) {
    const newVal = !item.is_applicable
    const res = await fetch(`/api/hazardous-machinery/safety-inspection/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_applicable: newVal,
        inspection_status: newVal
          ? calcInspectionStatus(item.next_due_date, true)
          : 'inapplicable',
      }),
    })
    if (res.ok) {
      setItems(prev => prev.map(i =>
        i.id === item.id
          ? { ...i, is_applicable: newVal, inspection_status: newVal ? i.inspection_status : 'inapplicable' }
          : i
      ))
    }
  }

  function openRecord(item: InspectionItem) {
    const mt = SAFETY_INSPECTION_TYPES.find(t => t.code === item.machine_type)
    if (!mt) return
    setSelItem(item)
    setSelMType(mt)
  }

  function onRecordSaved(updated: InspectionItem) {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    setSelItem(null)
    setSelMType(null)
  }

  // 카테고리별 그룹핑
  const categories = ['lifting', 'press', 'vessel', 'other'] as const
  const grouped = categories.map(cat => ({
    cat,
    ...CATEGORY_CFG[cat],
    types: SAFETY_INSPECTION_TYPES.filter(t => t.category === cat),
  }))

  // 아이템을 타입코드로 조회
  function getItem(code: string) {
    return items.find(i => i.machine_type === code) ?? null
  }

  // D-day 계산
  function getDday(nextDate: string | null) {
    if (!nextDate) return null
    const d = Math.ceil((new Date(nextDate).getTime() - Date.now()) / 86400000)
    return d
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/hazardous-machinery" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-red-600" />
              안전검사 관리
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              산안법 제93조 / 시행령 제78조 | 13종 대상 | 2년마다 (건설현장 6개월)
            </p>
          </div>
        </div>
        {items.length === 0 && !loading && (
          <button onClick={initAllMachines} disabled={initializing}
            className="btn-primary text-sm gap-1.5" style={{ background: '#dc2626' }}>
            {initializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
            13종 전체 초기화
          </button>
        )}
      </div>

      {/* 상태 요약 */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { key:'overdue',       icon: AlertTriangle, label:'검사 초과',   color:'#dc2626', bg:'#fef2f2' },
            { key:'expiring_soon', icon: Clock,          label:'만료 임박',  color:'#d97706', bg:'#fffbeb' },
            { key:'valid',         icon: CheckCircle2,  label:'유효',        color:'#16a34a', bg:'#f0fdf4' },
            { key:'pending',       icon: RefreshCw,     label:'미입력',      color:'#6b7280', bg:'#f9fafb' },
          ].map(s => {
            const cnt = items.filter(i => i.inspection_status === s.key && i.is_applicable).length
            const Icon = s.icon
            return (
              <div key={s.key} className="card p-3 flex items-center gap-3"
                style={{ background: s.bg, borderColor: s.color + '20' }}>
                <Icon className="w-5 h-5 flex-shrink-0" style={{ color: s.color }} />
                <div>
                  <div className="text-lg font-bold" style={{ color: s.color }}>{cnt}</div>
                  <div className="text-[10px] text-gray-500">{s.label}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 법정 기계 유형별 테이블 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(g => (
            <div key={g.cat} className="card overflow-hidden">
              {/* 카테고리 헤더 */}
              <button
                onClick={() => setExpanded(expanded === g.cat ? null : g.cat)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:opacity-90 transition-opacity"
                style={{ background: g.bg }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: g.color }}>{g.label}</span>
                  <span className="text-xs rounded-full px-2 py-0.5 font-medium"
                    style={{ background: 'white', color: g.color }}>
                    {g.types.length}종
                  </span>
                  {/* 카테고리 내 이슈 카운트 */}
                  {g.types.some(t => {
                    const item = getItem(t.code)
                    return item?.is_applicable && ['overdue','expiring_soon'].includes(item?.inspection_status ?? '')
                  }) && (
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      조치 필요
                    </span>
                  )}
                </div>
                {expanded === g.cat
                  ? <ChevronUp className="w-4 h-4" style={{ color: g.color }} />
                  : <ChevronDown className="w-4 h-4" style={{ color: g.color }} />}
              </button>

              {(expanded === g.cat || expanded === null) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: '900px' }}>
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 w-5">해당</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">기계 종류</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">기계명·위치</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">검사주기</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">최근 검사일</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">다음 검사 예정</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">D-day</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">상태</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">이력 수</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {g.types.map(mt => {
                        const item = getItem(mt.code)
                        const sc   = STATUS_CFG[item?.inspection_status as keyof typeof STATUS_CFG ?? 'pending']
                        const dday = getDday(item?.next_due_date ?? null)
                        const isApplicable = item?.is_applicable ?? true

                        return (
                          <tr key={mt.code}
                            className={clsx('hover:bg-gray-50', !isApplicable && 'opacity-50')}>
                            {/* 해당 여부 체크박스 */}
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isApplicable}
                                onChange={() => item && toggleApplicable(item)}
                                disabled={!item}
                                title={isApplicable ? '해당 있음 (클릭 시 해당 없음)' : '해당 없음 (클릭 시 해당 있음)'}
                                className="w-4 h-4 accent-red-600 cursor-pointer"
                              />
                            </td>
                            {/* 기계 종류 */}
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 text-xs">{mt.label}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{mt.legalRef}</div>
                              {mt.notes && (
                                <div className="text-[10px] text-gray-400 mt-0.5 italic">{mt.notes}</div>
                              )}
                            </td>
                            {/* 기계명 */}
                            <td className="px-4 py-3">
                              {item ? (
                                <div>
                                  <div className="text-xs font-medium text-gray-800">{item.machine_name || '—'}</div>
                                  <div className="text-[10px] text-gray-400">{item.location || ''}</div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300">미등록</span>
                              )}
                            </td>
                            {/* 검사주기 */}
                            <td className="px-4 py-3">
                              <span className="text-xs text-gray-600">
                                {item?.inspection_cycle ?? mt.cycleLabel}
                              </span>
                            </td>
                            {/* 최근 검사일 */}
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {item?.last_inspection_date ?? <span className="text-gray-300">없음</span>}
                            </td>
                            {/* 다음 검사 예정 */}
                            <td className="px-4 py-3">
                              {item?.next_due_date
                                ? <span className={clsx('text-xs font-medium',
                                    item.inspection_status === 'overdue'       ? 'text-red-600'   :
                                    item.inspection_status === 'expiring_soon' ? 'text-amber-600' : 'text-gray-700')}>
                                    {item.next_due_date}
                                  </span>
                                : <span className="text-xs text-gray-300">—</span>}
                            </td>
                            {/* D-day */}
                            <td className="px-4 py-3">
                              {isApplicable && dday !== null
                                ? <span className={clsx('text-xs font-bold',
                                    dday < 0   ? 'text-red-600'   :
                                    dday <= 60 ? 'text-amber-600' : 'text-green-600')}>
                                    {dday < 0 ? `D+${Math.abs(dday)}` : `D-${dday}`}
                                  </span>
                                : <span className="text-xs text-gray-300">—</span>}
                            </td>
                            {/* 상태 */}
                            <td className="px-4 py-3">
                              <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', sc.cls)}>
                                {sc.label}
                              </span>
                            </td>
                            {/* 이력 수 */}
                            <td className="px-4 py-3 text-xs text-gray-500 text-center">
                              {item ? (item.inspection_records?.length ?? 0) + '건' : '—'}
                            </td>
                            {/* 액션 */}
                            <td className="px-3 py-3">
                              {item ? (
                                <button
                                  onClick={() => openRecord(item)}
                                  disabled={!isApplicable}
                                  className="text-xs text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-30 hover:opacity-90 transition-opacity"
                                  style={{ background: g.color }}>
                                  검사 입력
                                </button>
                              ) : (
                                <Link href={`/hazardous-machinery/safety-inspection/new?type=${mt.code}`}
                                  className="text-xs text-white px-3 py-1.5 rounded-lg font-medium hover:opacity-90"
                                  style={{ background: g.color }}>
                                  등록
                                </Link>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 검사 이력 입력 모달 */}
      {selItem && selMType && (
        <InspectionRecordModal
          item={selItem}
          machineType={selMType}
          onClose={() => { setSelItem(null); setSelMType(null) }}
          onSaved={onRecordSaved}
        />
      )}
    </div>
  )
}
