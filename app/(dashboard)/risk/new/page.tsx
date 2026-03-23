'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Save, ChevronRight, ChevronLeft, Plus, Trash2,
  Loader2, AlertTriangle, Link2, FileSpreadsheet,
} from 'lucide-react'
import { clsx } from 'clsx'
import { riskAssessmentSchema, type RiskAssessmentFormData } from '@/lib/validators/schemas'

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const STEPS = ['기본정보', '위험요인 및 감소대책', '검토 및 저장']

const HAZARD_TYPES = [
  { value: 'fall',         label: '추락·전도' },
  { value: 'entanglement', label: '끼임' },
  { value: 'collision',    label: '충돌·협착' },
  { value: 'fire',         label: '화재·폭발' },
  { value: 'hazmat',       label: '유해물질' },
  { value: 'electrical',   label: '감전' },
  { value: 'ergonomic',    label: '근골격계' },
  { value: 'other',        label: '기타' },
] as const

const EVAL_TYPES = [
  { value: 'initial',   label: '최초평가 — 사업 개시·신규 공정 도입 시' },
  { value: 'periodic',  label: '정기평가 — 매년 정기적 실시' },
  { value: 'special',   label: '수시평가 — 중대재해 발생·변경 시' },
  { value: 'always_on', label: '상시평가 — 일상적 안전활동' },
] as const

function calcScore(p: number, s: number) { return p * s }
function calcLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 15) return 'high'
  if (score >= 8)  return 'medium'
  return 'low'
}
const LEVEL_STYLES = {
  high:   { label: '高', cls: 'badge-high' },
  medium: { label: '中', cls: 'badge-medium' },
  low:    { label: '低', cls: 'badge-low' },
}

// ─── 기본 항목 ─────────────────────────────────────────────────────────────────

const DEFAULT_ITEM = {
  seq: 1,
  work_content: '',
  hazard_factor: '',
  hazard_type: 'fall' as const,
  current_probability: 3,
  current_severity: 3,
  engineering_measure: '',
  admin_measure: '',
  ppe_measure: '',
  measure_owner: '',
  measure_due_date: '',
  residual_probability: 1,
  residual_severity: 2,
  link_to_education: false,
  link_to_work_plan: false,
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

export default function NewRiskAssessmentPage() {
  const router = useRouter()
  const [step, setStep]         = useState(0)
  const [saving, setSaving]     = useState(false)
  const [projects, setProjects] = useState<{ id: string; site_name: string }[]>([])

  const form = useForm<RiskAssessmentFormData>({
    resolver: zodResolver(riskAssessmentSchema),
    defaultValues: {
      title: '',
      project_id: '',
      eval_type: 'periodic',
      eval_start_date: new Date().toISOString().slice(0, 10),
      eval_end_date: '',
      work_types: '',
      overview: '',
      items: [{ ...DEFAULT_ITEM, seq: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  // 현장 목록 로드
  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(j => setProjects(j.data ?? []))
  }, [])

  // 자동 저장 (임시)
  useEffect(() => {
    const timer = setInterval(() => {
      const values = form.getValues()
      if (values.title) {
        sessionStorage.setItem('risk_draft', JSON.stringify(values))
      }
    }, 30_000)
    return () => clearInterval(timer)
  }, [form])

  // ── 저장 ──────────────────────────────────────────────────────────────────────
  async function onSubmit(data: RiskAssessmentFormData) {
    setSaving(true)
    const res = await fetch('/api/risk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(json.error ?? '저장에 실패했습니다.')
      return
    }
    sessionStorage.removeItem('risk_draft')
    toast.success('위험성평가가 저장되었습니다.', {
      description: '연계 문서(교육일지, 작업계획서)를 생성할 수 있습니다.',
      action: { label: '목록으로', onClick: () => router.push('/risk') },
    })
    router.push(`/risk/${json.data.id}`)
  }

  // ── 단계 이동 ─────────────────────────────────────────────────────────────────
  async function nextStep() {
    const fieldsToValidate: (keyof RiskAssessmentFormData)[][] = [
      ['title', 'eval_type', 'eval_start_date', 'eval_end_date', 'work_types'],
      ['items'],
    ]
    const valid = await form.trigger(fieldsToValidate[step] as any)
    if (valid) setStep(s => Math.min(s + 1, STEPS.length - 1))
  }
  function prevStep() { setStep(s => Math.max(s - 1, 0)) }

  const items      = form.watch('items')
  const highCount  = items.filter(i => calcLevel(calcScore(i.current_probability, i.current_severity)) === 'high').length
  const midCount   = items.filter(i => calcLevel(calcScore(i.current_probability, i.current_severity)) === 'medium').length
  const lowCount   = items.length - highCount - midCount
  const eduCount   = items.filter(i => i.link_to_education).length
  const planCount  = items.filter(i => i.link_to_work_plan).length

  return (
    <div className="max-w-5xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            새 위험성평가 작성
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">작성 중인 내용은 30초마다 자동 임시저장됩니다.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary">취소</button>
          {step === STEPS.length - 1 && (
            <button
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />저장 중...</> : <><Save className="w-4 h-4" />저장 완료</>}
            </button>
          )}
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1">
        {STEPS.map((label, i) => (
          <button
            key={i}
            type="button"
            onClick={() => i < step && setStep(i)}
            className={clsx(
              'flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              i === step ? 'bg-blue-600 text-white shadow-sm'
              : i < step ? 'text-green-600 hover:bg-green-50 cursor-pointer'
              : 'text-gray-400 cursor-default'
            )}
          >
            <span className={clsx(
              'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
              i === step ? 'bg-white/20 text-white'
              : i < step ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-400'
            )}>
              {i < step ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline truncate">{label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>

        {/* ── STEP 0: 기본정보 ─────────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="card p-6 space-y-5 animate-fade-in">
            <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-3">평가 기본정보</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label-base">평가 제목 *</label>
                <input
                  {...form.register('title')}
                  placeholder="예: 2025년 3월 정기 위험성평가"
                  className={`input-base ${form.formState.errors.title ? 'border-red-400' : ''}`}
                />
                {form.formState.errors.title && (
                  <p className="mt-1 text-xs text-red-500">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="label-base">현장 선택</label>
                <select {...form.register('project_id')} className="input-base">
                  <option value="">현장 선택 (선택사항)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.site_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-base">평가 유형 *</label>
                <select {...form.register('eval_type')} className="input-base">
                  {EVAL_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-base">평가 시작일 *</label>
                <input
                  {...form.register('eval_start_date')}
                  type="date"
                  className={`input-base ${form.formState.errors.eval_start_date ? 'border-red-400' : ''}`}
                />
              </div>

              <div>
                <label className="label-base">평가 종료일 *</label>
                <input
                  {...form.register('eval_end_date')}
                  type="date"
                  className={`input-base ${form.formState.errors.eval_end_date ? 'border-red-400' : ''}`}
                />
                {form.formState.errors.eval_end_date && (
                  <p className="mt-1 text-xs text-red-500">{form.formState.errors.eval_end_date.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="label-base">관련 공종 * <span className="text-gray-400 font-normal">(쉼표로 구분)</span></label>
                <input
                  {...form.register('work_types')}
                  placeholder="예: 철골공사, 고소작업, 용접·절단, 굴착공사"
                  className={`input-base ${form.formState.errors.work_types ? 'border-red-400' : ''}`}
                />
                {form.formState.errors.work_types && (
                  <p className="mt-1 text-xs text-red-500">{form.formState.errors.work_types.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="label-base">평가 개요 <span className="text-gray-400 font-normal">(선택)</span></label>
                <textarea
                  {...form.register('overview')}
                  rows={3}
                  placeholder="이번 평가의 범위 및 목적을 간략히 입력하세요"
                  className="input-base resize-none"
                />
              </div>
            </div>

            {/* 위험도 기준 안내 */}
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-2">📋 위험도 산정 기준 (가능성 × 중대성)</p>
              <div className="grid grid-cols-3 gap-3 text-xs text-blue-700">
                <div><span className="badge-high mr-1">高</span> 15점 이상 — 즉시 개선</div>
                <div><span className="badge-medium mr-1">中</span> 8~14점 — 단기 개선</div>
                <div><span className="badge-low mr-1">低</span> 7점 이하 — 허용 수준</div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: 위험요인 및 감소대책 ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="animate-fade-in space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              위험요인 입력과 감소대책 작성을 한 화면에서 함께 진행합니다.
            </div>
            {/* 요약 카드 */}
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: '전체', value: items.length, cls: 'bg-gray-50 text-gray-700' },
                { label: '高위험', value: highCount, cls: 'bg-red-50 text-red-700' },
                { label: '中위험', value: midCount,  cls: 'bg-amber-50 text-amber-700' },
                { label: '低위험', value: lowCount,  cls: 'bg-green-50 text-green-700' },
                { label: '교육연계', value: eduCount,  cls: 'bg-blue-50 text-blue-700' },
              ].map(s => (
                <div key={s.label} className={`card px-4 py-3 text-center ${s.cls}`}>
                  <div className="text-xs opacity-70 mb-1">{s.label}</div>
                  <div className="text-xl font-bold">{s.value}</div>
                </div>
              ))}
            </div>

            {/* 항목 목록 */}
            <div className="space-y-3">
              {fields.map((field, idx) => {
                const prob  = form.watch(`items.${idx}.current_probability`) ?? 1
                const sev   = form.watch(`items.${idx}.current_severity`)    ?? 1
                const score = calcScore(Number(prob), Number(sev))
                const level = calcLevel(score)
                const lStyle = LEVEL_STYLES[level]

                return (
                  <div key={field.id} className="card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className={lStyle.cls}>{lStyle.label}</span>
                      <span className="text-sm font-semibold text-gray-700">점수: {score}점</span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="ml-auto p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-6 gap-3">
                      <div className="col-span-2">
                        <label className="label-base">작업 내용 *</label>
                        <textarea
                          {...form.register(`items.${idx}.work_content`)}
                          rows={2}
                          placeholder="예: 고소 철골 조립 작업"
                          className="input-base resize-none text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="label-base">유해·위험요인 *</label>
                        <textarea
                          {...form.register(`items.${idx}.hazard_factor`)}
                          rows={2}
                          placeholder="예: 작업 중 추락, 공구 낙하"
                          className="input-base resize-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="label-base">위험 유형</label>
                        <select {...form.register(`items.${idx}.hazard_type`)} className="input-base text-sm">
                          {HAZARD_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="label-base">가능성 (1~5)</label>
                          <select {...form.register(`items.${idx}.current_probability`, { valueAsNumber: true })} className="input-base text-sm">
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label-base">중대성 (1~5)</label>
                          <select {...form.register(`items.${idx}.current_severity`, { valueAsNumber: true })} className="input-base text-sm">
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 연계 체크박스 */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                      <Link2 className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
                        <input
                          type="checkbox"
                          {...form.register(`items.${idx}.link_to_education`)}
                          className="w-3.5 h-3.5 rounded accent-blue-600"
                        />
                        교육일지 자동 연계
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
                        <input
                          type="checkbox"
                          {...form.register(`items.${idx}.link_to_work_plan`)}
                          className="w-3.5 h-3.5 rounded accent-blue-600"
                        />
                        작업계획서 자동 연계
                      </label>
                    </div>

                    {/* 감소대책 통합 입력 */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-700">위험성 감소대책</p>
                        {level !== 'low' ? (
                          <span className="text-[11px] text-amber-600">高/中 위험은 작성 권장</span>
                        ) : (
                          <span className="text-[11px] text-gray-400">低 위험은 선택 작성</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="label-base">공학적 대책</label>
                          <textarea
                            {...form.register(`items.${idx}.engineering_measure`)}
                            rows={3}
                            placeholder="예: 안전난간 설치, 안전방망 설치"
                            className="input-base resize-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="label-base">관리적 대책</label>
                          <textarea
                            {...form.register(`items.${idx}.admin_measure`)}
                            rows={3}
                            placeholder="예: 안전대 착용 의무화, TBM 실시"
                            className="input-base resize-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="label-base">개인 보호구</label>
                          <textarea
                            {...form.register(`items.${idx}.ppe_measure`)}
                            rows={3}
                            placeholder="예: 안전대(Y형), 안전모, 안전화"
                            className="input-base resize-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="label-base">담당자</label>
                          <input
                            {...form.register(`items.${idx}.measure_owner`)}
                            placeholder="홍길동"
                            className="input-base text-sm"
                          />
                        </div>
                        <div>
                          <label className="label-base">완료 기한</label>
                          <input
                            {...form.register(`items.${idx}.measure_due_date`)}
                            type="date"
                            className="input-base text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label-base">개선 후 가능성</label>
                            <select
                              {...form.register(`items.${idx}.residual_probability`, { valueAsNumber: true })}
                              className="input-base text-sm"
                            >
                              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="label-base">개선 후 중대성</label>
                            <select
                              {...form.register(`items.${idx}.residual_severity`, { valueAsNumber: true })}
                              className="input-base text-sm"
                            >
                              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 항목 추가 */}
            <button
              type="button"
              onClick={() => append({ ...DEFAULT_ITEM, seq: fields.length + 1 })}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> 위험요인 항목 추가
            </button>
          </div>
        )}

        {/* ── STEP 2: 검토 및 저장 ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="animate-fade-in space-y-4">
            {/* 최종 요약 */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">평가 요약 확인</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ['평가 제목', form.watch('title')],
                  ['평가 유형', EVAL_TYPES.find(t => t.value === form.watch('eval_type'))?.label.split(' —')[0] ?? ''],
                  ['평가 기간', `${form.watch('eval_start_date')} ~ ${form.watch('eval_end_date')}`],
                  ['관련 공종', form.watch('work_types')],
                  ['위험요인 항목', `전체 ${items.length}건 (高${highCount} / 中${midCount} / 低${lowCount})`],
                  ['자동 연계', `교육일지 ${eduCount}건 · 작업계획서 ${planCount}건`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-gray-400">{label}</dt>
                    <dd className="font-medium text-gray-900 mt-0.5">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* 연계 예정 문서 */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-500" />
                저장 후 자동 연계될 문서
              </h3>
              <div className="space-y-2 text-sm">
                {eduCount > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <span className="text-blue-500">📚</span>
                    <span className="text-blue-700 font-medium">안전보건교육일지</span>
                    <span className="text-blue-500 text-xs ml-auto">{eduCount}개 항목 자동 반영</span>
                  </div>
                )}
                {planCount > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <span className="text-green-500">📋</span>
                    <span className="text-green-700 font-medium">작업계획서</span>
                    <span className="text-green-500 text-xs ml-auto">{planCount}개 항목 감소대책 반영</span>
                  </div>
                )}
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                  <span className="text-amber-500">✅</span>
                  <span className="text-amber-700 font-medium">활동계획표</span>
                  <span className="text-amber-500 text-xs ml-auto">위험성평가 항목 자동 체크</span>
                </div>
              </div>
            </div>

            {/* 엑셀 출력 안내 */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">
              <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />
              저장 완료 후 목록 화면에서 <strong className="text-gray-700">엑셀 출력</strong> 버튼을 눌러 A4 인쇄용 파일을 다운로드할 수 있습니다.
            </div>
          </div>
        )}

        {/* ── 하단 네비게이션 ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 0}
            className="btn-secondary disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> 이전
          </button>

          <span className="text-xs text-gray-400">{step + 1} / {STEPS.length}</span>

          {step < STEPS.length - 1 ? (
            <button type="button" onClick={nextStep} className="btn-primary">
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />저장 중...</> : <><Save className="w-4 h-4" />저장 완료</>}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
