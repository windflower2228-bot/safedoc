'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, Wrench,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Info, XCircle,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  MACHINE_TYPES, MACHINE_TYPE_LIST, PARTICIPANT_ROLES,
  type MachineTypeCode, type CheckItem,
} from '@/types/pre-work-inspection'

const RESULT_OPTIONS = [
  { value: 'pass', label: '양호', cls: 'bg-green-50 text-green-700 border-green-300' },
  { value: 'fail', label: '불량', cls: 'bg-red-50   text-red-700   border-red-300'   },
  { value: 'na',   label: '해당없음', cls: 'bg-gray-50 text-gray-500 border-gray-300' },
]

export default function PreWorkInspectionNewPage() {
  const router = useRouter()
  const [saving,      setSaving]      = useState(false)
  const [selType,     setSelType]     = useState<MachineTypeCode | null>(null)
  const [checkItems,  setCheckItems]  = useState<(CheckItem & { _lid: number })[]>([])
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  let _seq = 0
  const uid = () => ++_seq

  const form = useForm<any>({
    defaultValues: {
      machine_type:      '',
      machine_type_code: '',
      machine_name:      '',
      machine_model:     '',
      machine_serial:    '',
      machine_capacity:  '',
      safety_cert_no:    '',
      safety_cert_expiry:'',
      inspection_date:   new Date().toISOString().slice(0, 10),
      inspection_time:   '',
      work_location:     '',
      work_description:  '',
      work_plan_exists:          false,
      worker_qualification_ok:   false,
      work_plan_confirmed_by:    '',
      work_stopped:      false,
      stop_reason:       '',
      overall_opinion:   '',
      follow_up_date:    '',
      participants: [
        { seq:1, name:'', position:'안전관리자',  affiliation:'도급인', role:'inspector' },
        { seq:2, name:'', position:'장비 소유자', affiliation:'',       role:'owner'     },
        { seq:3, name:'', position:'운전자·작업자',affiliation:'',      role:'worker'    },
      ],
    },
  })

  const { fields: partFields, append: addPart, remove: removePart } =
    useFieldArray({ control: form.control, name: 'participants' })

  const watchStopped = form.watch('work_stopped')

  // 기계 유형 선택 시 점검 항목 자동 세팅
  function selectMachineType(code: MachineTypeCode) {
    const mt = MACHINE_TYPES[code]
    setSelType(code)
    form.setValue('machine_type_code', code)
    form.setValue('machine_type', mt.label)
    setCheckItems(mt.defaultItems.map(item => ({
      ...item,
      result:          'pass' as const,
      defect_detail:   '',
      action_required: '',
      is_resolved:     false,
      _lid:            uid(),
    })))
    // 첫 카테고리 자동 펼침
    if (mt.defaultItems.length > 0) setExpandedCat(mt.defaultItems[0].category)
  }

  function updateItem(lid: number, field: keyof CheckItem, value: any) {
    setCheckItems(prev => prev.map(i => i._lid === lid ? { ...i, [field]: value } : i))
  }

  // 카테고리 목록
  const categories = selType
    ? [...new Set(checkItems.map(i => i.category))]
    : []

  const failCount = checkItems.filter(i => i.result === 'fail').length
  const mt = selType ? MACHINE_TYPES[selType] : null

  async function onSubmit(data: any) {
    if (!selType) { toast.error('기계·기구 유형을 선택하세요.'); return }
    if (!data.machine_name.trim()) { toast.error('기계명을 입력하세요.'); return }
    setSaving(true)
    const payload = {
      ...data,
      check_items:  checkItems.map(({ _lid, ...rest }) => rest),
      participants: data.participants.map((p: any, i: number) => ({ ...p, seq: i+1 })),
    }
    const res  = await fetch('/api/subcontract/pre-work-inspection', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('합동안전점검이 작성되었습니다.')
    router.push(`/subcontract/pre-work-inspection/${json.data.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/subcontract/pre-work-inspection"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600" />
              작업 시작 전 합동안전점검 작성
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              산안법 시행령 제66조 / 시행규칙 제94조 제1호
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="btn-secondary">취소</button>
          <button onClick={form.handleSubmit(onSubmit)} disabled={saving}
            className="btn-primary" style={{ background: '#ea580c' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        {/* ① 기계·기구 유형 선택 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-1">기계·기구 유형 선택 *</h2>
          <p className="text-xs text-gray-400 mb-4">
            선택 시 해당 기계의 법정 점검 항목이 자동으로 생성됩니다.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {MACHINE_TYPE_LIST.map(m => (
              <button key={m.code} type="button" onClick={() => selectMachineType(m.code)}
                className={clsx(
                  'flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                  selType === m.code
                    ? 'border-orange-500 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                style={selType === m.code ? { background: m.bg, borderColor: m.color } : {}}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: m.bg }}>
                  <Wrench className="w-4 h-4" style={{ color: m.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-900 leading-tight">{m.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{m.labelDetail}</div>
                </div>
              </button>
            ))}
          </div>

          {mt && (
            <div className="mt-4 p-3 rounded-xl text-xs leading-relaxed"
              style={{ background: mt.bg, color: mt.color }}>
              <span className="font-semibold">법적 근거: </span>{mt.legalBasis}
            </div>
          )}
        </div>

        {/* ② 기계 기본정보 */}
        {selType && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">기계·기구 기본정보</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label-base">기계명 *</label>
                <input {...form.register('machine_name', { required: true })}
                  placeholder={`예: ${mt?.label} TC-600`}
                  className="input-base" />
              </div>
              <div>
                <label className="label-base">모델·형식</label>
                <input {...form.register('machine_model')} className="input-base" />
              </div>
              <div>
                <label className="label-base">제조번호·등록번호</label>
                <input {...form.register('machine_serial')} className="input-base" />
              </div>
              <div>
                <label className="label-base">정격하중·최대높이 등</label>
                <input {...form.register('machine_capacity')} placeholder="예: 6ton, 60m" className="input-base" />
              </div>
              <div>
                <label className="label-base">안전검사 합격번호</label>
                <input {...form.register('safety_cert_no')} className="input-base" />
              </div>
              <div>
                <label className="label-base">안전검사 유효기간</label>
                <input {...form.register('safety_cert_expiry')} type="date" className="input-base" />
              </div>
            </div>
          </div>
        )}

        {/* ③ 점검 일시·장소 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">점검 일시 및 작업 정보</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-base">점검 일자 *</label>
              <input {...form.register('inspection_date')} type="date" className="input-base" />
            </div>
            <div>
              <label className="label-base">점검 시간</label>
              <input {...form.register('inspection_time')} type="time" className="input-base" />
            </div>
            <div>
              <label className="label-base">작업 위치·구역 *</label>
              <input {...form.register('work_location', { required: true })}
                placeholder="예: 4공구 지하 2층 굴착구간"
                className="input-base" />
            </div>
            <div className="col-span-3">
              <label className="label-base">작업 내용</label>
              <input {...form.register('work_description')}
                placeholder="점검 대상 작업 내용을 간략히 기재하세요."
                className="input-base" />
            </div>
          </div>
        </div>

        {/* ④ 점검 참여자 */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-800">점검 참여자</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                시행규칙 제94조 — 기계·기구 소유·대여자와 도급인이 <strong>합동</strong>으로 실시
              </p>
            </div>
            <button type="button"
              onClick={() => addPart({ seq: partFields.length+1, name:'', position:'', affiliation:'', role:'worker' })}
              className="btn-secondary text-xs gap-1">
              <Plus className="w-3 h-3" /> 추가
            </button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              {['성명','직위','소속','역할',''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {partFields.map((f, idx) => (
                <tr key={f.id}>
                  <td className="px-3 py-2"><input {...form.register(`participants.${idx}.name`)} placeholder="홍길동" className="input-base text-sm py-1.5" /></td>
                  <td className="px-3 py-2"><input {...form.register(`participants.${idx}.position`)} className="input-base text-sm py-1.5" /></td>
                  <td className="px-3 py-2"><input {...form.register(`participants.${idx}.affiliation`)} className="input-base text-sm py-1.5" /></td>
                  <td className="px-3 py-2">
                    <select {...form.register(`participants.${idx}.role`)} className="input-base text-sm py-1.5">
                      {Object.entries(PARTICIPANT_ROLES).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => removePart(idx)}
                      className="p-1 text-gray-300 hover:text-red-500 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ⑤ 점검 항목 */}
        {selType && checkItems.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-gray-800">
                  점검 항목
                  <span className="ml-2 text-xs text-gray-400 font-normal">{checkItems.length}개</span>
                </h2>
                {failCount > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    <AlertTriangle className="w-3 h-3" /> 불량 {failCount}건
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-400">{mt?.legalBasis}</span>
            </div>

            {categories.map(cat => {
              const catItems = checkItems.filter(i => i.category === cat)
              const catFail  = catItems.filter(i => i.result === 'fail').length
              return (
                <div key={cat} className="border-b border-gray-100 last:border-b-0">
                  <button type="button"
                    onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">{cat}</span>
                      <span className="text-[10px] text-gray-400">{catItems.length}개</span>
                      {catFail > 0 && (
                        <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
                          불량 {catFail}건
                        </span>
                      )}
                    </div>
                    {expandedCat === cat
                      ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                      : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                  </button>

                  {(expandedCat === cat) && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" style={{ tableLayout:'fixed', minWidth:'820px' }}>
                        <colgroup>
                          <col style={{width:24}}/><col/><col style={{width:90}}/><col style={{width:120}}/><col style={{width:130}}/><col style={{width:110}}/><col style={{width:28}}/>
                        </colgroup>
                        <thead>
                          <tr className="border-b border-gray-100" style={{ background: mt?.bg }}>
                            {['#','점검 항목','결과','불량 내용','조치 요구사항','관련 법조항',''].map(h => (
                              <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold"
                                style={{ color: mt?.color }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {catItems.map(item => (
                            <tr key={item._lid}
                              className={clsx('border-b border-gray-100', item.result === 'fail' && 'bg-red-50/30')}>
                              <td className="px-2 py-2 text-center text-gray-400">{item.seq}</td>
                              <td className="px-2 py-2 text-xs text-gray-800 leading-snug">{item.item}</td>
                              <td className="px-2 py-1.5">
                                <select
                                  value={item.result}
                                  onChange={e => updateItem(item._lid, 'result', e.target.value)}
                                  className={clsx(
                                    'text-[10px] font-semibold rounded-full px-2 py-0.5 border outline-none cursor-pointer w-full',
                                    RESULT_OPTIONS.find(r => r.value === item.result)?.cls
                                  )}>
                                  {RESULT_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  value={item.defect_detail}
                                  onChange={e => updateItem(item._lid, 'defect_detail', e.target.value)}
                                  disabled={item.result !== 'fail'}
                                  placeholder={item.result === 'fail' ? '불량 내용 입력' : '—'}
                                  className="w-full bg-transparent outline-none text-xs focus:bg-red-50 focus:rounded focus:px-1 disabled:opacity-30"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  value={item.action_required}
                                  onChange={e => updateItem(item._lid, 'action_required', e.target.value)}
                                  placeholder="조치 내용"
                                  className="w-full bg-transparent outline-none text-xs focus:bg-orange-50 focus:rounded focus:px-1"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-[10px] text-gray-400 leading-tight">{item.legal_basis}</td>
                              <td className="px-1 py-1.5">
                                {item.result === 'fail' && (
                                  <button type="button"
                                    onClick={() => updateItem(item._lid, 'is_resolved', !item.is_resolved)}
                                    title={item.is_resolved ? '조치 완료' : '미조치'}
                                    className={clsx('w-5 h-5 rounded-full flex items-center justify-center',
                                      item.is_resolved ? 'bg-green-100' : 'bg-red-100')}>
                                    {item.is_resolved
                                      ? <CheckCircle2 className="w-3 h-3 text-green-600"/>
                                      : <XCircle className="w-3 h-3 text-red-500"/>}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ⑥ 작업계획서·자격 확인 */}
        {selType && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              작업계획서 및 자격 확인
              <span className="ml-2 text-xs text-gray-400 font-normal">시행규칙 제94조 제2·3호</span>
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" {...form.register('work_plan_exists')} className="w-4 h-4 accent-orange-600" />
                <span className="text-sm text-gray-700">
                  작업계획서 작성 및 이행 여부 확인
                  <span className="text-xs text-gray-400 ml-1">(시행규칙 제94조 제2호)</span>
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" {...form.register('worker_qualification_ok')} className="w-4 h-4 accent-orange-600" />
                <span className="text-sm text-gray-700">
                  운전자·작업자 자격·면허·경험 보유 확인
                  <span className="text-xs text-gray-400 ml-1">(시행규칙 제94조 제3호)</span>
                </span>
              </label>
              <div>
                <label className="label-base">확인자</label>
                <input {...form.register('work_plan_confirmed_by')} placeholder="확인자 성명" className="input-base max-w-xs" />
              </div>
            </div>
          </div>
        )}

        {/* ⑦ 작업 중지 */}
        {selType && (
          <div className={clsx('card p-5', watchStopped && 'border-red-300 bg-red-50/20')}>
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" {...form.register('work_stopped')} className="w-4 h-4 accent-red-600" />
                <span className={clsx('text-sm font-medium', watchStopped ? 'text-red-700' : 'text-gray-700')}>
                  결함·이상환경으로 인한 작업 중지 조치
                  <span className="text-xs text-gray-400 ml-1 font-normal">(시행규칙 제94조 제5호)</span>
                </span>
              </label>
              {watchStopped && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                  ⚠ 작업중지
                </span>
              )}
            </div>
            {watchStopped && (
              <div>
                <label className="label-base text-red-700">작업 중지 사유 *</label>
                <textarea {...form.register('stop_reason')} rows={2}
                  className="input-base resize-none text-sm border-red-300"
                  placeholder="결함 내용 또는 이상 환경 상황을 구체적으로 기재하세요." />
              </div>
            )}
          </div>
        )}

        {/* ⑧ 총평 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">점검 결과 총평</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">종합 의견</label>
              <textarea {...form.register('overall_opinion')} rows={3}
                className="input-base resize-none text-sm"
                placeholder="점검 결과 종합 의견을 기재하세요." />
            </div>
            <div>
              <label className="label-base">재점검 예정일</label>
              <input {...form.register('follow_up_date')} type="date" className="input-base" />
            </div>
          </div>
        </div>

      </form>
    </div>
  )
}
