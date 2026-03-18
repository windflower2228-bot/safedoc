'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Users, Plus, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'

// 지정서 종류별 설정
const TYPE_CONFIG = {
  work_director: {
    label: '작업지휘자',
    color: '#2563eb', bg: '#eff6ff',
    legalBasis: '산업안전보건기준에 관한 규칙 제35조 / 시행령 제15조',
    description: '위험작업 시 해당 작업을 직접 지휘·감독하는 자',
    workTypes: [
      '비계의 조립·해체·변경 작업',
      '거푸집 동바리 조립·해체 작업',
      '굴착 및 흙막이 지보공 설치·해체 작업',
      '터널 굴착 작업',
      '크레인 사용 양중 작업',
      '폭발물 취급 작업',
      '밀폐공간 작업',
      '전기 작업',
      '용접·용단 작업',
      '차량계 건설기계 사용 작업',
      '기타 위험 작업',
    ],
    defaultDuties: [
      '작업 방법 및 순서를 결정하고 근로자를 지휘하는 일',
      '재료·기구·공구의 결함 유무를 점검하고 불량품을 제거하는 일',
      '작업구역에 관계 근로자 외의 사람의 출입을 금지하는 일',
      '이상 발견 시 즉시 필요한 조치를 하는 일',
      '근로자의 보호구 착용 여부를 감시하는 일',
    ],
  },
  signal_person: {
    label: '신호수',
    color: '#7c3aed', bg: '#f5f3ff',
    legalBasis: '산업안전보건기준에 관한 규칙 제40조·제146조·제202조',
    description: '크레인·차량계 기계 등 사용 작업 시 운전자에게 신호를 주는 자',
    workTypes: [
      '타워크레인 양중 작업',
      '이동식 크레인 양중 작업',
      '천장 크레인 사용 작업',
      '차량계 건설기계 작업',
      '항타기·항발기 작업',
      '기타 양중·운반 작업',
    ],
    defaultDuties: [
      '운전자에게 정해진 신호방법에 따라 신호하는 일',
      '작업 반경 내 근로자 출입 상태를 확인하는 일',
      '운전자의 시야 확보 여부를 확인하는 일',
      '이상 발견 시 즉시 정지 신호를 보내는 일',
    ],
  },
  fire_watcher: {
    label: '화재감시자',
    color: '#dc2626', bg: '#fef2f2',
    legalBasis: '산업안전보건기준에 관한 규칙 제241조',
    description: '가연물이 있는 장소에서 화재위험작업 시 화재 발생을 감시하는 자',
    workTypes: [
      '용접·용단 작업',
      '그라인더 작업 (불꽃 발생)',
      '가스절단 작업',
      '열처리 작업',
      '지붕 방수·도막 작업',
      '기타 화기 취급 작업',
    ],
    defaultDuties: [
      '화재위험작업 반경 11m 이내의 가연물 확인 및 제거 감시',
      '소화기·소화설비 비치 확인 및 즉시 사용 가능 상태 유지',
      '화재 발생 시 소화기로 초기 진화 및 화재 경보',
      '작업자에게 화재위험 사항을 알리는 일',
      '화재위험작업 종료 후 잔불 확인 (최소 30분)',
    ],
  },
} as const

type CommanderType = keyof typeof TYPE_CONFIG

export default function NewWorkCommanderPage() {
  const router  = useRouter()
  const [saving,   setSaving]   = useState(false)
  const [cType,    setCType]    = useState<CommanderType>('work_director')
  const [duties,   setDuties]   = useState<string[]>(TYPE_CONFIG.work_director.defaultDuties)
  const [company,  setCompany]  = useState<any>(null)

  const form = useForm<any>({
    defaultValues: {
      commander_type: 'work_director',
      work_type:       '',
      legal_basis:     TYPE_CONFIG.work_director.legalBasis,
      person_name:     '',
      person_position: '',
      person_affiliation: '',
      work_location:   '',
      effective_date:  new Date().toISOString().slice(0, 10),
      expiry_date:     '',
      issuer_name:     '',
      issuer_position: '대표이사',
    },
  })

  useEffect(() => {
    fetch('/api/company').then(r=>r.json()).then(j => {
      if (j.data) {
        setCompany(j.data)
        form.setValue('issuer_name',    j.data.ceo_name ?? '')
        form.setValue('person_affiliation', j.data.name ?? '')
      }
    }).catch(() => {})
  }, [form])

  function switchType(t: CommanderType) {
    setCType(t)
    const cfg = TYPE_CONFIG[t]
    form.setValue('commander_type', t)
    form.setValue('legal_basis', cfg.legalBasis)
    form.setValue('work_type', '')
    setDuties(cfg.defaultDuties)
  }

  async function onSubmit(data: any) {
    if (!data.person_name.trim()) { toast.error('지정 대상자 성명을 입력하세요.'); return }
    if (!data.work_type.trim())   { toast.error('해당 작업 종류를 선택하세요.'); return }
    setSaving(true)
    const res = await fetch('/api/safety-measures/work-commander', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, duties: duties.filter(d => d.trim()) }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success(`${TYPE_CONFIG[cType].label} 지정서가 작성되었습니다.`)
    router.push('/safety-measures/work-commander')
  }

  const cfg = TYPE_CONFIG[cType]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/safety-measures/work-commander"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              작업지휘자·신호수·화재감시자 지정서 작성
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              안전보건규칙 제35조·제40조·제241조
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="btn-secondary">취소</button>
          <button onClick={form.handleSubmit(onSubmit)} disabled={saving}
            className="btn-primary" style={{ background: cfg.color }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 지정서 종류 */}
        <div className="card p-4">
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(TYPE_CONFIG) as [CommanderType, typeof TYPE_CONFIG[CommanderType]][]).map(([k, v]) => (
              <button key={k} type="button" onClick={() => switchType(k)}
                className={clsx('py-3.5 rounded-xl border-2 text-sm font-medium transition-all text-center',
                  cType === k
                    ? 'shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300')}
                style={cType === k ? { borderColor: v.color, background: v.bg, color: v.color === '#dc2626' ? '#7f1d1d' : v.color === '#7c3aed' ? '#4c1d95' : '#1e3a8a' } : {}}>
                {v.label}
                <div className="text-[10px] font-normal mt-0.5 opacity-70 leading-tight">{v.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 법적 근거 배너 */}
        <div className="px-4 py-3 rounded-xl text-xs leading-relaxed"
          style={{ background: cfg.bg, color: cfg.color }}>
          <span className="font-semibold">{cfg.legalBasis}</span>
        </div>

        {/* 대상자 정보 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">지정 대상자 정보</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-base">성명 *</label>
              <input {...form.register('person_name')} placeholder="홍길동" className="input-base" />
            </div>
            <div>
              <label className="label-base">직위</label>
              <input {...form.register('person_position')} placeholder="반장" className="input-base" />
            </div>
            <div>
              <label className="label-base">소속</label>
              <input {...form.register('person_affiliation')} className="input-base" />
            </div>
          </div>
        </div>

        {/* 지정 내용 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">지정 내용</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label-base">해당 작업 종류 *</label>
              <select {...form.register('work_type')} className="input-base">
                <option value="">선택하세요</option>
                {cfg.workTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label-base">작업 위치</label>
              <input {...form.register('work_location')} placeholder="4공구 지하 2층" className="input-base" />
            </div>
            <div>
              <label className="label-base">지정 효력 발생일 *</label>
              <input {...form.register('effective_date')} type="date" className="input-base" />
            </div>
            <div>
              <label className="label-base">만료일 (없으면 작업 완료 시)</label>
              <input {...form.register('expiry_date')} type="date" className="input-base" />
            </div>
          </div>

          {/* 직무 목록 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-base mb-0">주요 직무 목록</label>
              <button type="button"
                onClick={() => setDuties(prev => [...prev, ''])}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> 직무 추가
              </button>
            </div>
            <div className="space-y-2">
              {duties.map((d, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 w-5 pt-2 font-mono flex-shrink-0">{i+1}.</span>
                  <textarea
                    value={d}
                    onChange={e => setDuties(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                    rows={1}
                    className="input-base resize-none text-sm flex-1"
                  />
                  <button type="button"
                    onClick={() => setDuties(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0 mt-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 지정권자 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">지정권자 (발행인)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">성명 *</label>
              <input {...form.register('issuer_name')} className="input-base" />
            </div>
            <div>
              <label className="label-base">직위 *</label>
              <input {...form.register('issuer_position')} placeholder="대표이사" className="input-base" />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
