'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Save, ChevronRight, ChevronLeft, Plus, Trash2,
  Loader2, AlertTriangle, Link2, FileSpreadsheet,
  Upload, X, Sparkles,
} from 'lucide-react'
import { clsx } from 'clsx'
import { riskAssessmentSchema, type RiskAssessmentFormData } from '@/lib/validators/schemas'

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const STEPS = ['기본정보', '위험요인 및 감소대책', '검토 및 저장']

const HAZARD_TYPES = [
  { value: 'falling',                label: '떨어짐' },
  { value: 'tripping',               label: '넘어짐' },
  { value: 'crushed_overturned',     label: '깔림/뒤집힘' },
  { value: 'struck_against',         label: '부딪힘' },
  { value: 'struck_by_object',       label: '물체에 맞음' },
  { value: 'collapse',               label: '무너짐' },
  { value: 'caught_in',              label: '끼임' },
  { value: 'cut_stab',               label: '절단/베임/찔림' },
  { value: 'fire_explosion_rupture', label: '화재/폭발/파열' },
  { value: 'overexertion',           label: '무리한동작' },
  { value: 'occupational_disease',   label: '업무상질병' },
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

type HazardValue = typeof HAZARD_TYPES[number]['value']

type AiSuggestion = {
  work_content: string
  hazard_factor: string
  hazard_type: HazardValue
  current_probability: number
  current_severity: number
  engineering_measure: string
  admin_measure: string
  ppe_measure: string
  selected: boolean
}

function buildImageAnalysisPrompt(): string {
  return `당신은 대한민국 건설현장 위험성평가 전문가입니다.
업로드된 사진을 기준으로 「사업장 위험성평가에 관한 지침」에 맞게 위험요인 및 감소대책 초안을 작성하세요.

반드시 JSON 배열만 출력하세요.
[
  {
    "work_content": "작업 내용",
    "hazard_factor": "유해·위험요인",
    "hazard_type": "falling|tripping|crushed_overturned|struck_against|struck_by_object|collapse|caught_in|cut_stab|fire_explosion_rupture|overexertion|occupational_disease|other",
    "current_probability": 1~5 숫자,
    "current_severity": 1~5 숫자,
    "engineering_measure": "공학적 대책",
    "admin_measure": "관리적 대책",
    "ppe_measure": "보호구 대책"
  }
]

규칙:
- 사진에서 직접 확인 가능한 내용 중심으로 작성
- 위험요인과 감소대책은 구체적으로 작성
- 최소 1개, 최대 10개 항목`
}

// ─── 기본 항목 ─────────────────────────────────────────────────────────────────

const DEFAULT_ITEM = {
  seq: 1,
  work_content: '',
  hazard_factor: '',
  hazard_type: 'falling' as const,
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
  const searchParams = useSearchParams()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [step, setStep]         = useState(0)
  const [saving, setSaving]     = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadedPhotos, setUploadedPhotos] = useState<{ file: File; preview: string }[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([])
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

  // 상시/수시 등 특정 평가유형으로 진입할 때 기본값 반영
  useEffect(() => {
    const evalType = searchParams.get('eval_type')
    if (evalType && ['initial', 'periodic', 'special', 'always_on'].includes(evalType)) {
      form.setValue('eval_type', evalType as any)
    }
  }, [searchParams, form])

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

  function handleFiles(files: FileList | null) {
    if (!files) return
    const next = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .slice(0, 10)
      .map(file => ({ file, preview: URL.createObjectURL(file) }))
    setUploadedPhotos(prev => [...prev, ...next].slice(0, 10))
  }

  function removePhoto(idx: number) {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  function toggleSuggestion(idx: number, checked: boolean) {
    setAiSuggestions(prev => prev.map((item, i) => i === idx ? { ...item, selected: checked } : item))
  }

  function toggleAllSuggestions(checked: boolean) {
    setAiSuggestions(prev => prev.map(item => ({ ...item, selected: checked })))
  }

  function applySelectedSuggestions() {
    const selected = aiSuggestions.filter(item => item.selected)
    if (selected.length === 0) {
      toast.error('반영할 분석 항목을 선택하세요.')
      return
    }

    const start = form.getValues('items').length
    append(selected.map((item, idx) => ({
      ...DEFAULT_ITEM,
      seq: start + idx + 1,
      work_content: item.work_content,
      hazard_factor: item.hazard_factor,
      hazard_type: item.hazard_type,
      current_probability: item.current_probability,
      current_severity: item.current_severity,
      engineering_measure: item.engineering_measure,
      admin_measure: item.admin_measure,
      ppe_measure: item.ppe_measure,
    })))
    setAiSuggestions(prev => prev.filter(item => !item.selected))
    toast.success(`선택한 ${selected.length}개 항목을 반영했습니다.`)
  }

  async function analyzePhotos() {
    if (uploadedPhotos.length === 0) {
      toast.error('분석할 사진을 먼저 업로드하세요.')
      return
    }

    setAnalyzing(true)
    toast.info(`${uploadedPhotos.length}장 분석 중...`)

    try {
      const imageContents = await Promise.all(
        uploadedPhotos.map(async photo => new Promise<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]
            resolve({
              type: 'image',
              source: {
                type: 'base64',
                media_type: photo.file.type as 'image/jpeg' | 'image/png' | 'image/webp',
                data: base64,
              },
            })
          }
          reader.onerror = reject
          reader.readAsDataURL(photo.file)
        }))
      )

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: [
                ...imageContents,
                { type: 'text', text: buildImageAnalysisPrompt() },
              ],
            },
          ],
        }),
      })

      const data = await response.json()
      const raw = data.content?.[0]?.text ?? ''
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.')

      const allowed = new Set(HAZARD_TYPES.map(type => type.value))
      const parsed = JSON.parse(jsonMatch[0]) as any[]
      const nextSuggestions: AiSuggestion[] = parsed.map(item => ({
        work_content: item.work_content ?? '',
        hazard_factor: item.hazard_factor ?? '',
        hazard_type: allowed.has(item.hazard_type) ? item.hazard_type : 'other',
        current_probability: Math.min(5, Math.max(1, Number(item.current_probability) || 3)),
        current_severity: Math.min(5, Math.max(1, Number(item.current_severity) || 3)),
        engineering_measure: item.engineering_measure ?? '',
        admin_measure: item.admin_measure ?? '',
        ppe_measure: item.ppe_measure ?? '',
        selected: true,
      }))

      setAiSuggestions(nextSuggestions)
      toast.success(`분석 완료: ${nextSuggestions.length}개 항목 도출`)
    } catch (error: any) {
      toast.error(`AI 분석 실패: ${error.message ?? '알 수 없는 오류'}`)
    } finally {
      setAnalyzing(false)
    }
  }

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

            {/* 이미지 분석 + 선택 반영 */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    이미지 분석 (선택)
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    사진 분석 결과를 확인한 뒤 필요한 항목만 선택 반영할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={analyzePhotos}
                  disabled={analyzing || uploadedPhotos.length === 0}
                  className="btn-primary text-sm"
                  style={{ background: analyzing ? '#9ca3af' : 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
                >
                  {analyzing
                    ? <><Loader2 className="w-4 h-4 animate-spin" />분석 중...</>
                    : <><Sparkles className="w-4 h-4" />AI 분석 실행</>}
                </button>
              </div>

              <label
                className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition-all"
                onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
              >
                <Upload className="w-6 h-6 text-gray-400" />
                <div className="text-sm text-gray-600">사진을 드래그하거나 클릭해서 업로드</div>
                <div className="text-xs text-gray-400">JPG, PNG, WEBP · 최대 10장</div>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFiles(e.target.files)}
                />
              </label>

              {uploadedPhotos.length > 0 && (
                <div className="mt-3 grid grid-cols-6 gap-2">
                  {uploadedPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                      <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {aiSuggestions.length > 0 && (
                <div className="mt-4 border border-violet-200 bg-violet-50/50 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-violet-100 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-violet-800">AI 분석 결과</div>
                      <div className="text-[11px] text-violet-600">필요한 항목만 선택해서 위험요인 목록에 반영하세요.</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => toggleAllSuggestions(true)} className="btn-secondary text-xs">전체 선택</button>
                      <button type="button" onClick={() => toggleAllSuggestions(false)} className="btn-secondary text-xs">전체 해제</button>
                      <button type="button" onClick={applySelectedSuggestions} className="btn-primary text-xs" style={{ background: '#7c3aed' }}>
                        선택 항목 반영
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-violet-100">
                    {aiSuggestions.map((item, idx) => {
                      const score = calcScore(item.current_probability, item.current_severity)
                      const level = calcLevel(score)
                      const style = LEVEL_STYLES[level]
                      const hazardLabel = HAZARD_TYPES.find(h => h.value === item.hazard_type)?.label ?? '기타'
                      return (
                        <label key={`ai-suggestion-${idx}`} className="block px-4 py-3 cursor-pointer hover:bg-violet-100/40">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={e => toggleSuggestion(idx, e.target.checked)}
                              className="w-4 h-4 mt-0.5 accent-violet-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-violet-200 text-violet-700">{hazardLabel}</span>
                                <span className={style.cls}>{style.label}</span>
                                <span className="text-[11px] text-gray-500">{item.current_probability} × {item.current_severity} = {score}점</span>
                              </div>
                              <div className="text-xs text-gray-800"><strong>위험요인:</strong> {item.hazard_factor || '—'}</div>
                              <div className="text-xs text-gray-600 mt-1"><strong>안전대책:</strong> {[item.engineering_measure, item.admin_measure, item.ppe_measure].filter(Boolean).join(' / ') || '—'}</div>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
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
