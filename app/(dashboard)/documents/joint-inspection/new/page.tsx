'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Save, Loader2, Plus, Trash2, Shield, Link2,
  BarChart3, ChevronDown, ChevronUp,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  CATEGORY_LABEL, RESULT_LABEL, RESULT_COLOR, DEFAULT_CHECK_ITEMS,
  PARTICIPANT_ROLE_LABEL,
  type InspectionCheckItem, type InspectionCategory, type InspectionResult,
} from '@/types/inspection'
import { generateJointInspectionFromRisk } from '@/lib/linkage/riskToInspection'

const CATEGORIES = Object.entries(CATEGORY_LABEL) as [InspectionCategory, string][]
const ROLES = Object.entries(PARTICIPANT_ROLE_LABEL)

let _seq = 0
const uid = () => _seq++

export default function JointInspectionNewPage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const riskId      = searchParams.get('risk_id')

  const [saving,     setSaving]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [riskInfo,   setRiskInfo]   = useState<{ id: string; title: string } | null>(null)
  const [riskSummary,setRiskSummary]= useState<any>(null)
  const [checkItems, setCheckItems] = useState<(InspectionCheckItem & { _lid: number })[]>([])
  const [expandedCat,setExpanded]   = useState<string | null>(null)

  const form = useForm<any>({
    defaultValues: {
      inspection_date:  new Date().toISOString().slice(0, 10),
      inspection_area:  '',
      overall_opinion:  '',
      follow_up_date:   '',
      participants: [
        { seq:1, name:'', position:'안전보건관리책임자', affiliation:'', role:'leader'      },
        { seq:2, name:'', position:'안전관리자',         affiliation:'', role:'member'      },
        { seq:3, name:'', position:'근로자 대표',         affiliation:'', role:'worker_rep' },
      ],
      improvement_items: [],
    },
  })

  const { fields: partFields, append: addPart, remove: removePart } = useFieldArray({ control: form.control, name: 'participants' })
  const { fields: impFields,  append: addImp,  remove: removeImp  } = useFieldArray({ control: form.control, name: 'improvement_items' })

  // 위험성평가 연계 자동 생성
  useEffect(() => {
    if (!riskId) return
    setGenerating(true)
    fetch(`/api/risk/${riskId}`)
      .then(r => r.json())
      .then(j => {
        setGenerating(false)
        if (!j.data) return
        const draft = generateJointInspectionFromRisk(j.data, {})
        form.setValue('inspection_date',  draft.inspection_date)
        form.setValue('inspection_area',  draft.inspection_area)
        form.setValue('overall_opinion',  draft.overall_opinion)
        form.setValue('participants',     draft.participants)
        form.setValue('improvement_items', draft.improvement_items)
        setCheckItems(draft.check_items.map(i => ({ ...i, _lid: uid() })))
        setRiskInfo({ id: riskId, title: j.data.title })
        setRiskSummary(draft.risk_summary)
        toast.success(`위험성평가 연계 완료 — 점검 항목 ${draft.check_items.length}건 자동 생성`)
      })
  }, [riskId])

  function updateItem(lid: number, field: keyof InspectionCheckItem, value: any) {
    setCheckItems(prev => prev.map(i => i._lid === lid ? { ...i, [field]: value } : i))
  }
  function removeItem(lid: number) {
    setCheckItems(prev => prev.filter(i => i._lid !== lid).map((i, idx) => ({ ...i, seq: idx + 1 })))
  }
  function addDefaultItems(cat: InspectionCategory) {
    const templates = DEFAULT_CHECK_ITEMS[cat] ?? []
    const newItems = templates.map(t => ({
      _lid: uid(), seq: 0, category: cat, check_content: t,
      result: 'pass' as InspectionResult, defect_detail: '',
      action_required: '', action_deadline: '', action_owner: '',
      is_resolved: false, source_risk_item_id: null,
    }))
    setCheckItems(prev => [...prev, ...newItems].map((i, idx) => ({ ...i, seq: idx + 1 })))
  }

  const grouped = CATEGORIES.map(([cat, label]) => ({
    cat, label,
    items: checkItems.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0)

  const failCount = checkItems.filter(i => i.result === 'fail').length

  async function onSubmit(data: any) {
    setSaving(true)
    const payload = {
      ...data,
      source_risk_id:   riskId ?? null,
      risk_summary:     riskSummary,
      check_items:      checkItems.map(({ _lid, ...rest }) => rest),
      participants:     data.participants.map((p: any, i: number) => ({ ...p, seq: i + 1 })),
      improvement_items:data.improvement_items.map((m: any, i: number) => ({ ...m, seq: i + 1 })),
    }
    const res  = await fetch('/api/documents/joint-inspection', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('합동안전보건점검이 작성되었습니다.')
    router.push(`/documents/joint-inspection/${json.data.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-600" />
            합동안전보건점검 작성
          </h1>
          {riskInfo && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-600">
              <Link2 className="w-3.5 h-3.5" />
              위험성평가 연계: {riskInfo.title}
            </div>
          )}
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

      {generating && (
        <div className="card p-4 mb-4 bg-blue-50 border-blue-200 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-700">위험성평가 데이터를 분석하여 점검 항목을 자동 생성 중...</span>
        </div>
      )}

      {/* 위험성평가 운영 실적 패널 */}
      {riskSummary && (
        <div className="card p-4 mb-4 border-orange-100 bg-orange-50/30">
          <div className="text-xs font-semibold text-orange-700 mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            위험성평가 운영 실적 자동 연계 (점검표에 첨부)
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '평가 건수',   value: `${riskSummary.eval_count}건`, color: 'text-orange-700' },
              { label: '高위험 건수', value: `${riskSummary.high_count}건`, color: 'text-red-600'    },
              { label: '이행률',      value: `${riskSummary.resolved_rate}%`, color: 'text-green-600' },
              { label: '기준 기간',   value: riskSummary.period,             color: 'text-gray-600'  },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-lg p-3 border border-orange-100">
                <div className="text-[10px] text-gray-400">{s.label}</div>
                <div className={`text-sm font-bold ${s.color} mt-0.5`}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 기본정보 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">점검 기본정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">점검 일자 *</label>
              <input {...form.register('inspection_date')} type="date" className="input-base" />
            </div>
            <div>
              <label className="label-base">점검 구역 *</label>
              <input {...form.register('inspection_area', { required: true })}
                placeholder="4공구 전체 현장" className="input-base" />
            </div>
          </div>
        </div>

        {/* 점검단 구성 */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">점검단 구성</h2>
            <button type="button"
              onClick={() => addPart({ seq: partFields.length+1, name:'', position:'', affiliation:'', role:'member' })}
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
                  <td className="px-4 py-2">
                    <input {...form.register(`participants.${idx}.name`)} placeholder="홍길동" className="input-base text-sm py-1.5" />
                  </td>
                  <td className="px-4 py-2">
                    <input {...form.register(`participants.${idx}.position`)} className="input-base text-sm py-1.5" />
                  </td>
                  <td className="px-4 py-2">
                    <input {...form.register(`participants.${idx}.affiliation`)} placeholder="(주)건설" className="input-base text-sm py-1.5" />
                  </td>
                  <td className="px-4 py-2">
                    <select {...form.register(`participants.${idx}.role`)} className="input-base text-sm py-1.5">
                      {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
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

        {/* 점검 항목 */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-800">점검 항목</h2>
              <span className="text-xs text-gray-400">{checkItems.length}개</span>
              {failCount > 0 && (
                <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">불량 {failCount}건</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.slice(0, 5).map(([cat, label]) => (
                <button key={cat} type="button" onClick={() => addDefaultItems(cat)}
                  className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-all">
                  + {label}
                </button>
              ))}
            </div>
          </div>

          {checkItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              위에서 카테고리를 선택하거나, 위험성평가를 연계하면 항목이 자동 생성됩니다.
            </div>
          ) : (
            grouped.map(g => (
              <div key={g.cat} className="border-b border-gray-100 last:border-b-0">
                <button type="button"
                  onClick={() => setExpanded(expandedCat === g.cat ? null : g.cat)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600">{g.label}</span>
                    <span className="text-[10px] text-gray-400">{g.items.length}개</span>
                    {g.items.filter(i => i.result === 'fail').length > 0 && (
                      <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
                        불량 {g.items.filter(i => i.result === 'fail').length}건
                      </span>
                    )}
                  </div>
                  {expandedCat === g.cat ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                </button>
                {(expandedCat === g.cat || expandedCat === null) && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs" style={{ tableLayout: 'fixed', minWidth: '800px' }}>
                      <colgroup><col style={{width:28}}/><col style={{width:220}}/><col style={{width:80}}/><col style={{width:160}}/><col style={{width:120}}/><col style={{width:100}}/><col style={{width:28}}/></colgroup>
                      <thead><tr className="bg-orange-50 border-b border-orange-100">
                        {['#','점검 내용','결과','불량 내용','조치 요구사항','조치 기한',''].map(h => (
                          <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold text-orange-800">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {g.items.map(item => {
                          const rc = RESULT_COLOR[item.result]
                          return (
                            <tr key={item._lid} className={clsx('border-b border-gray-100', item.result === 'fail' && 'bg-red-50/30')}>
                              <td className="px-2 py-2 text-center text-gray-400">{item.seq}</td>
                              <td className="px-2 py-1.5">
                                <input value={item.check_content} onChange={e => updateItem(item._lid, 'check_content', e.target.value)}
                                  className="w-full bg-transparent outline-none focus:bg-orange-50 focus:rounded focus:px-1 text-xs" />
                              </td>
                              <td className="px-2 py-1.5">
                                <select value={item.result} onChange={e => updateItem(item._lid, 'result', e.target.value as InspectionResult)}
                                  className={clsx('text-[10px] font-medium rounded-full px-2 py-0.5 border-none outline-none cursor-pointer', rc.bg, rc.text)}>
                                  {Object.entries(RESULT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                              </td>
                              <td className="px-2 py-1.5">
                                <input value={item.defect_detail} onChange={e => updateItem(item._lid, 'defect_detail', e.target.value)}
                                  disabled={item.result !== 'fail'}
                                  className="w-full bg-transparent outline-none focus:bg-red-50 focus:rounded focus:px-1 text-xs disabled:opacity-30" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input value={item.action_required} onChange={e => updateItem(item._lid, 'action_required', e.target.value)}
                                  className="w-full bg-transparent outline-none focus:bg-orange-50 focus:rounded focus:px-1 text-xs" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="date" value={item.action_deadline} onChange={e => updateItem(item._lid, 'action_deadline', e.target.value)}
                                  className="w-full bg-transparent outline-none text-xs" />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button type="button" onClick={() => removeItem(item._lid)}
                                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 개선 요구사항 */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">개선 요구사항</h2>
            <button type="button"
              onClick={() => addImp({ seq: impFields.length+1, item:'', deadline:'', owner:'', is_done:false })}
              className="btn-secondary text-xs gap-1">
              <Plus className="w-3 h-3" /> 추가
            </button>
          </div>
          {impFields.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">개선 요구사항을 추가하세요.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['내용','이행 기한','담당자','완료',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {impFields.map((f, idx) => (
                  <tr key={f.id}>
                    <td className="px-4 py-2"><input {...form.register(`improvement_items.${idx}.item`)} placeholder="개선 내용" className="input-base text-sm py-1.5" /></td>
                    <td className="px-4 py-2"><input {...form.register(`improvement_items.${idx}.deadline`)} type="date" className="input-base text-sm py-1.5" /></td>
                    <td className="px-4 py-2"><input {...form.register(`improvement_items.${idx}.owner`)} placeholder="담당자" className="input-base text-sm py-1.5" /></td>
                    <td className="px-4 py-2 text-center">
                      <input type="checkbox" {...form.register(`improvement_items.${idx}.is_done`)} className="w-4 h-4 accent-orange-600" />
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => removeImp(idx)} className="p-1 text-gray-300 hover:text-red-500 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 총평 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">점검 총평</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">총평</label>
              <textarea {...form.register('overall_opinion')} rows={4}
                className="input-base resize-none text-sm"
                placeholder="합동점검 결과 및 주요 사항을 입력하세요." />
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
