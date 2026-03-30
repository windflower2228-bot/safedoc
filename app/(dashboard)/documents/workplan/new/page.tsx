'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2, ClipboardCheck, Plus, Trash2, ChevronRight, ChevronLeft,
  Save, Link2, Users, Sparkles, RefreshCw, Info, Check,
  AlertTriangle, Wrench, ShieldCheck,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  WORK_PLAN_TYPE_LABELS,
  ANNEX4_WORK_LABELS, ANNEX4_WORK_TO_PLAN_TYPE,
  type WorkPlanRiskItem, type WorkPlanWorker, type WorkPlanType, type Annex4WorkKey,
} from '@/types/workplan'
import {
  DEFAULT_ANNEX4_BY_PLAN_TYPE,
  ensureWorkPlanLegalBasis,
  ensureWorkPlanScopeWithLegal,
} from '@/lib/legal/mandatoryContent'

const STEPS = ['기본정보', '위험요인·감소대책', '작업 방법', '작업 인원', '최종 확인']
const PLAN_TYPES = Object.entries(WORK_PLAN_TYPE_LABELS) as [WorkPlanType, string][]
const ANNEX4_WORKS = Object.entries(ANNEX4_WORK_LABELS) as [Annex4WorkKey, string][]
const LEVEL_STYLE: Record<string, { label: string; cls: string }> = {
  high:   { label: '高', cls: 'badge-high' },
  medium: { label: '中', cls: 'badge-medium' },
  low:    { label: '低', cls: 'badge-low' },
}
const WORKER_ROLES = ['작업 책임자', '작업반장', '작업원', '안전감시자', '신호수', '운전원', '기타']

interface FormData {
  title:               string
  annex4_work_key:     Annex4WorkKey
  plan_round:          number
  plan_type:           WorkPlanType
  work_location:       string
  work_start_date:     string
  work_end_date:       string
  work_start_time:     string
  work_end_time:       string
  work_scope:          string
  legal_basis:         string
  supervisor_name:     string
  supervisor_position: string
  supervisor_phone:    string
  safety_summary:      string
  risk_items:          WorkPlanRiskItem[]
  workers:             WorkPlanWorker[]
}

export default function NewWorkPlanPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const fromRiskId   = searchParams.get('from')

  const [step, setStep]           = useState(0)
  const [saving, setSaving]       = useState(false)
  const [generating, setGen]      = useState(false)
  const [includeAll, setInclude]  = useState(false)
  const [sourceRisk, setSource]   = useState<{ id: string; title: string } | null>(null)
  const [linkSummary, setSummary] = useState<any>(null)

  const form = useForm<FormData>({
    defaultValues: {
      title: '',
      annex4_work_key: 'tower_crane_install',
      plan_round: 1,
      plan_type: ANNEX4_WORK_TO_PLAN_TYPE.tower_crane_install,
      work_location: '',
      work_start_date: new Date().toISOString().slice(0, 10),
      work_end_date: '',
      work_start_time: '08:00', work_end_time: '18:00',
      work_scope: '', legal_basis: '',
      supervisor_name: '', supervisor_position: '', supervisor_phone: '',
      safety_summary: '',
      risk_items: [],
      workers: [
        { seq: 1, name: '', position: '', role: '작업 책임자', license: '' },
        { seq: 2, name: '', position: '', role: '작업반장',   license: '' },
        { seq: 3, name: '', position: '', role: '작업원',     license: '' },
        { seq: 4, name: '', position: '', role: '안전감시자', license: '' },
      ],
    },
  })

  const { fields: riskFields, replace: replaceRisk, append: appendRisk, remove: removeRisk } =
    useFieldArray({ control: form.control, name: 'risk_items' })

  const { fields: workerFields, append: appendWorker, remove: removeWorker } =
    useFieldArray({ control: form.control, name: 'workers' })

  // 자동 생성
  const generate = useCallback(async (riskId: string, all = false) => {
    setGen(true)
    try {
      const res  = await fetch('/api/documents/workplan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ risk_id: riskId, include_all: all }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      if (json.warning) { toast.warning(json.warning); return }

      const d = json.data
      const nextWorkKey: Annex4WorkKey =
        d.annex4_work_key ?? DEFAULT_ANNEX4_BY_PLAN_TYPE[d.plan_type]
      const nextPlanRound: number = Number(d.plan_round || 1)
      form.reset({
        ...form.getValues(),
        title:               d.title,
        annex4_work_key:     nextWorkKey,
        plan_round:          nextPlanRound,
        plan_type:           d.plan_type,
        work_location:       d.work_location,
        work_start_date:     d.work_start_date,
        work_end_date:       d.work_end_date,
        work_scope:          d.work_scope,
        legal_basis:         d.legal_basis,
        supervisor_name:     d.supervisor_name,
        supervisor_position: d.supervisor_position,
        safety_summary:      d.safety_summary,
        risk_items:          d.risk_items,
        workers:             d.workers,
      })
      setSource({ id: riskId, title: d.source_risk_title })
      setSummary(d.link_summary)
      toast.success('작업계획서 초안이 자동 생성되었습니다!', {
        description: `위험요인 ${d.link_summary.linked_items}건의 감소대책이 반영되었습니다.`,
      })
    } finally { setGen(false) }
  }, [form])

  useEffect(() => {
    if (fromRiskId) generate(fromRiskId, false)
  }, [fromRiskId, generate])

  function buildAutoTitle(workKey: Annex4WorkKey, round: number) {
    return `${ANNEX4_WORK_LABELS[workKey]} 작업계획서 (${round}차)`
  }

  useEffect(() => {
    const key = form.getValues('annex4_work_key')
    const round = Number(form.getValues('plan_round') || 1)
    if (!form.getValues('title')) {
      form.setValue('title', buildAutoTitle(key, round))
    }
    if (!form.getValues('legal_basis')) {
      form.setValue('legal_basis', ensureWorkPlanLegalBasis('', ANNEX4_WORK_TO_PLAN_TYPE[key]))
    }
  }, [form])

  async function onSave(status: 'draft' | 'approved') {
    const v = form.getValues()
    if (!v.work_location)  { toast.error('작업 장소를 입력해주세요.');       setStep(0); return }
    if (!v.risk_items.length) { toast.error('작업 항목을 1개 이상 입력해주세요.'); setStep(1); return }

    const autoTitle = buildAutoTitle(v.annex4_work_key, Number(v.plan_round) || 1)
    const finalTitle = (v.title ?? '').trim() || autoTitle
    const finalScope = ensureWorkPlanScopeWithLegal(v.work_scope, v.annex4_work_key, Number(v.plan_round) || 1)
    const finalLegal = ensureWorkPlanLegalBasis(v.legal_basis, v.plan_type)

    setSaving(true)
    const res = await fetch('/api/documents/workplan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_risk_id: sourceRisk?.id,
        project_id: undefined,
        title: finalTitle,
        annex4_work_key: v.annex4_work_key,
        plan_round: Number(v.plan_round) || 1,
        plan_type: v.plan_type,
        work_location: v.work_location,
        work_start_date: v.work_start_date,
        work_end_date: v.work_end_date,
        work_start_time: v.work_start_time,
        work_end_time: v.work_end_time,
        work_scope: finalScope,
        legal_basis: finalLegal,
        supervisor_name: v.supervisor_name,
        supervisor_position: v.supervisor_position,
        supervisor_phone: v.supervisor_phone,
        safety_summary: v.safety_summary,
        risk_items: v.risk_items,
        workers: v.workers,
        status,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success(status === 'approved' ? '작업계획서가 승인되었습니다.' : '임시 저장되었습니다.')
    router.push(`/documents/workplan/${json.data.id}`)
  }

  const riskItems   = form.watch('risk_items')
  const highCount   = riskItems.filter(i => i.risk_level === 'high').length
  const totalWorker = riskItems.reduce((sum, i) => sum + (i.worker_count || 0), 0)

  return (
    <div className="max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-green-600" />
            작업계획서 작성
          </h1>
          {sourceRisk && (
            <div className="flex items-center gap-1.5 mt-1">
              <Link2 className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-700">
                위험성평가 연계: <strong>{sourceRisk.title}</strong>
              </span>
              {linkSummary && (
                <span className="text-xs text-gray-400 ml-1">
                  (감소대책 {linkSummary.linked_items}건 자동 반영)
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="btn-secondary">취소</button>
          <button onClick={() => onSave('draft')} disabled={saving} className="btn-secondary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            임시저장
          </button>
        </div>
      </div>

      {/* AI 자동생성 배너 */}
      {!sourceRisk && !fromRiskId && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">위험성평가에서 자동 생성</p>
            <p className="text-xs text-green-600 mt-0.5">
              위험성평가 ID를 입력하면 위험요인·감소대책·작업방법이 자동으로 채워집니다.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <input id="risk-input" type="text"
                placeholder="위험성평가 UUID..."
                className="input-base text-xs flex-1 max-w-xs py-1.5" />
              <button
                onClick={() => {
                  const val = (document.getElementById('risk-input') as HTMLInputElement).value.trim()
                  if (val) generate(val, includeAll)
                  else toast.error('위험성평가 ID를 입력해주세요.')
                }}
                disabled={generating}
                className="btn-primary text-xs py-1.5"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                자동 생성
              </button>
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-green-700 cursor-pointer mt-1">
            <input type="checkbox" checked={includeAll} onChange={e => setInclude(e.target.checked)}
              className="w-3.5 h-3.5 accent-green-600" />
            전체 항목
          </label>
        </div>
      )}

      {/* 스텝 */}
      <div className="flex items-center gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1">
        {STEPS.map((label, i) => (
          <button key={i} type="button" onClick={() => i < step && setStep(i)}
            className={clsx(
              'flex items-center gap-1.5 flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all',
              i === step ? 'bg-green-600 text-white shadow-sm'
              : i < step ? 'text-green-600 hover:bg-green-50 cursor-pointer'
              : 'text-gray-400 cursor-default'
            )}>
            <span className={clsx(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
              i === step ? 'bg-white/20 text-white'
              : i < step ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-400'
            )}>{i < step ? '✓' : i + 1}</span>
            <span className="hidden sm:inline truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* ── STEP 0: 기본정보 ─────────────────────────────── */}
      {step === 0 && (
        <div className="card p-6 space-y-5 animate-fade-in">
          <h2 className="font-semibold text-gray-800 pb-3 border-b border-gray-100">작업 기본정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label-base">작업계획서 제목 *</label>
              <input {...form.register('title')} placeholder="예: 고소 철골 조립 작업계획서"
                className="input-base" />
            </div>
            <div className="col-span-2">
              <label className="label-base">별표 4 대상작업 선택 *</label>
              <select
                {...form.register('annex4_work_key')}
                onChange={(e) => {
                  const key = e.target.value as Annex4WorkKey
                  form.setValue('annex4_work_key', key)
                  form.setValue('plan_type', ANNEX4_WORK_TO_PLAN_TYPE[key])
                  const round = Number(form.getValues('plan_round') || 1)
                  const title = form.getValues('title')
                  if (!title || title.includes('작업계획서')) {
                    form.setValue('title', buildAutoTitle(key, round))
                  }
                  form.setValue('legal_basis', ensureWorkPlanLegalBasis('', ANNEX4_WORK_TO_PLAN_TYPE[key]))
                }}
                className="input-base"
              >
                {ANNEX4_WORKS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <p className="text-[11px] text-green-700 mt-1">별표 4 대상작업을 선택하면 작업종류·관계법령이 자동 반영됩니다.</p>
            </div>
            <div>
              <label className="label-base">계획서 회차 *</label>
              <input
                {...form.register('plan_round', { valueAsNumber: true })}
                type="number"
                min={1}
                className="input-base"
                onChange={(e) => {
                  const round = Number(e.target.value || 1)
                  form.setValue('plan_round', round)
                  const key = form.getValues('annex4_work_key')
                  const title = form.getValues('title')
                  if (!title || title.includes('작업계획서')) {
                    form.setValue('title', buildAutoTitle(key, round))
                  }
                }}
              />
              <p className="text-[11px] text-gray-500 mt-1">동일 작업에 대해 1차/2차 등 여러 계획서를 작성할 수 있습니다.</p>
            </div>
            <div>
              <label className="label-base">작업 종류 *</label>
              <select {...form.register('plan_type')} className="input-base">
                {PLAN_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label-base">작업 장소 *</label>
              <input {...form.register('work_location')} placeholder="예: 4공구 현장 B동 3층"
                className="input-base" />
            </div>
            <div>
              <label className="label-base">작업 시작일 *</label>
              <input {...form.register('work_start_date')} type="date" className="input-base" />
            </div>
            <div>
              <label className="label-base">작업 종료일 *</label>
              <input {...form.register('work_end_date')} type="date" className="input-base" />
            </div>
            <div>
              <label className="label-base">작업 시작 시간</label>
              <input {...form.register('work_start_time')} type="time" className="input-base" />
            </div>
            <div>
              <label className="label-base">작업 종료 시간</label>
              <input {...form.register('work_end_time')} type="time" className="input-base" />
            </div>
            <div>
              <label className="label-base">작업 책임자</label>
              <input {...form.register('supervisor_name')} placeholder="홍길동" className="input-base" />
            </div>
            <div>
              <label className="label-base">책임자 직위</label>
              <input {...form.register('supervisor_position')} placeholder="현장소장" className="input-base" />
            </div>
            <div>
              <label className="label-base">책임자 연락처</label>
              <input {...form.register('supervisor_phone')} placeholder="010-0000-0000" className="input-base" />
            </div>
            <div>
              <label className="label-base">관계 법령</label>
              <input {...form.register('legal_basis')} className="input-base text-xs"
                placeholder={ensureWorkPlanLegalBasis('', form.watch('plan_type'))} />
            </div>
            <div className="col-span-2">
              <label className="label-base">작업 범위·개요</label>
              <textarea {...form.register('work_scope')} rows={4} className="input-base resize-none"
                placeholder="작업 목적, 범위, 주요 내용을 입력하세요" />
            </div>
          </div>

          {/* 법령 자동 채우기 */}
          <button
            type="button"
            onClick={() => form.setValue('legal_basis', ensureWorkPlanLegalBasis('', form.watch('plan_type')))}
            className="text-xs text-green-600 hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" /> 작업 종류에 맞는 관계 법령 자동 입력
          </button>
        </div>
      )}

      {/* ── STEP 1: 위험요인·감소대책 ───────────────────────── */}
      {step === 1 && (
        <div className="animate-fade-in space-y-3">
          {/* 연계 배너 */}
          {linkSummary && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">위험성평가 감소대책 자동 반영 완료</p>
                <p className="text-xs text-green-700 mt-0.5">
                  "{linkSummary.source_risk_title}"에서
                  高위험 {linkSummary.high_count}건·中위험 {linkSummary.medium_count}건 감소대책이 반영됐습니다.
                  공학적 대책·관리적 대책·보호구가 자동으로 입력되어 있습니다.
                </p>
                <button onClick={() => sourceRisk && generate(sourceRisk.id, includeAll)}
                  className="flex items-center gap-1.5 text-xs text-green-700 hover:underline mt-1.5">
                  <RefreshCw className="w-3 h-3" /> 재생성
                </button>
              </div>
            </div>
          )}

          {/* 통계 바 */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '전체 항목', value: riskItems.length, cls: 'bg-gray-50 text-gray-700' },
              { label: '高위험',   value: highCount,         cls: 'bg-red-50 text-red-700' },
              { label: '中위험',   value: riskItems.filter(i => i.risk_level === 'medium').length, cls: 'bg-amber-50 text-amber-700' },
              { label: '총 투입',  value: `${totalWorker}명`, cls: 'bg-blue-50 text-blue-700' },
            ].map(s => (
              <div key={s.label} className={`card px-4 py-3 text-center ${s.cls}`}>
                <div className="text-xs opacity-70 mb-1">{s.label}</div>
                <div className="text-xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>

          {/* 항목 카드 */}
          {riskFields.length === 0 && (
            <div className="card p-8 text-center border-dashed">
              <ClipboardCheck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">항목이 없습니다. 위험성평가에서 자동 생성하거나 직접 추가하세요.</p>
            </div>
          )}

          {riskFields.map((field, idx) => {
            const item   = form.watch(`risk_items.${idx}`)
            const lStyle = LEVEL_STYLE[item?.risk_level ?? 'medium']
            return (
              <div key={field.id} className="card overflow-hidden">
                <div className={clsx(
                  'flex items-center gap-3 px-4 py-2.5',
                  item?.risk_level === 'high' ? 'bg-red-50' :
                  item?.risk_level === 'medium' ? 'bg-amber-50' : 'bg-gray-50'
                )}>
                  <span className="w-5 h-5 rounded-full bg-white text-xs font-bold text-gray-500 flex items-center justify-center shadow-sm flex-shrink-0">{idx + 1}</span>
                  <span className={lStyle.cls}>{lStyle.label}</span>
                  <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                    {item?.work_content || '(작업 내용 미입력)'}
                  </span>
                  {item?.source_risk_item_id && (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <Link2 className="w-3 h-3" /> 연계
                    </span>
                  )}
                  <button onClick={() => removeRisk(idx)}
                    className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg ml-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-base">작업 내용 *</label>
                    <textarea {...form.register(`risk_items.${idx}.work_content`)} rows={2}
                      className="input-base resize-none text-sm" />
                  </div>
                  <div>
                    <label className="label-base">유해·위험요인 *</label>
                    <textarea {...form.register(`risk_items.${idx}.hazard_factor`)} rows={2}
                      className="input-base resize-none text-sm" />
                  </div>
                </div>

                {/* 감소대책 섹션 */}
                <div className="px-4 pb-4 grid grid-cols-3 gap-3">
                  <div>
                    <label className="label-base flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-blue-500" /> 공학적 대책
                    </label>
                    <textarea {...form.register(`risk_items.${idx}.engineering_measure`)} rows={2}
                      className="input-base resize-none text-sm" />
                  </div>
                  <div>
                    <label className="label-base flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-green-500" /> 관리적 대책
                    </label>
                    <textarea {...form.register(`risk_items.${idx}.admin_measure`)} rows={2}
                      className="input-base resize-none text-sm" />
                  </div>
                  <div>
                    <label className="label-base">개인 보호구</label>
                    <textarea {...form.register(`risk_items.${idx}.ppe_measure`)} rows={2}
                      className="input-base resize-none text-sm" />
                  </div>
                  <div>
                    <label className="label-base">담당자</label>
                    <input {...form.register(`risk_items.${idx}.measure_owner`)}
                      placeholder="홍길동" className="input-base text-sm" />
                  </div>
                  <div>
                    <label className="label-base">완료 기한</label>
                    <input {...form.register(`risk_items.${idx}.measure_due_date`)}
                      type="date" className="input-base text-sm" />
                  </div>
                  <div>
                    <label className="label-base">투입 인원</label>
                    <input {...form.register(`risk_items.${idx}.worker_count`, { valueAsNumber: true })}
                      type="number" min="1" className="input-base text-sm" />
                  </div>
                </div>
              </div>
            )
          })}

          <button
            onClick={() => appendRisk({
              seq: riskFields.length + 1,
              source_risk_item_id: null,
              work_content: '', hazard_factor: '',
              hazard_type: 'other', risk_level: 'medium', risk_score: 6,
              engineering_measure: '', admin_measure: '', ppe_measure: '',
              measure_owner: '', measure_due_date: '',
              work_method: '', equipment_needed: '',
              worker_count: 1, check_items: '',
            })}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-500 hover:bg-green-50/50 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> 위험요인 항목 직접 추가
          </button>
        </div>
      )}

      {/* ── STEP 2: 작업 방법 ────────────────────────────────── */}
      {step === 2 && (
        <div className="animate-fade-in space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">종합 안전대책</h3>
            <textarea {...form.register('safety_summary')} rows={8}
              className="input-base resize-none text-sm font-mono leading-relaxed"
              placeholder="TBM 실시, 보호구 착용, 비상연락체계 등 공통 안전수칙을 입력하세요" />
          </div>

          {riskFields.map((field, idx) => {
            const item = form.watch(`risk_items.${idx}`)
            const lStyle = LEVEL_STYLE[item?.risk_level ?? 'medium']
            return (
              <div key={field.id} className="card overflow-hidden">
                <div className={clsx(
                  'flex items-center gap-3 px-4 py-2.5',
                  item?.risk_level === 'high' ? 'bg-red-50' :
                  item?.risk_level === 'medium' ? 'bg-amber-50' : 'bg-gray-50'
                )}>
                  <span className={lStyle.cls}>{lStyle.label}</span>
                  <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                    {item?.work_content || `항목 ${idx + 1}`}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="label-base">작업 방법·절차</label>
                    <textarea {...form.register(`risk_items.${idx}.work_method`)} rows={5}
                      className="input-base resize-none text-sm font-mono leading-relaxed" />
                  </div>
                  <div>
                    <label className="label-base">필요 장비·자재</label>
                    <textarea {...form.register(`risk_items.${idx}.equipment_needed`)} rows={2}
                      className="input-base resize-none text-sm" />
                  </div>
                  <div>
                    <label className="label-base flex items-center gap-1">
                      <Check className="w-3 h-3 text-green-500" /> 사전 점검 항목
                    </label>
                    <textarea {...form.register(`risk_items.${idx}.check_items`)} rows={5}
                      className="input-base resize-none text-sm font-mono leading-relaxed" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── STEP 3: 작업 인원 ────────────────────────────────── */}
      {step === 3 && (
        <div className="animate-fade-in">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                작업 투입 인원
                <span className="text-xs text-gray-400 font-normal">
                  ({workerFields.filter((_, i) => form.watch(`workers.${i}.name`)).length}명 입력됨)
                </span>
              </h3>
              <button
                onClick={() => appendWorker({ seq: workerFields.length + 1, name: '', position: '', role: '작업원', license: '' })}
                className="btn-secondary text-xs py-1.5">
                <Plus className="w-3.5 h-3.5" /> 행 추가
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['번호', '성명', '직종/직위', '담당 역할', '보유 자격증', ''].map(h => (
                      <th key={h} className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {workerFields.map((field, idx) => (
                    <tr key={field.id} className={idx % 2 === 0 ? '' : 'bg-gray-50/50'}>
                      <td className="px-3 py-2 text-center text-xs text-gray-400 w-10">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input {...form.register(`workers.${idx}.name`)}
                          placeholder="홍길동" className="input-base text-sm py-1.5" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...form.register(`workers.${idx}.position`)}
                          placeholder="철골공" className="input-base text-sm py-1.5" />
                      </td>
                      <td className="px-3 py-2">
                        <select {...form.register(`workers.${idx}.role`)}
                          className="input-base text-sm py-1.5">
                          {WORKER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input {...form.register(`workers.${idx}.license`)}
                          placeholder="타워크레인 운전기능사 등" className="input-base text-sm py-1.5" />
                      </td>
                      <td className="px-2 py-2">
                        {workerFields.length > 1 && (
                          <button onClick={() => removeWorker(idx)}
                            className="p-1 text-gray-200 hover:text-red-400 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: 최종 확인 ───────────────────────────────── */}
      {step === 4 && (
        <div className="animate-fade-in space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">작업계획서 최종 확인</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['제목',     form.watch('title')],
                ['별표4 대상작업', ANNEX4_WORK_LABELS[form.watch('annex4_work_key')]],
                ['계획서 회차', `${form.watch('plan_round')}차`],
                ['작업 종류', WORK_PLAN_TYPE_LABELS[form.watch('plan_type')]],
                ['작업 장소', form.watch('work_location')],
                ['작업 기간', `${form.watch('work_start_date')} ~ ${form.watch('work_end_date')}`],
                ['작업 책임자', `${form.watch('supervisor_name')} (${form.watch('supervisor_position')})`],
                ['위험요인 항목', `${riskItems.length}건 (高${highCount}건)`],
                ['투입 인원', `${workerFields.filter((_, i) => form.watch(`workers.${i}.name`)).length}명`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400">{label}</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{value || '—'}</dd>
                </div>
              ))}
            </dl>
            {sourceRisk && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-green-700">
                <Link2 className="w-3.5 h-3.5" />
                위험성평가 <strong>"{sourceRisk.title}"</strong>와 연계됩니다.
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => onSave('draft')} disabled={saving} className="btn-secondary flex-1 justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              임시 저장
            </button>
            <button onClick={() => onSave('approved')} disabled={saving} className="btn-primary flex-1 justify-center"
              style={{ background: '#16a34a' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              승인 완료 저장
            </button>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
        <button onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0}
          className="btn-secondary disabled:opacity-40">
          <ChevronLeft className="w-4 h-4" /> 이전
        </button>
        <span className="text-xs text-gray-400">{step + 1} / {STEPS.length}</span>
        {step < STEPS.length - 1 && (
          <button onClick={() => setStep(s => Math.min(s + 1, STEPS.length - 1))} className="btn-primary"
            style={{ background: '#16a34a' }}>
            다음 <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
