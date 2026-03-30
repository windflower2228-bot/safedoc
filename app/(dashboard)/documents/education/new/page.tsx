'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2, AlertTriangle, BookOpen, Plus, Trash2,
  ChevronRight, ChevronLeft, Save, Link2, Users,
  Sparkles, RefreshCw, Info, Check,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  EDU_TYPE_LABELS, EDU_LEGAL_HOURS,
  WORKER_TYPE_LABELS, EDU_HOURS_RULES,
  getDefaultHours, getMinHours, getHoursNote, isHoursValid,
  type EduType, type WorkerType, type EduItem, type Attendee,
} from '@/types/education'

// ─── 교육 유형 선택지 ─────────────────────────────────────────
const EDU_TYPES    = Object.entries(EDU_TYPE_LABELS)    as [string, string][]
const WORKER_TYPES = Object.entries(WORKER_TYPE_LABELS) as [WorkerType, string][]

// ─── 위험도 배지 스타일 ───────────────────────────────────────
const LEVEL_STYLE: Record<string, { label: string; cls: string }> = {
  high:   { label: '高', cls: 'badge-high' },
  medium: { label: '中', cls: 'badge-medium' },
  low:    { label: '低', cls: 'badge-low' },
}

// ─── 단계 ──────────────────────────────────────────────────────
const STEPS = ['교육 기본정보', '교육 항목', '참석자', '최종 확인']

const LEGAL_CONTENT_BASIS = '산업안전보건법 시행규칙 제26조제1항 (교육시간: [별표 4], 교육내용: [별표 5])'

type MenuPreset = {
  title: string
  eduType: EduType
  workerType: WorkerType
  content: string
  items: Array<{ work_content: string; hazard_factor: string; edu_point: string }>
}

const MENU_PRESETS: Record<string, MenuPreset> = {
  'regular-worker': {
    title: '근로자 정기안전보건교육',
    eduType: 'regular',
    workerType: 'regular_field',
    content: `[법정 교육내용 자동입력 - ${LEGAL_CONTENT_BASIS}]
1. 산업안전 및 사고 예방에 관한 사항
2. 산업보건 및 직업병 예방에 관한 사항
3. 건강증진 및 질병 예방에 관한 사항
4. 유해·위험 작업환경 관리에 관한 사항
5. 산업안전보건법령 및 일반관리사항
6. 직무스트레스 예방 및 관리에 관한 사항
7. 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항`,
    items: [
      {
        work_content: '정기안전보건교육 필수 이론',
        hazard_factor: '상시 작업 중 발생 가능한 일반 위험요인',
        edu_point: '산업안전·보건 기본원칙, 사고예방, 작업 전 점검 절차',
      },
      {
        work_content: '정신건강 및 조직문화 예방교육',
        hazard_factor: '직무스트레스, 괴롭힘, 고객응대 스트레스',
        edu_point: '직무스트레스 관리, 괴롭힘·폭언 대응 및 건강장해 예방',
      },
    ],
  },
  'supervisor-regular': {
    title: '관리감독자 정기안전보건교육',
    eduType: 'regular',
    workerType: 'supervisor',
    content: `[법정 교육내용 자동입력 - ${LEGAL_CONTENT_BASIS}]
1. 관리감독자의 역할과 임무에 관한 사항
2. 산업안전 및 사고 예방에 관한 사항
3. 산업보건 및 직업병 예방에 관한 사항
4. 유해·위험 작업환경 관리에 관한 사항
5. 산업안전보건법령 및 일반관리사항
6. 직무스트레스 예방 및 관리에 관한 사항
7. 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항`,
    items: [
      {
        work_content: '관리감독자 법정 직무 및 책임',
        hazard_factor: '현장 지휘·감독 미흡으로 인한 중대재해 위험',
        edu_point: '관리감독자 역할, 위험성평가 반영, 작업지휘·감독 기준',
      },
      {
        work_content: '작업환경 및 근로자 건강관리',
        hazard_factor: '유해환경 노출, 스트레스·괴롭힘 등 건강장해 위험',
        edu_point: '유해환경 통제, 건강장해 예방, 조직문화 개선 관리요령',
      },
    ],
  },
  'special-worker': {
    title: '근로자 특별안전보건교육',
    eduType: 'special',
    workerType: 'regular_field',
    content: `[법정 교육내용 자동입력 - ${LEGAL_CONTENT_BASIS}]
1. 특별교육 대상작업의 작업방법·작업절차에 관한 사항
2. 특별교육 대상작업의 위험요인 및 안전·보건조치에 관한 사항
3. 기계·기구·설비의 점검 및 이상 발견 시 조치에 관한 사항
4. 개인보호구의 지급·착용 및 관리에 관한 사항
5. 비상 시 대응 및 응급조치에 관한 사항
6. 작업 전·중·후 안전점검과 사고사례 예방에 관한 사항`,
    items: [
      {
        work_content: '특별교육 대상작업 사전 안전교육',
        hazard_factor: '유해·위험 작업 투입 전 미숙련으로 인한 재해 위험',
        edu_point: '작업절차, 위험요인 파악, 방호장치·작업허가 절차',
      },
      {
        work_content: 'PPE·비상대응 집중교육',
        hazard_factor: '고위험 작업 중 보호구 미착용 및 비상대응 미흡',
        edu_point: '개인보호구 착용, 비상정지·대피·응급조치 훈련',
      },
    ],
  },
  'supervisor-special': {
    title: '관리감독자 특별안전보건교육',
    eduType: 'special',
    workerType: 'supervisor',
    content: `[법정 교육내용 자동입력 - ${LEGAL_CONTENT_BASIS}]
1. 특별교육 대상작업의 관리감독 방법에 관한 사항
2. 작업 공정별 유해·위험요인 통제에 관한 사항
3. 안전작업허가 및 작업 전 점검·확인에 관한 사항
4. 개인보호구 및 방호장치 운영 관리에 관한 사항
5. 비상상황 대응체계 및 응급조치 지휘에 관한 사항
6. 특별교육 대상작업 사고사례 및 재발방지 대책`,
    items: [
      {
        work_content: '특별작업 관리감독 기준 교육',
        hazard_factor: '고위험 작업 지휘·감독 부재로 인한 사고 위험',
        edu_point: '작업허가, 위험요인 통제, 작업중지권·재개 기준',
      },
      {
        work_content: '비상대응 및 재발방지 체계 교육',
        hazard_factor: '사고 발생 시 초기대응·지휘 혼선 위험',
        edu_point: '비상연락체계, 응급조치 지휘, 사고조사·재발방지',
      },
    ],
  },
  'new-hire': {
    title: '신규 채용 시 교육',
    eduType: 'onboarding',
    workerType: 'regular_field',
    content: `[법정 교육내용 자동입력 - ${LEGAL_CONTENT_BASIS}]
1. 산업안전 및 산업재해 예방에 관한 사항(화재·폭발 시 대피 포함)
2. 산업보건 및 건강장해 예방에 관한 사항
3. 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항
4. 직무스트레스 예방 및 관리에 관한 사항
5. 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항
6. 기계·기구의 위험성과 작업의 순서 및 동선에 관한 사항
7. 작업 개시 전 점검에 관한 사항
8. 정리정돈 및 청소에 관한 사항
9. 사고 발생 시 긴급조치에 관한 사항
10. 물질안전보건자료에 관한 사항`,
    items: [
      {
        work_content: '신규입사자 기본 안전보건교육',
        hazard_factor: '작업장 기본 위험 미인지에 따른 사고 위험',
        edu_point: '현장 기본수칙, 작업 전 점검, 정리정돈, 비상조치',
      },
      {
        work_content: '신규입사자 보건·MSDS 교육',
        hazard_factor: '유해물질 노출 및 정신건강 저해 요인',
        edu_point: '건강장해 예방, 직무스트레스 관리, MSDS 확인방법',
      },
    ],
  },
  'job-change': {
    title: '작업내용 변경 시 교육',
    eduType: 'job_specific',
    workerType: 'regular_field',
    content: `[법정 교육내용 자동입력 - ${LEGAL_CONTENT_BASIS}]
1. 변경된 작업의 기계·기구 및 설비의 위험성과 작업 순서에 관한 사항
2. 변경된 작업의 작업 개시 전 점검에 관한 사항
3. 변경된 작업의 정리정돈 및 청소에 관한 사항
4. 변경된 작업의 사고 발생 시 긴급조치에 관한 사항
5. 변경된 작업의 물질안전보건자료에 관한 사항`,
    items: [
      {
        work_content: '변경작업 절차 및 위험요인 교육',
        hazard_factor: '작업 변경으로 인한 신규 위험요인 발생',
        edu_point: '변경 공정의 작업절차, 위험요인, 사전점검 항목',
      },
      {
        work_content: '변경작업 비상대응 교육',
        hazard_factor: '변경 공정 중 사고·누출·충돌 등 비상상황',
        edu_point: '긴급조치, 대피절차, MSDS 재확인 및 보호구 점검',
      },
    ],
  },
  'special-employment': {
    title: '특수형태종사자 교육',
    eduType: 'onboarding',
    workerType: 'atypical',
    content: `[법정 교육내용 자동입력 - ${LEGAL_CONTENT_BASIS}]
1. 산업안전 및 산업재해 예방에 관한 사항
2. 산업보건 및 건강장해 예방에 관한 사항
3. 산업안전보건법령 및 일반관리사항
4. 직무스트레스 예방 및 관리에 관한 사항
5. 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항
6. 작업 개시 전 점검 및 사고 발생 시 긴급조치에 관한 사항
7. 물질안전보건자료에 관한 사항`,
    items: [
      {
        work_content: '특수형태종사자 최초 안전보건교육',
        hazard_factor: '노무제공 초기 위험 미인지 및 보호구 미흡',
        edu_point: '업무별 안전수칙, 작업 전 점검, 비상조치 기본',
      },
      {
        work_content: '고객응대·건강보호 교육',
        hazard_factor: '고객 폭언, 스트레스, 건강장해 발생 위험',
        edu_point: '고객응대 보호절차, 스트레스 관리, 건강장해 예방',
      },
    ],
  },
}

function buildPresetItems(items: MenuPreset['items']): EduItem[] {
  return items.map((item, idx) => ({
    seq: idx + 1,
    source_risk_item_id: null,
    work_content: item.work_content,
    hazard_factor: item.hazard_factor,
    hazard_type: 'other',
    risk_level: 'medium',
    edu_point: item.edu_point,
    legal_basis: LEGAL_CONTENT_BASIS,
    countermeasure: '',
  }))
}

interface FormData {
  title:               string
  edu_type:            string
  worker_type:         WorkerType
  edu_date:            string
  edu_start_time:      string
  edu_end_time:        string
  edu_duration_hours:  number
  edu_location:        string
  instructor_name:     string
  instructor_position: string
  instructor_affil:    string
  edu_content:         string
  edu_items:           EduItem[]
  attendees:           Attendee[]
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────
export default function NewEducationPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const fromRiskId   = searchParams.get('from')   // 위험성평가 연계
  const menuType     = searchParams.get('edu_type')
  const seededMenuRef = useRef<string | null>(null)

  const [step, setStep]           = useState(0)
  const [saving, setSaving]       = useState(false)
  const [generating, setGen]      = useState(false)
  const [sourceRisk, setSource]   = useState<{ id: string; title: string } | null>(null)
  const [linkSummary, setSummary] = useState<any>(null)
  const [includeAll, setInclude]  = useState(false)

  const form = useForm<FormData>({
    defaultValues: {
      title: '', edu_type: 'special',
      worker_type: 'regular_field',
      edu_date: new Date().toISOString().slice(0, 10),
      edu_start_time: '09:00', edu_end_time: '11:00',
      edu_duration_hours: 2,
      edu_location: '', instructor_name: '',
      instructor_position: '', instructor_affil: '',
      edu_content: '',
      edu_items: [],
      attendees: Array.from({ length: 5 }, (_, i) => ({
        seq: i + 1, name: '', position: '', department: '', sign: null,
      })),
    },
  })

  const { fields: itemFields, replace: replaceItems, append: appendItem, remove: removeItem } =
    useFieldArray({ control: form.control, name: 'edu_items' })

  const { fields: attendeeFields, append: appendAttendee, remove: removeAttendee } =
    useFieldArray({ control: form.control, name: 'attendees' })

  // ── 위험성평가 자동 생성 ────────────────────────────────────
  const generate = useCallback(async (riskId: string, all = false) => {
    setGen(true)
    try {
      const res  = await fetch('/api/documents/education/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ risk_id: riskId, include_all: all }),
      })
      const json = await res.json()

      if (!res.ok) { toast.error(json.error); return }
      if (json.warning) {
        toast.warning(json.warning)
        return
      }

      const d = json.data
      form.reset({
        ...form.getValues(),
        title:               d.title,
        edu_type:            d.edu_type,
        worker_type:         d.worker_type ?? 'regular_field',
        edu_date:            d.edu_date,
        edu_duration_hours:  d.edu_duration_hours,
        edu_location:        d.edu_location,
        instructor_name:     d.instructor_name,
        edu_content:         d.edu_content,
        edu_items:           d.edu_items,
        attendees:           d.attendees,
      })

      setSource({ id: riskId, title: d.source_risk_title })
      setSummary(d.link_summary)

      toast.success('교육일지 초안이 자동 생성되었습니다!', {
        description: `위험요인 ${d.link_summary.linked_items}개 항목이 반영되었습니다.`,
      })
    } finally {
      setGen(false)
    }
  }, [form])

  // 위험성평가 연계 파라미터 처리
  useEffect(() => {
    if (fromRiskId) generate(fromRiskId, false)
  }, [fromRiskId, generate])

  // 안전보건교육 메뉴 진입 시 법정 교육내용 자동 입력
  useEffect(() => {
    if (fromRiskId || !menuType) return
    if (seededMenuRef.current === menuType) return

    const preset = MENU_PRESETS[menuType]
    if (!preset) return

    const current = form.getValues()
    form.reset({
      ...current,
      title: current.title?.trim() ? current.title : `${preset.title} 교육일지`,
      edu_type: preset.eduType,
      worker_type: preset.workerType,
      edu_duration_hours: getDefaultHours(preset.eduType, preset.workerType),
      edu_content: current.edu_content?.trim() ? current.edu_content : preset.content,
      edu_items: current.edu_items.length > 0 ? current.edu_items : buildPresetItems(preset.items),
    })

    seededMenuRef.current = menuType
  }, [fromRiskId, menuType, form])

  // ── 시간 → 교육시간 자동 계산 ──────────────────────────────
  function calcDuration(start: string, end: string) {
    if (!start || !end) return
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins > 0) form.setValue('edu_duration_hours', Math.round(mins / 60 * 10) / 10)
  }

  // ── 저장 ────────────────────────────────────────────────────
  async function onSave(status: 'draft' | 'completed') {
    const values = form.getValues()
    if (!values.title) { toast.error('교육명을 입력해주세요.'); setStep(0); return }
    if (!values.edu_items.length) { toast.error('교육 항목을 1개 이상 입력해주세요.'); setStep(1); return }

    setSaving(true)
    const res = await fetch('/api/documents/education', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        worker_type:        values.worker_type || null,
        source_risk_id:     sourceRisk?.id ?? undefined,
        edu_duration_hours: Number(values.edu_duration_hours),
        status,
      }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) { toast.error(json.error); return }
    toast.success(status === 'completed' ? '교육일지가 완료 처리되었습니다.' : '임시 저장되었습니다.')
    router.push(`/documents/education/${json.data.id}`)
  }

  const items = form.watch('edu_items')

  return (
    <div className="max-w-4xl mx-auto">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            안전보건교육일지 작성
          </h1>
          {sourceRisk && (
            <div className="flex items-center gap-1.5 mt-1">
              <Link2 className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-600">
                위험성평가 연계: <strong>{sourceRisk.title}</strong>
              </span>
              {linkSummary && (
                <span className="text-xs text-gray-400 ml-1">
                  ({linkSummary.linked_items}개 항목 자동 반영)
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
          {step === STEPS.length - 1 && (
            <button onClick={() => onSave('completed')} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              교육 완료 저장
            </button>
          )}
        </div>
      </div>

      {/* AI 자동생성 배너 (위험성평가 연계 없을 때) */}
      {!sourceRisk && !fromRiskId && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">위험성평가에서 자동 생성</p>
            <p className="text-xs text-blue-600 mt-0.5">위험성평가 ID를 입력하면 교육 항목을 자동으로 채워드립니다.</p>
            <div className="flex items-center gap-2 mt-2">
              <input
                id="risk-id-input"
                type="text"
                placeholder="위험성평가 UUID 붙여넣기..."
                className="input-base text-xs flex-1 max-w-xs py-1.5"
              />
              <button
                onClick={() => {
                  const val = (document.getElementById('risk-id-input') as HTMLInputElement).value.trim()
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
          <label className="flex items-center gap-1.5 text-xs text-blue-600 cursor-pointer whitespace-nowrap mt-1">
            <input type="checkbox" checked={includeAll} onChange={e => setInclude(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-600" />
            전체 항목 포함
          </label>
        </div>
      )}

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1">
        {STEPS.map((label, i) => (
          <button key={i} type="button" onClick={() => i < step && setStep(i)}
            className={clsx(
              'flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              i === step ? 'bg-blue-600 text-white shadow-sm'
              : i < step ? 'text-green-600 hover:bg-green-50 cursor-pointer'
              : 'text-gray-400 cursor-default'
            )}>
            <span className={clsx(
              'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
              i === step ? 'bg-white/20 text-white'
              : i < step ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-400'
            )}>{i < step ? '✓' : i + 1}</span>
            <span className="hidden sm:inline truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* ── STEP 0: 기본정보 ──────────────────────────────────────── */}
      {step === 0 && (
        <div className="card p-6 space-y-5 animate-fade-in">
          <h2 className="font-semibold text-gray-800 pb-3 border-b border-gray-100">교육 기본정보</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label-base">교육명 *</label>
              <input {...form.register('title')} placeholder="예: 고소작업 위험성평가 특별교육 (3월)"
                className="input-base" />
            </div>

            {/* ── 교육 종류 + 근무형태 → 시간 자동 계산 ── */}
            <div>
              <label className="label-base">교육 종류 *</label>
              <select {...form.register('edu_type')}
                onChange={e => {
                  form.setValue('edu_type', e.target.value)
                  // 종류 변경 시 현재 근무형태 기준으로 시간 자동 갱신
                  const wt = form.getValues('worker_type') as WorkerType
                  const h  = getDefaultHours(e.target.value as EduType, wt)
                  form.setValue('edu_duration_hours', h)
                }}
                className="input-base">
                {EDU_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {/* ── 근무형태 선택 (핵심) ───────────────────────── */}
            <div>
              <label className="label-base flex items-center gap-1.5">
                근무형태 *
                <span className="text-[10px] text-blue-500 font-normal">(선택 시 법정 교육시간 자동 입력)</span>
              </label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {WORKER_TYPES.map(([val, lbl]) => {
                  const isSelected = form.watch('worker_type') === val
                  const eduType    = form.watch('edu_type') as EduType
                  const rule       = EDU_HOURS_RULES[eduType]?.[val]
                  return (
                    <button key={val} type="button"
                      onClick={() => {
                        form.setValue('worker_type', val)
                        // 해당 근무형태의 법정 기본시간으로 자동 세팅
                        const h = getDefaultHours(eduType, val)
                        form.setValue('edu_duration_hours', h)
                      }}
                      className={clsx(
                        'flex flex-col items-start px-3 py-2 rounded-xl border-2 text-left transition-all',
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                      )}>
                      <span className={clsx('text-xs font-semibold', isSelected ? 'text-blue-700' : 'text-gray-700')}>
                        {lbl.split(' — ')[0]}
                      </span>
                      {lbl.includes(' — ') && (
                        <span className={clsx('text-[10px]', isSelected ? 'text-blue-500' : 'text-gray-400')}>
                          {lbl.split(' — ')[1]}
                        </span>
                      )}
                      {rule && (
                        <span className={clsx(
                          'mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                          isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        )}>
                          {rule.min}h 이상
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {/* 법정 기준 설명 */}
              {(() => {
                const et = form.watch('edu_type') as EduType
                const wt = form.watch('worker_type') as WorkerType
                const note = getHoursNote(et, wt)
                return note && note !== '—' ? (
                  <p className="text-[11px] text-blue-600 mt-1.5 bg-blue-50 rounded-lg px-3 py-1.5 leading-relaxed">
                    📋 {note}
                  </p>
                ) : null
              })()}
            </div>

            <div>
              <label className="label-base">교육 일자 *</label>
              <input {...form.register('edu_date')} type="date" className="input-base" />
            </div>

            <div>
              <label className="label-base">교육 시작</label>
              <input {...form.register('edu_start_time')}
                type="time"
                onChange={e => {
                  form.setValue('edu_start_time', e.target.value)
                  calcDuration(e.target.value, form.getValues('edu_end_time'))
                }}
                className="input-base" />
            </div>

            <div>
              <label className="label-base">교육 종료</label>
              <input {...form.register('edu_end_time')}
                type="time"
                onChange={e => {
                  form.setValue('edu_end_time', e.target.value)
                  calcDuration(form.getValues('edu_start_time'), e.target.value)
                }}
                className="input-base" />
            </div>

            {/* ── 교육 시간 입력 (법정 최소 검증) ─────────────── */}
            <div>
              <label className="label-base flex items-center gap-1.5">
                교육 시간 *
                <span className="text-[10px] text-gray-400">(시작·종료 시간 입력 시 자동 계산)</span>
              </label>
              <div className="flex items-center gap-2">
                <input {...form.register('edu_duration_hours', { valueAsNumber: true })}
                  type="number" step="0.5" min="0.5"
                  className={clsx('input-base w-28 text-center text-lg font-bold', (() => {
                    const h  = form.watch('edu_duration_hours')
                    const et = form.watch('edu_type') as EduType
                    const wt = form.watch('worker_type') as WorkerType
                    return h > 0 && !isHoursValid(h, et, wt) ? 'border-red-400 bg-red-50' : ''
                  })())} />
                <span className="text-sm text-gray-600 font-medium">시간</span>
                {/* 빠른 입력 버튼 */}
                <div className="flex gap-1 ml-1">
                  {[1,2,4,8,16].map(h => (
                    <button key={h} type="button"
                      onClick={() => form.setValue('edu_duration_hours', h)}
                      className={clsx(
                        'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                        form.watch('edu_duration_hours') === h
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                      )}>
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
              {/* 법정 최소 미달 경고 */}
              {(() => {
                const h   = form.watch('edu_duration_hours')
                const et  = form.watch('edu_type') as EduType
                const wt  = form.watch('worker_type') as WorkerType
                const min = getMinHours(et, wt)
                if (h > 0 && h < min) {
                  return (
                    <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        법정 최소 교육시간 미달입니다. ({wt ? WORKER_TYPE_LABELS[wt] : ''}: <strong>{min}시간 이상</strong> 필요)
                        <br />법적 의무를 충족하려면 최소 {min}시간을 실시해야 합니다.
                      </span>
                    </div>
                  )
                }
                if (h >= min && h > 0) {
                  return (
                    <p className="mt-1 text-[11px] text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> 법정 최소시간({min}h) 충족
                    </p>
                  )
                }
                return null
              })()}
            </div>

            <div>
              <label className="label-base">교육 장소</label>
              <input {...form.register('edu_location')} placeholder="예: 4공구 현장 회의실" className="input-base" />
            </div>

            <div>
              <label className="label-base">강사명</label>
              <input {...form.register('instructor_name')} placeholder="홍길동" className="input-base" />
            </div>

            <div>
              <label className="label-base">강사 직위</label>
              <input {...form.register('instructor_position')} placeholder="안전관리자" className="input-base" />
            </div>

            <div>
              <label className="label-base">강사 소속</label>
              <input {...form.register('instructor_affil')} placeholder="(주)한국건설" className="input-base" />
            </div>

            <div className="col-span-2">
              <label className="label-base">교육 내용 요약</label>
              <textarea {...form.register('edu_content')} rows={4}
                placeholder="교육 목적 및 주요 내용을 입력하세요"
                className="input-base resize-none" />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 1: 교육 항목 ──────────────────────────────────────── */}
      {step === 1 && (
        <div className="animate-fade-in space-y-3">

          {/* 연계 요약 */}
          {linkSummary && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">위험성평가 자동 연계 완료</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  "{linkSummary.source_risk_title}"에서
                  高위험 {linkSummary.high_count}건·中위험 {linkSummary.medium_count}건·低위험 {linkSummary.low_count}건 반영됨.
                  아래 내용을 수정하거나 항목을 추가할 수 있습니다.
                </p>
                <button
                  onClick={() => {
                    if (sourceRisk) {
                      if (confirm('자동 생성을 다시 실행하면 현재 수정사항이 초기화됩니다. 계속하시겠습니까?')) {
                        generate(sourceRisk.id, includeAll)
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> 재생성
                </button>
              </div>
            </div>
          )}

          {/* 항목 없을 때 */}
          {itemFields.length === 0 && (
            <div className="card p-8 text-center border-dashed">
              <AlertTriangle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">교육 항목이 없습니다.</p>
              <p className="text-xs text-gray-300 mt-1">위험성평가에서 자동 생성하거나 직접 추가하세요.</p>
            </div>
          )}

          {/* 항목 카드 목록 */}
          {itemFields.map((field, idx) => {
            const item = form.watch(`edu_items.${idx}`)
            const lStyle = LEVEL_STYLE[item?.risk_level ?? 'low']
            return (
              <div key={field.id} className="card overflow-hidden">
                {/* 항목 헤더 */}
                <div className={clsx(
                  'flex items-center gap-3 px-4 py-2.5',
                  item?.risk_level === 'high'   ? 'bg-red-50'   :
                  item?.risk_level === 'medium'  ? 'bg-amber-50' : 'bg-gray-50'
                )}>
                  <span className="w-5 h-5 rounded-full bg-white text-xs font-bold text-gray-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {idx + 1}
                  </span>
                  <span className={lStyle.cls}>{lStyle.label}</span>
                  <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                    {item?.work_content || '(작업 내용 미입력)'}
                  </span>
                  {item?.source_risk_item_id && (
                    <span className="flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                      <Link2 className="w-3 h-3" /> 위험성평가 연계
                    </span>
                  )}
                  <button onClick={() => removeItem(idx)}
                    className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors ml-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 항목 내용 */}
                <div className="p-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-base">작업 내용 *</label>
                    <input {...form.register(`edu_items.${idx}.work_content`)}
                      className="input-base text-sm" />
                  </div>
                  <div>
                    <label className="label-base">유해·위험요인 *</label>
                    <input {...form.register(`edu_items.${idx}.hazard_factor`)}
                      className="input-base text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="label-base">교육 핵심 포인트</label>
                    <textarea {...form.register(`edu_items.${idx}.edu_point`)}
                      rows={3} className="input-base resize-none text-sm" />
                  </div>
                  <div>
                    <label className="label-base">관계 법령</label>
                    <input {...form.register(`edu_items.${idx}.legal_basis`)}
                      className="input-base text-xs" />
                  </div>
                  <div>
                    <label className="label-base">감소대책 요약</label>
                    <input {...form.register(`edu_items.${idx}.countermeasure`)}
                      className="input-base text-sm" />
                  </div>
                </div>
              </div>
            )
          })}

          {/* 항목 추가 */}
          <button
            onClick={() => appendItem({
              seq: itemFields.length + 1,
              source_risk_item_id: null,
              work_content: '', hazard_factor: '',
              hazard_type: 'other', risk_level: 'medium',
              edu_point: '', legal_basis: '산업안전보건법 제29조', countermeasure: '',
            })}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> 교육 항목 직접 추가
          </button>
        </div>
      )}

      {/* ── STEP 2: 참석자 ──────────────────────────────────────────── */}
      {step === 2 && (
        <div className="animate-fade-in">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                교육 참석자 명단
                <span className="text-xs text-gray-400 font-normal">
                  ({attendeeFields.filter((_, i) => form.watch(`attendees.${i}.name`)).length}명 입력됨)
                </span>
              </h3>
              <button
                onClick={() => appendAttendee({
                  seq: attendeeFields.length + 1,
                  name: '', position: '', department: '', sign: null,
                })}
                className="btn-secondary text-xs py-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> 행 추가
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-center w-10">번호</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">이름 *</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">직종/직위</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">소속 부서</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-center">서명</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attendeeFields.map((field, idx) => (
                    <tr key={field.id} className={idx % 2 === 0 ? '' : 'bg-gray-50/50'}>
                      <td className="px-3 py-2 text-center text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input {...form.register(`attendees.${idx}.name`)}
                          placeholder="홍길동" className="input-base text-sm py-1.5" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...form.register(`attendees.${idx}.position`)}
                          placeholder="용접공" className="input-base text-sm py-1.5" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...form.register(`attendees.${idx}.department`)}
                          placeholder="철골팀" className="input-base text-sm py-1.5" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="h-8 border border-dashed border-gray-200 rounded text-xs text-gray-300 flex items-center justify-center mx-auto w-20">
                          서명
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        {attendeeFields.length > 1 && (
                          <button onClick={() => removeAttendee(idx)}
                            className="p-1 text-gray-200 hover:text-red-400 rounded transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
              ※ 이름이 입력된 행만 참석자 수로 집계됩니다. 출력 시 서명란이 표시됩니다.
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: 최종 확인 ──────────────────────────────────────── */}
      {step === 3 && (
        <div className="animate-fade-in space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">교육일지 최종 확인</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['교육명',       form.watch('title')],
                ['교육 종류',    EDU_TYPE_LABELS[form.watch('edu_type') as keyof typeof EDU_TYPE_LABELS] ?? ''],
                ['근무형태',     WORKER_TYPE_LABELS[form.watch('worker_type') as WorkerType] ?? '—'],
                ['교육 일자',    form.watch('edu_date')],
                ['교육 시간',    (() => {
                  const h   = form.watch('edu_duration_hours')
                  const et  = form.watch('edu_type') as EduType
                  const wt  = form.watch('worker_type') as WorkerType
                  const min = getMinHours(et, wt)
                  const ok  = isHoursValid(h, et, wt)
                  return `${h}시간${ok ? ` ✓ (법정 ${min}h 충족)` : ` ⚠ (법정 ${min}h 미달)`}`
                })()],
                ['교육 장소',    form.watch('edu_location') || '—'],
                ['강사',         form.watch('instructor_name') ? `${form.watch('instructor_name')} (${form.watch('instructor_position')})` : '—'],
                ['교육 항목',    `${items.length}개 항목`],
                ['참석자',       `${attendeeFields.filter((_, i) => form.watch(`attendees.${i}.name`)).length}명`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400">{label}</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{value || '—'}</dd>
                </div>
              ))}
            </dl>
            {sourceRisk && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-blue-600">
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
            <button onClick={() => onSave('completed')} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              교육 완료 저장 및 연계 반영
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
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => Math.min(s + 1, STEPS.length - 1))} className="btn-primary">
            다음 <ChevronRight className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
